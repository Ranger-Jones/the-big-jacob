import 'server-only';
import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { connect, constants, type ClientHttp2Session } from 'node:http2';
import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, type ServiceResult } from './result';

/**
 * Native iOS push straight to Apple (APNs over HTTP/2, token-based auth with a .p8 key; no Firebase).
 * Off unless APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY are set (see mobile/README.md).
 */

export interface ApnsPayload { title: string; body: string; url: string; tag?: string }
export type ApnsEnvironment = 'sandbox' | 'production';
export interface ApnsConfig { keyId: string; teamId: string; key: KeyObject; bundleId: string }
export interface ApnsDevice { id: string; token: string; environment: string }
export interface ApnsRequest { path: string; headers: Record<string, string>; body: string }
export interface ApnsResponse { status: number; reason?: string }
export interface ApnsTransport { send(environment: ApnsEnvironment, request: ApnsRequest): Promise<ApnsResponse>; close(): void }

export const APNS_HOSTS: Record<ApnsEnvironment, string> = { sandbox: 'api.sandbox.push.apple.com', production: 'api.push.apple.com' };
export const DEFAULT_BUNDLE_ID = 'de.rangerjones.derGrosseJakob';
/** Devices per account; registering one more drops the one registered longest ago. */
export const MAX_DEVICES = 10;
const DEVICE_TOKEN = /^[0-9a-f]{64,200}$/;
const APPLE_ID = /^[A-Z0-9]{10}$/;
/** Apple accepts a provider token for an hour and rejects refreshing it more often than every 20 minutes. */
export const PROVIDER_TOKEN_TTL_MS = 50 * 60 * 1000;
/** Same lifetime as the web push (TTL 600): a "your turn" ping is useless after ten minutes. */
const EXPIRATION_S = 600;

/** Reads the APNs settings; null (push off) when anything is missing or the key is not a valid .p8. */
export function readApnsConfig(env: Record<string, string | undefined>): ApnsConfig | null {
  const keyId = env.APNS_KEY_ID?.trim();
  const teamId = env.APNS_TEAM_ID?.trim();
  // Vercel keeps multi-line values, but a pasted key may carry literal "\n" instead.
  const pem = env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!keyId || !teamId || !pem) return null;
  if (!APPLE_ID.test(keyId) || !APPLE_ID.test(teamId)) {
    console.warn('APNs: APNS_KEY_ID / APNS_TEAM_ID must be 10 characters (A–Z, 0–9). Native push is off.');
    return null;
  }
  try {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== 'ec') throw new Error('not an EC key');
    return { keyId, teamId, key, bundleId: env.APNS_BUNDLE_ID?.trim() || DEFAULT_BUNDLE_ID };
  } catch {
    console.warn('APNs: APNS_PRIVATE_KEY is not a valid .p8 key. Native push is off.');
    return null;
  }
}

let config: ApnsConfig | null | undefined;
export function apnsConfig(): ApnsConfig | null {
  if (config === undefined) config = readApnsConfig(process.env);
  return config;
}

export function apnsEnabled(): boolean {
  return apnsConfig() !== null;
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString('base64url');

let cachedToken: { config: ApnsConfig; issuedAt: number; jwt: string } | null = null;

/** ES256 provider token (JWT), reused for ~50 minutes. */
export function providerToken(cfg: ApnsConfig, now = Date.now()): string {
  if (cachedToken && cachedToken.config === cfg && now - cachedToken.issuedAt < PROVIDER_TOKEN_TTL_MS && now >= cachedToken.issuedAt) {
    return cachedToken.jwt;
  }
  const input = `${b64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId }))}.${b64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(now / 1000) }))}`;
  // JWS wants the raw r||s signature, not DER.
  const signature = sign('sha256', Buffer.from(input), { key: cfg.key, dsaEncoding: 'ieee-p1363' });
  cachedToken = { config: cfg, issuedAt: now, jwt: `${input}.${b64url(signature)}` };
  return cachedToken.jwt;
}

export function resetProviderToken() {
  cachedToken = null;
}

/** Cuts a string to at most `max` UTF-8 bytes without splitting a character. */
function clipBytes(s: string, max: number) {
  let out = '';
  for (const ch of s) {
    if (Buffer.byteLength(out + ch) > max) break;
    out += ch;
  }
  return out;
}

/** The HTTP/2 request for one device: same title, body and deep link (`url`) as the web push. */
export function buildApnsRequest(cfg: ApnsConfig, deviceToken: string, payload: ApnsPayload, now = Date.now()): ApnsRequest {
  const headers: Record<string, string> = {
    authorization: `bearer ${providerToken(cfg, now)}`,
    'apns-topic': cfg.bundleId,
    'apns-push-type': 'alert',
    'apns-priority': '10',
    'apns-expiration': String(Math.floor(now / 1000) + EXPIRATION_S),
  };
  const tag = payload.tag ? clipBytes(payload.tag, 64) : '';
  // Like the web's notification tag: a newer push with the same tag replaces the older one.
  if (tag) headers['apns-collapse-id'] = tag;
  const body = {
    aps: { alert: { title: payload.title, body: payload.body }, sound: 'default', ...(tag ? { 'thread-id': tag } : {}) },
    url: payload.url,
  };
  return { path: `/3/device/${deviceToken}`, headers, body: JSON.stringify(body) };
}

const other = (env: ApnsEnvironment): ApnsEnvironment => (env === 'sandbox' ? 'production' : 'sandbox');
/** Apple says the token will never work again (app deleted, push turned off for good, foreign bundle). */
const gone = (res: ApnsResponse) => res.status === 410 || res.reason === 'Unregistered' || res.reason === 'DeviceTokenNotForTopic';

export interface DeliveryOutcome {
  delivered: number;
  /** Device rows to delete. */
  invalid: string[];
  /** Tokens that only work in the other APNs environment (e.g. a development-signed release build). */
  moved: { id: string; environment: ApnsEnvironment }[];
}

/** Sends one payload to each device and sorts out what to clean up; never throws. */
export async function deliverToDevices(
  cfg: ApnsConfig, devices: ApnsDevice[], payload: ApnsPayload, transport: Pick<ApnsTransport, 'send'>, now = Date.now(),
): Promise<DeliveryOutcome> {
  const outcome: DeliveryOutcome = { delivered: 0, invalid: [], moved: [] };
  const attempt = async (env: ApnsEnvironment, token: string) => {
    let res = await transport.send(env, buildApnsRequest(cfg, token, payload, now));
    if (res.status === 403 && res.reason === 'ExpiredProviderToken') {
      resetProviderToken();
      res = await transport.send(env, buildApnsRequest(cfg, token, payload, now));
    }
    return res;
  };
  await Promise.all(devices.map(async (device) => {
    const env: ApnsEnvironment = device.environment === 'sandbox' ? 'sandbox' : 'production';
    try {
      const res = await attempt(env, device.token);
      if (res.status === 200) {
        outcome.delivered++;
      } else if (res.reason === 'BadDeviceToken') {
        // A token from the other environment is "bad" here: try there once before giving up on it.
        const retry = await attempt(other(env), device.token);
        if (retry.status === 200) {
          outcome.delivered++;
          outcome.moved.push({ id: device.id, environment: other(env) });
        } else if (retry.reason === 'BadDeviceToken' || gone(retry)) {
          outcome.invalid.push(device.id);
        } else {
          console.warn('APNs: push failed', retry.status, retry.reason ?? '');
        }
      } else if (gone(res)) {
        outcome.invalid.push(device.id);
      } else {
        // Never log tokens or keys; status and Apple's reason are enough to diagnose.
        console.warn('APNs: push failed', res.status, res.reason ?? '');
      }
    } catch (err) {
      console.warn('APNs: push failed', err instanceof Error ? err.message : 'unknown error');
    }
  }));
  return outcome;
}

/** One HTTP/2 connection per APNs host, opened on first use and closed after the batch. */
export function http2Transport(
  { timeoutMs = 10_000, origin = (env: ApnsEnvironment) => `https://${APNS_HOSTS[env]}` } = {},
): ApnsTransport {
  const sessions = new Map<ApnsEnvironment, ClientHttp2Session>();
  const session = (env: ApnsEnvironment) => {
    const open = sessions.get(env);
    if (open && !open.closed && !open.destroyed) return open;
    const s = connect(origin(env));
    s.on('error', () => sessions.delete(env));
    s.on('close', () => sessions.delete(env));
    sessions.set(env, s);
    return s;
  };
  return {
    send(env, req) {
      return new Promise((resolve, reject) => {
        const stream = session(env).request({ ':method': 'POST', ':path': req.path, 'content-type': 'application/json', ...req.headers });
        let status = 0;
        let data = '';
        stream.setEncoding('utf8');
        stream.on('response', (headers) => { status = Number(headers[':status']); });
        stream.on('data', (chunk: string) => { data += chunk; });
        stream.on('end', () => {
          let reason: string | undefined;
          try {
            reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
          } catch {
            reason = undefined;
          }
          resolve({ status, reason });
        });
        stream.on('error', reject);
        stream.setTimeout(timeoutMs, () => {
          stream.close(constants.NGHTTP2_CANCEL);
          reject(new Error('APNs request timed out'));
        });
        stream.end(req.body);
      });
    },
    close() {
      for (const s of sessions.values()) s.close();
      sessions.clear();
    },
  };
}

/** Pushes to every registered iPhone of these users and removes tokens Apple rejects for good. */
export async function sendApns(
  admin: AdminClient, userIds: string[], payload: ApnsPayload,
  options: { config?: ApnsConfig | null; transport?: ApnsTransport } = {},
) {
  const cfg = options.config === undefined ? apnsConfig() : options.config;
  if (!cfg || userIds.length === 0) return;
  const { data: devices } = await admin.from('apns_devices').select('id, token, environment').in('user_id', userIds);
  if (!devices?.length) return;
  const transport = options.transport ?? http2Transport();
  let outcome: DeliveryOutcome;
  try {
    outcome = await deliverToDevices(cfg, devices, payload, transport);
  } finally {
    transport.close();
  }
  if (outcome.invalid.length) await admin.from('apns_devices').delete().in('id', outcome.invalid);
  await Promise.all(outcome.moved.map((m) => admin.from('apns_devices').update({ environment: m.environment }).eq('id', m.id)));
}

/** Stores the app's device token for this user (taking it over from whoever used this iPhone before). */
export async function registerApnsDevice(admin: AdminClient, userId: string, token: unknown, environment: unknown): Promise<ServiceResult> {
  const t = typeof token === 'string' ? token.trim().toLowerCase() : '';
  if (!DEVICE_TOKEN.test(t)) return fail('Ungültiges Gerät.');
  if (environment !== 'sandbox' && environment !== 'production') return fail('Ungültiges Gerät.');
  const { error } = await admin.rpc('register_apns_device', { p_user: userId, p_token: t, p_environment: environment, p_cap: MAX_DEVICES });
  if (error) throw error;
  return ok(undefined);
}

/** Forgets the token on sign-out; only the signed-in owner can remove it. */
export async function unregisterApnsDevice(admin: AdminClient, userId: string, token: unknown): Promise<ServiceResult> {
  const t = typeof token === 'string' ? token.trim().toLowerCase() : '';
  if (!DEVICE_TOKEN.test(t)) return fail('Ungültiges Gerät.');
  const { error } = await admin.from('apns_devices').delete().eq('user_id', userId).eq('token', t);
  if (error) throw error;
  return ok(undefined);
}

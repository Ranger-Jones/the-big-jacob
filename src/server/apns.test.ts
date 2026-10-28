import { generateKeyPairSync, verify } from 'node:crypto';
import { createServer } from 'node:http2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildApnsRequest, deliverToDevices, http2Transport, PROVIDER_TOKEN_TTL_MS, providerToken, readApnsConfig, resetProviderToken,
  type ApnsEnvironment, type ApnsRequest, type ApnsResponse,
} from './apns';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const env = { APNS_KEY_ID: 'ABC123DEFG', APNS_TEAM_ID: 'YT3US95Z97', APNS_PRIVATE_KEY: pem };
const config = readApnsConfig(env)!;
const token = 'ab'.repeat(32);
const payload = { title: '👑 Du bist dran!', body: 'Du spielst aus.', url: '/spiel/ABCD', tag: 'turn-1' };
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

afterEach(() => {
  resetProviderToken();
  vi.restoreAllMocks();
});

describe('APNs config', () => {
  it('is off without all variables or with a broken key', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readApnsConfig({})).toBeNull();
    expect(readApnsConfig({ ...env, APNS_PRIVATE_KEY: '' })).toBeNull();
    expect(readApnsConfig({ ...env, APNS_PRIVATE_KEY: 'not a key' })).toBeNull();
    expect(readApnsConfig({ ...env, APNS_KEY_ID: 'short' })).toBeNull();
  });

  it('accepts a key pasted with literal \\n and defaults the bundle id', () => {
    const cfg = readApnsConfig({ ...env, APNS_PRIVATE_KEY: pem.trim().replace(/\n/g, '\\n') });
    expect(cfg?.bundleId).toBe('de.rangerjones.derGrosseJakob');
    expect(readApnsConfig({ ...env, APNS_BUNDLE_ID: 'de.example.app' })?.bundleId).toBe('de.example.app');
  });
});

describe('APNs provider token', () => {
  it('is an ES256 JWT signed with the key and cached for 50 minutes', () => {
    const now = Date.UTC(2026, 9, 28, 12);
    const jwt = providerToken(config, now);
    const [header, claims, signature] = jwt.split('.');
    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' });
    expect(decode(claims)).toEqual({ iss: 'YT3US95Z97', iat: now / 1000 });
    const valid = verify('sha256', Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
    expect(valid).toBe(true);

    expect(providerToken(config, now + PROVIDER_TOKEN_TTL_MS - 1)).toBe(jwt);
    const renewed = providerToken(config, now + PROVIDER_TOKEN_TTL_MS);
    expect(renewed).not.toBe(jwt);
    expect(decode(renewed.split('.')[1]).iat).toBe((now + PROVIDER_TOKEN_TTL_MS) / 1000);
  });
});

describe('APNs request', () => {
  it('carries the same title, body and deep link as the web push', () => {
    const now = Date.UTC(2026, 9, 28, 12);
    const req = buildApnsRequest(config, token, payload, now);
    expect(req.path).toBe(`/3/device/${token}`);
    expect(req.headers).toMatchObject({
      'apns-topic': 'de.rangerjones.derGrosseJakob', 'apns-push-type': 'alert', 'apns-priority': '10',
      'apns-expiration': String(now / 1000 + 600), 'apns-collapse-id': 'turn-1',
    });
    expect(req.headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(JSON.parse(req.body)).toEqual({
      aps: { alert: { title: payload.title, body: payload.body }, sound: 'default', 'thread-id': 'turn-1' },
      url: '/spiel/ABCD',
    });
  });

  it('omits the collapse id without a tag and clips long tags to 64 bytes', () => {
    expect(buildApnsRequest(config, token, { ...payload, tag: undefined }).headers['apns-collapse-id']).toBeUndefined();
    const long = buildApnsRequest(config, token, { ...payload, tag: 'ä'.repeat(40) }).headers['apns-collapse-id'];
    expect(Buffer.byteLength(long)).toBe(64);
  });
});

describe('APNs delivery', () => {
  /** Fake HTTP/2 endpoint: answers per environment and token. */
  function fakeApns(answer: (env: ApnsEnvironment, token: string) => ApnsResponse) {
    const calls: { env: ApnsEnvironment; req: ApnsRequest }[] = [];
    return {
      calls,
      send: async (env: ApnsEnvironment, req: ApnsRequest) => {
        calls.push({ env, req });
        return answer(env, req.path.split('/').pop()!);
      },
    };
  }
  const dev = (id: string, environment: string) => ({ id, token: id.padEnd(64, '0'), environment });

  it('marks tokens Apple reports as gone and keeps working ones', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const apns = fakeApns((_, t) => {
      if (t.startsWith('a1')) return { status: 200 };
      if (t.startsWith('b2')) return { status: 410, reason: 'Unregistered' };
      if (t.startsWith('c3')) return { status: 400, reason: 'DeviceTokenNotForTopic' };
      return { status: 500, reason: 'InternalServerError' };
    });
    const out = await deliverToDevices(config, [dev('a1', 'production'), dev('b2', 'production'), dev('c3', 'sandbox'), dev('d4', 'production')], payload, apns);
    expect(out.delivered).toBe(1);
    expect(out.invalid.sort()).toEqual(['b2', 'c3']);
    expect(out.moved).toEqual([]);
    expect(apns.calls.every((c) => c.req.headers['apns-topic'] === config.bundleId)).toBe(true);
  });

  it('tries the other environment on BadDeviceToken before dropping the token', async () => {
    const apns = fakeApns((env, t) => {
      if (t.startsWith('e5')) return env === 'production' ? { status: 200 } : { status: 400, reason: 'BadDeviceToken' };
      return { status: 400, reason: 'BadDeviceToken' };
    });
    const out = await deliverToDevices(config, [dev('e5', 'sandbox'), dev('f6', 'production')], payload, apns);
    expect(out).toEqual({ delivered: 1, invalid: ['f6'], moved: [{ id: 'e5', environment: 'production' }] });
    expect(apns.calls.map((c) => c.env).sort()).toEqual(['production', 'production', 'sandbox', 'sandbox']);
  });

  it('renews an expired provider token once and survives network errors', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let first = true;
    const apns = fakeApns(() => {
      if (first) {
        first = false;
        return { status: 403, reason: 'ExpiredProviderToken' };
      }
      return { status: 200 };
    });
    const now = Date.now();
    const before = providerToken(config, now - 60_000);
    const out = await deliverToDevices(config, [dev('a1', 'production')], payload, apns, now);
    expect(out.delivered).toBe(1);
    expect(apns.calls[1].req.headers.authorization).not.toBe(`bearer ${before}`);

    const broken = { send: async () => { throw new Error('ECONNRESET'); } };
    expect(await deliverToDevices(config, [dev('a1', 'production')], payload, broken)).toEqual({ delivered: 0, invalid: [], moved: [] });
  });
});

describe('APNs HTTP/2 transport', () => {
  it('posts the request over HTTP/2 and reads Apple’s reason', async () => {
    const seen: { path: string; topic: string; body: string }[] = [];
    const server = createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (c: string) => { body += c; });
      req.on('end', () => {
        const path = String(req.headers[':path']);
        seen.push({ path, topic: String(req.headers['apns-topic']), body });
        if (path.endsWith('ff'.repeat(32))) {
          res.writeHead(410, { 'content-type': 'application/json' }).end(JSON.stringify({ reason: 'Unregistered' }));
        } else {
          res.writeHead(200).end();
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    const transport = http2Transport({ origin: () => `http://127.0.0.1:${port}` });
    try {
      expect(await transport.send('sandbox', buildApnsRequest(config, token, payload))).toEqual({ status: 200, reason: undefined });
      expect(await transport.send('sandbox', buildApnsRequest(config, 'ff'.repeat(32), payload))).toEqual({ status: 410, reason: 'Unregistered' });
    } finally {
      transport.close();
      server.close();
    }
    expect(seen[0]).toMatchObject({ path: `/3/device/${token}`, topic: 'de.rangerjones.derGrosseJakob' });
    expect(JSON.parse(seen[0].body).url).toBe('/spiel/ABCD');
  });
});

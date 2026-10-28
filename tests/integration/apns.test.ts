import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { POST, type Ctx } from '@/server/app-api/handlers';
import { MAX_DEVICES, readApnsConfig, sendApns, type ApnsEnvironment, type ApnsResponse, type ApnsTransport } from '@/server/apns';
import { admin, createTestUser } from './helpers';

async function ctxFor(prefix: string) {
  const u = await createTestUser(prefix);
  const { data: user } = await admin.from('profiles')
    .select('id, username, avatar_url, avatar_frame, table_felt, xp, rating, loot_equipped').eq('id', u.id).single();
  return (body: Record<string, unknown> = {}): Ctx => ({ admin, user: user!, params: [], body, query: new URLSearchParams() });
}

const newToken = () => randomBytes(32).toString('hex');
const devicesOf = async (userId: string) =>
  (await admin.from('apns_devices').select('token, environment').eq('user_id', userId).order('updated_at')).data ?? [];

describe('app api: iOS device tokens', () => {
  it('registers, moves and unregisters only the caller’s own token', async () => {
    const a = await ctxFor('pa');
    const b = await ctxFor('pb');
    const token = newToken();

    expect(await POST.device(a({ op: 'register', token: token.toUpperCase(), environment: 'sandbox' }))).toEqual({ ok: true, data: undefined });
    expect(await devicesOf(a().user.id)).toEqual([{ token, environment: 'sandbox' }]);
    // Registering again (e.g. every launch) keeps one row and updates the environment.
    await POST.device(a({ op: 'register', token, environment: 'production' }));
    expect(await devicesOf(a().user.id)).toEqual([{ token, environment: 'production' }]);

    // Someone else cannot remove my token …
    expect((await POST.device(b({ op: 'unregister', token }))).ok).toBe(true);
    expect(await devicesOf(a().user.id)).toHaveLength(1);
    // … but signing in with another account on the same iPhone moves it there.
    await POST.device(b({ op: 'register', token, environment: 'production' }));
    expect(await devicesOf(a().user.id)).toEqual([]);
    expect(await devicesOf(b().user.id)).toHaveLength(1);

    expect((await POST.device(b({ op: 'unregister', token }))).ok).toBe(true);
    expect(await devicesOf(b().user.id)).toEqual([]);
  });

  it('hides device tokens from clients (RLS) and the register function from them', async () => {
    const u = await createTestUser('pr');
    await admin.rpc('register_apns_device', { p_user: u.id, p_token: newToken(), p_environment: 'production', p_cap: MAX_DEVICES });
    expect((await u.client.from('apns_devices').select('token')).data).toEqual([]);
    const { error } = await u.client.rpc('register_apns_device', { p_user: u.id, p_token: newToken(), p_environment: 'production', p_cap: 99 });
    expect(error).not.toBeNull();
    expect(await devicesOf(u.id)).toHaveLength(1);
  });

  it('rejects invalid input', async () => {
    const a = await ctxFor('pi');
    for (const body of [
      { op: 'register', token: 'abc', environment: 'sandbox' },
      { op: 'register', token: 'zz'.repeat(32), environment: 'sandbox' },
      { op: 'register', token: newToken(), environment: 'staging' },
      { op: 'register', token: ['x'], environment: 'production' },
      { op: 'register', environment: 'production' },
      { op: 'unregister', token: 42 },
      { op: 'nope' },
    ]) {
      expect(await POST.device(a(body))).toMatchObject({ ok: false });
    }
    expect(await devicesOf(a().user.id)).toEqual([]);
  });

  it('keeps at most the newest devices per account', async () => {
    const a = await ctxFor('pc');
    const tokens = Array.from({ length: MAX_DEVICES + 2 }, newToken);
    for (const token of tokens) await POST.device(a({ op: 'register', token, environment: 'production' }));
    const left = await devicesOf(a().user.id);
    expect(left).toHaveLength(MAX_DEVICES);
    expect(left.map((d) => d.token).sort()).toEqual(tokens.slice(2).sort());
  });

  it('delivers to the user’s iPhones and removes tokens APNs rejects', async () => {
    const a = await ctxFor('pd');
    const [good, gone, wrongEnv, bad] = [newToken(), newToken(), newToken(), newToken()];
    for (const [token, environment] of [[good, 'production'], [gone, 'production'], [wrongEnv, 'sandbox'], [bad, 'production']]) {
      await POST.device(a({ op: 'register', token, environment }));
    }
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const config = readApnsConfig({
      APNS_KEY_ID: 'ABC123DEFG', APNS_TEAM_ID: 'YT3US95Z97', APNS_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    });
    const sent: { env: ApnsEnvironment; token: string; body: unknown }[] = [];
    let closed = false;
    const transport: ApnsTransport = {
      async send(env, req): Promise<ApnsResponse> {
        const token = req.path.split('/').pop()!;
        sent.push({ env, token, body: JSON.parse(req.body) });
        if (token === gone) return { status: 410, reason: 'Unregistered' };
        if (token === bad) return { status: 400, reason: 'BadDeviceToken' };
        if (token === wrongEnv) return env === 'production' ? { status: 200 } : { status: 400, reason: 'BadDeviceToken' };
        return { status: 200 };
      },
      close() { closed = true; },
    };
    await sendApns(admin, [a().user.id], { title: 'T', body: 'B', url: '/spiel/ABCD', tag: 'turn-x' }, { config, transport });

    expect(closed).toBe(true);
    expect(sent.find((s) => s.token === good)?.body).toMatchObject({ aps: { alert: { title: 'T', body: 'B' } }, url: '/spiel/ABCD' });
    const left = await devicesOf(a().user.id);
    expect(Object.fromEntries(left.map((d) => [d.token, d.environment]))).toEqual({ [good]: 'production', [wrongEnv]: 'production' });

    // Without an APNs key native push is simply off.
    sent.length = 0;
    await sendApns(admin, [a().user.id], { title: 'T', body: 'B', url: '/' }, { config: null, transport });
    expect(sent).toEqual([]);
  });
});

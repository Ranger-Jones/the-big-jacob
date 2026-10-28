import { describe, expect, it } from 'vitest';
import { botFirstWinDukaten, dailyDukaten } from '@/lib/rewards';
import { admin, createTestUser } from './helpers';

const dukatenOf = async (id: string) =>
  (await admin.from('profiles').select('dukaten').eq('id', id).single()).data!.dukaten;

describe('dukaten rewards', () => {
  it('pays the first win against a bot only once', async () => {
    const u = await createTestUser('rw');
    const record = (won: boolean) => admin.rpc('record_bot_duel', { p_user: u.id, p_persona: 'peschel', p_won: won }).then((r) => r.data);
    expect(await record(false)).toBe(false);
    expect(await record(true)).toBe(true);
    expect(await record(true)).toBe(false);
    const { data } = await admin.from('bot_records').select('played, won').eq('user_id', u.id).eq('persona', 'peschel').single();
    expect(data).toEqual({ played: 3, won: 2 });
  });

  it('counts only one first win when duels finish at the same moment', async () => {
    const u = await createTestUser('rr');
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      admin.rpc('record_bot_duel', { p_user: u.id, p_persona: 'nikita', p_won: true }).then((r) => r.data)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const { data } = await admin.from('bot_records').select('played, won').eq('user_id', u.id).eq('persona', 'nikita').single();
    expect(data).toEqual({ played: 8, won: 8 });
  });

  it('adds dukaten through the server only', async () => {
    const u = await createTestUser('rd');
    await admin.rpc('grant_dukaten', { p_user: u.id, p_amount: 40 });
    expect(await dukatenOf(u.id)).toBe(40);
    const { error } = await u.client.rpc('grant_dukaten', { p_user: u.id, p_amount: 1000 });
    expect(error).not.toBeNull();
    expect(await dukatenOf(u.id)).toBe(40);
  });

  it('scales the rewards sensibly', () => {
    expect([1, 2, 3, 4].map(dailyDukaten)).toEqual([40, 25, 15, 10]);
    expect(botFirstWinDukaten(1350)).toBeGreaterThan(botFirstWinDukaten(1040));
  });
});

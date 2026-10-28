import { describe, expect, it } from 'vitest';
import { loadGame, loadGameByCode, performAction } from '@/server/game-service';
import { botRoster, startDuel } from '@/server/solo-service';
import { admin, createTestUser } from './helpers';

async function playOut(gameId: string, userId: string) {
  for (let i = 0; i < 4000; i++) {
    const s = (await loadGame(admin, gameId))!.state;
    if (s.status === 'finished') return s;
    if (s.phase === 'play' && s.turn?.startsWith('bot-')) await performAction(admin, userId, gameId, { type: 'botMove' });
    else if (s.phase === 'play') {
      const res = s.trick
        ? await performAction(admin, userId, gameId, { type: 'pass' })
        : await performAction(admin, userId, gameId, { type: 'play', cards: [s.hands[userId].at(-1)!] });
      expect(res.ok).toBe(true);
    } else if (s.phase === 'draw') await performAction(admin, userId, gameId, { type: 'draw' });
    else if (s.phase === 'court' || s.phase === 'roundEnd') await performAction(admin, userId, gameId, { type: 'ready' });
    else if (s.phase === 'tax') {
      const pair = s.tax.find((t) => !t.done)!;
      await performAction(admin, pair.to, gameId, { type: 'taxReturn', cards: s.hands[pair.to].slice(-pair.count) });
    }
  }
  throw new Error('duel did not finish');
}

describe('duels against persona bots', () => {
  it('starts, continues and books a duel against a bot', async () => {
    const u = await createTestUser('du');
    expect((await startDuel(admin, u.id, 'kaiser', 'klassisch')).ok).toBe(false);
    expect((await startDuel(admin, u.id, 'bernd', 'gibtsnicht')).ok).toBe(false);

    const started = await startDuel(admin, u.id, 'bernd', 'schnapp');
    if (!started.ok) throw new Error(started.error);
    const again = await startDuel(admin, u.id, 'bernd', 'klassisch');
    expect(again.ok && again.data.code).toBe(started.data.code);

    const game = (await loadGameByCode(admin, started.data.code))!;
    expect(game.state.mode).toBe('duel');
    expect(game.state.settings).toMatchObject({ duel: true, snap: true, goal: 20 });
    expect(game.state.players[1].bot).toMatchObject({ persona: 'bernd', name: 'Bauer Bernd' });
    // The reserve is a secret: the public row only knows its size.
    const { data: row } = await admin.from('games').select('state').eq('id', game.id).single();
    expect(JSON.stringify(row!.state)).not.toContain('"reserve"');

    const roster = await botRoster(admin, u.id);
    expect(roster.find((b) => b.id === 'bernd')?.openCode).toBe(started.data.code);
    expect(roster.at(-1)?.id).toBe('peschel');

    await playOut(game.id, u.id);
    const after = await botRoster(admin, u.id);
    const bernd = after.find((b) => b.id === 'bernd')!;
    expect(bernd.played).toBe(1);
    expect(bernd.openCode).toBeNull();

    // Records are private and only the server books them.
    const other = await createTestUser('dv');
    const { data: foreign } = await other.client.from('bot_records').select('*').eq('user_id', u.id);
    expect(foreign).toEqual([]);
    const { error } = await u.client.rpc('record_bot_duel', { p_user: u.id, p_persona: 'peschel', p_won: true });
    expect(error).not.toBeNull();
  }, 180_000);

  it('lets the host seat persona bots at a normal table', async () => {
    const u = await createTestUser('dp');
    const { createGame } = await import('@/server/game-service');
    const created = await createGame(admin, u.id, null);
    if (!created.ok) throw new Error(created.error);
    const game = (await loadGameByCode(admin, created.data.code))!;
    expect((await performAction(admin, u.id, game.id, { type: 'addBot', persona: 'charlotta' })).ok).toBe(true);
    expect((await performAction(admin, u.id, game.id, { type: 'addBot', persona: 'charlotta' })).ok).toBe(false);
    expect((await performAction(admin, u.id, game.id, { type: 'addBot', level: 'easy' })).ok).toBe(true);
    const s = (await loadGame(admin, game.id))!.state;
    expect(s.players.map((p) => p.bot?.persona ?? null)).toEqual([null, 'charlotta', null]);
  });
});

import { afterAll, describe, expect, it } from 'vitest';
import { applyAction, createGameState, type GameState } from '@/lib/jakob/engine';
import { seeded } from '@/lib/jakob/test-utils';
import { createGame, joinGame, loadGame, loadGameByCode, performAction } from '@/server/game-service';
import { findOrCreatePublicLobby, publicLobbyStats } from '@/server/matchmaking-service';
import { bookGameResults, ratedParticipants } from '@/server/rating-service';
import { admin, createTestUser } from './helpers';

const createdGames: string[] = [];
afterAll(async () => {
  if (createdGames.length) await admin.from('games').delete().in('id', createdGames);
});

/** A finished 3-player state (two humans and a bot) without playing it out. */
function finishedState(a: string, b: string): GameState {
  let s = createGameState(a);
  for (const [actor, action] of [[b, { type: 'join' }], [a, { type: 'addBot', level: 'sly' }]] as const) {
    const res = applyAction(s, actor, action, seeded(1));
    if (!res.ok) throw new Error(res.error);
    s = res.state;
  }
  const bot = s.players[2].id;
  return {
    ...s,
    status: 'finished',
    round: 1,
    points: { [a]: 2, [b]: 0, [bot]: 1 },
    history: [{ round: 1, start: [a, b, bot], finish: [a, bot, b], points: { [a]: 2, [bot]: 1, [b]: 0 }, event: null, revolution: 'none' }],
    stats: {},
  } as GameState;
}

describe('elo and experience', () => {
  it('books rating and xp once per game and player', async () => {
    const a = await createTestUser('ea');
    const b = await createTestUser('eb');
    const created = await createGame(admin, a.id);
    if (!created.ok) throw new Error(created.error);
    createdGames.push(created.data.id);
    const state = finishedState(a.id, b.id);

    await bookGameResults(admin, created.data.id, state);
    await bookGameResults(admin, created.data.id, state);

    const { data: rows } = await admin.from('rating_history').select('user_id, delta, xp, place').eq('game_id', created.data.id);
    expect(rows).toHaveLength(2);
    const byUser = Object.fromEntries(rows!.map((r) => [r.user_id, r]));
    expect(byUser[a.id].delta).toBeGreaterThan(0);
    expect(byUser[b.id].delta).toBeLessThan(0);
    expect(byUser[a.id].xp).toBeGreaterThan(byUser[b.id].xp);

    const { data: profiles } = await admin.from('profiles').select('id, rating, rated_games, xp').in('id', [a.id, b.id]);
    const pa = profiles!.find((p) => p.id === a.id)!;
    expect(pa.rating).toBe(1000 + byUser[a.id].delta);
    expect(pa.rated_games).toBe(1);
    expect(pa.xp).toBe(byUser[a.id].xp);

    // Readable for everyone signed in (shown on profiles and the results screen).
    const { data: visible } = await b.client.from('rating_history').select('user_id').eq('game_id', created.data.id);
    expect(visible).toHaveLength(2);
  });

  it('clients cannot book results themselves', async () => {
    const a = await createTestUser('ec');
    const { error } = await a.client.rpc('apply_game_results', { p_game_id: '00000000-0000-0000-0000-000000000000', p_entries: [] });
    expect(error).not.toBeNull();
  });

  it('solo modes only give experience', async () => {
    const a = await createTestUser('ed');
    const b = await createTestUser('ee');
    const created = await createGame(admin, a.id);
    if (!created.ok) throw new Error(created.error);
    createdGames.push(created.data.id);
    await bookGameResults(admin, created.data.id, { ...finishedState(a.id, b.id), mode: 'campaign' });
    const { data } = await admin.from('profiles').select('rating, rated_games, xp').eq('id', a.id).single();
    expect(data).toMatchObject({ rating: 1000, rated_games: 0 });
    expect(data!.xp).toBeGreaterThan(0);
  });
});

describe('anti-farming rules', () => {
  const players = (ids: string[], bots = 0) => [
    ...ids.map((id) => ({ id, left: false, deckId: null })),
    ...Array.from({ length: bots }, (_, i) => ({ id: `bot-${i}`, left: false, deckId: null, bot: { name: 'B', emoji: '🤖', level: 'easy' as const } })),
  ];
  const base = { kicked: [] as string[] } as unknown as GameState;

  it('private games against hand-picked bots are not rated', () => {
    expect(ratedParticipants({ ...base, mode: 'normal', players: players(['a'], 3) } as GameState)).toEqual([]);
  });

  it('private games rate only the humans', () => {
    expect(ratedParticipants({ ...base, mode: 'normal', players: players(['a', 'b'], 2) } as GameState).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('the open lobby counts its bots', () => {
    expect(ratedParticipants({ ...base, mode: 'public', players: players(['a'], 4) } as GameState)).toHaveLength(5);
  });

  it('kicked players are neither opponents nor booked', async () => {
    const a = await createTestUser('ka');
    const b = await createTestUser('kb');
    const c = await createTestUser('kc');
    const created = await createGame(admin, a.id);
    if (!created.ok) throw new Error(created.error);
    createdGames.push(created.data.id);
    const state = finishedState(a.id, b.id);
    const withC = {
      ...state,
      players: [...state.players, { id: c.id, left: true, deckId: null }],
      kicked: [c.id],
      history: [{ ...state.history[0], finish: [...state.history[0].finish] }],
    } as GameState;
    await bookGameResults(admin, created.data.id, withC);
    const { data: rows } = await admin.from('rating_history').select('user_id').eq('game_id', created.data.id);
    expect(rows!.map((r) => r.user_id).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('open online lobby', () => {
  it('matches players into one lobby and starts with bots when time is up', async () => {
    const a = await createTestUser('ma');
    const b = await createTestUser('mb');
    const first = await findOrCreatePublicLobby(admin, a.id, null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const game = (await loadGameByCode(admin, first.data.code))!;
    createdGames.push(game.id);

    const second = await findOrCreatePublicLobby(admin, b.id, null);
    expect(second.ok && second.data.code).toBe(first.data.code);
    // Asking again sends you back to your table.
    const again = await findOrCreatePublicLobby(admin, a.id, null);
    expect(again.ok && again.data.code).toBe(first.data.code);
    expect((await publicLobbyStats(admin)).waiting).toBeGreaterThanOrEqual(2);

    // Too early: refused.
    expect((await performAction(admin, a.id, game.id, { type: 'autoStart' })).ok).toBe(false);

    // Pretend the five minutes are over.
    const current = (await loadGame(admin, game.id))!;
    const past = { ...current.state, autoStartAt: new Date(Date.now() - 1000).toISOString() };
    await admin.from('games').update({ state: past as never }).eq('id', game.id);
    const started = await performAction(admin, b.id, game.id, { type: 'autoStart' });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.state.status).toBe('playing');
    expect(started.data.state.players.filter((p) => p.bot).length).toBeGreaterThan(0);
  });

  it('a waiting lobby can also be joined by code (to bring a friend)', async () => {
    const c = await createTestUser('mc');
    const res = await findOrCreatePublicLobby(admin, c.id, null);
    if (!res.ok) throw new Error(res.error);
    const game = (await loadGameByCode(admin, res.data.code))!;
    createdGames.push(game.id);
    expect(game.state.mode).toBe('public');
    const late = await createTestUser('md');
    expect((await joinGame(admin, late.id, res.data.code)).ok).toBe(true);
  });
});

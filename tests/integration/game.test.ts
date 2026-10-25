import { describe, expect, it } from 'vitest';
import { performAction, createGame, joinGame, loadGame, requestRematch } from '@/server/game-service';
import { STALE } from '@/server/result';
import { admin, createTestUser } from './helpers';

async function startedGame() {
  const host = await createTestUser('h');
  const guest = await createTestUser('g');
  const created = await createGame(admin, host.id);
  if (!created.ok) throw new Error(created.error);
  const id = created.data.id;
  expect((await joinGame(admin, guest.id, created.data.code)).ok).toBe(true);
  expect((await performAction(admin, host.id, id, { type: 'addBot', level: 'sly' })).ok).toBe(true);
  const game = await loadGame(admin, id);
  expect((await performAction(admin, host.id, id, { type: 'start' }, game!.version)).ok).toBe(true);
  for (const u of [host, guest]) expect((await performAction(admin, u.id, id, { type: 'draw' })).ok).toBe(true);
  return { host, guest, id, code: created.data.code };
}

describe('hidden hands', () => {
  it('deals into secrets and mirrors only your own hand', async () => {
    const { host, guest, id } = await startedGame();
    const game = await loadGame(admin, id);
    expect(game!.state.phase).toBe('court');
    const total = Object.values(game!.state.hands).reduce((n, h) => n + h.length, 0);
    expect(total).toBe(80);

    // Public state has counts but no cards.
    const { data: pub } = await host.client.from('games').select('state').eq('id', id).single();
    const state = pub!.state as Record<string, unknown>;
    expect(state.hands).toBeUndefined();
    expect(state.handCounts).toBeTruthy();

    // Each player reads exactly their own hand row.
    const { data: hostRows } = await host.client.from('game_hands').select('user_id, hand').eq('game_id', id);
    expect(hostRows!.map((r) => r.user_id)).toEqual([host.id]);
    expect((hostRows![0].hand as { cards: number[] }).cards).toEqual(game!.state.hands[host.id]);
    const { data: guestRows } = await guest.client.from('game_hands').select('user_id').eq('game_id', id);
    expect(guestRows!.map((r) => r.user_id)).toEqual([guest.id]);

    // Nobody can read the server secrets (bot hands).
    const { data: secrets } = await guest.client.from('game_secrets').select('*').eq('game_id', id);
    expect(secrets ?? []).toEqual([]);
  });

  it('outsiders see nothing of a running game', async () => {
    const { id } = await startedGame();
    const stranger = await createTestUser('s');
    const { data: games } = await stranger.client.from('games').select('id').eq('id', id);
    expect(games).toEqual([]);
    const { data: hands } = await stranger.client.from('game_hands').select('user_id').eq('game_id', id);
    expect(hands).toEqual([]);
  });

  it('commit_game is not callable by clients', async () => {
    const { host, id } = await startedGame();
    const { error } = await host.client.rpc('commit_game', {
      p_game_id: id, p_expected_version: 0, p_state: {}, p_secret: {}, p_players: [], p_hands: [],
    });
    expect(error).not.toBeNull();
  });
});

describe('moves', () => {
  it('plays a whole game with two humans and a bot through the service', async () => {
    const { host, guest, id } = await startedGame();
    let guard = 0;
    for (;;) {
      const game = (await loadGame(admin, id))!;
      const s = game.state;
      if (s.status === 'finished' || guard++ > 3000) break;
      const actorFor = (ids: string[]) => ids.find((x) => x === host.id || x === guest.id);
      if (s.phase === 'court' || s.phase === 'roundEnd') {
        const waiting = actorFor([host.id, guest.id].filter((x) => !s.ready.includes(x)))!;
        await performAction(admin, waiting, id, { type: 'ready' });
      } else if (s.phase === 'tax') {
        const pair = s.tax.find((t) => !t.done)!;
        await performAction(admin, pair.to, id, { type: 'taxReturn', cards: s.hands[pair.to].slice(-pair.count) });
      } else if (s.phase === 'play') {
        const turn = s.turn!;
        if (turn.startsWith('bot-')) {
          expect((await performAction(admin, host.id, id, { type: 'botMove' }, { moveSeq: s.moveSeq })).ok).toBe(true);
        } else {
          const hand = s.hands[turn];
          const res = s.trick
            ? await performAction(admin, turn, id, { type: 'pass' }, { moveSeq: s.moveSeq })
            : await performAction(admin, turn, id, { type: 'play', cards: [hand.at(-1)!] }, { moveSeq: s.moveSeq });
          expect(res.ok).toBe(true);
        }
      }
    }
    const game = (await loadGame(admin, id))!;
    expect(game.state.status).toBe('finished');
    const { data: rows } = await admin.from('game_players').select('user_id, place, points, stats').eq('game_id', id);
    expect(rows).toHaveLength(2);
    expect(rows!.every((r) => r.place !== null)).toBe(true);
    const { data: stats } = await host.client.from('player_stats').select('games_played').eq('user_id', host.id).single();
    expect(stats!.games_played).toBe(1);

    const rematch = await requestRematch(admin, guest.id, id);
    expect(rematch.ok).toBe(true);
  }, 120_000);

  it('rejects a stale move sequence', async () => {
    const { host, id } = await startedGame();
    const game = (await loadGame(admin, id))!;
    const res = await performAction(admin, host.id, id, { type: 'ready' }, { moveSeq: game.state.moveSeq + 5 });
    expect(res).toEqual({ ok: false, error: STALE });
  });
});

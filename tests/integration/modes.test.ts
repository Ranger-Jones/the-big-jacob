import { describe, expect, it } from 'vitest';
import { DAILY_SETTINGS } from '@/lib/daily';
import { dailyDukaten } from '@/lib/rewards';
import { createGame, createSoloGame, joinGame, loadGame, loadGameByCode, performAction } from '@/server/game-service';
import { addSpectator, canSpectate } from '@/server/spectate-service';
import { respondFriendRequest, sendFriendRequest, listFriends } from '@/server/social-service';
import { admin, createTestUser } from './helpers';

async function playOut(gameId: string, userId: string) {
  for (let i = 0; i < 4000; i++) {
    const g = (await loadGame(admin, gameId))!;
    if (g.state.status === 'finished') return g;
    await performAction(admin, userId, gameId, { type: 'skip' }, undefined).catch(() => undefined);
    // skip needs an idle wait; bots and timeouts are driven directly instead
    const s = g.state;
    if (s.phase === 'play' && s.turn?.startsWith('bot-')) await performAction(admin, userId, gameId, { type: 'botMove' });
    else if (s.phase === 'play') {
      const res = s.trick
        ? await performAction(admin, userId, gameId, { type: 'pass' })
        : await performAction(admin, userId, gameId, { type: 'play', cards: [s.hands[userId].at(-1)!] });
      expect(res.ok).toBe(true);
    } else if (s.phase === 'court' || s.phase === 'roundEnd') await performAction(admin, userId, gameId, { type: 'ready' });
    else if (s.phase === 'tax') {
      const pair = s.tax.find((t) => !t.done)!;
      await performAction(admin, pair.to, gameId, { type: 'taxReturn', cards: s.hands[pair.to].slice(-pair.count) });
    }
  }
  throw new Error('game did not finish');
}

describe('daily challenge', () => {
  it('books one result per day and keeps solo games out of the stats', async () => {
    const u = await createTestUser('dy');
    const day = `2099-01-${String(10 + Math.floor(Math.random() * 18)).padStart(2, '0')}`;
    const created = await createSoloGame(admin, u.id, { mode: 'daily', ref: day, settings: DAILY_SETTINGS, bots: ['sly', 'sly', 'sly'], seed: 42 });
    expect(created.ok).toBe(true);
    const game = (await loadGameByCode(admin, created.ok ? created.data.code : ''))!;
    expect(game.state.phase).not.toBe('draw');
    await playOut(game.id, u.id);
    const { data: result } = await admin.from('daily_results').select('points, place').eq('day', day).eq('user_id', u.id).single();
    expect(result).not.toBeNull();
    // The result pays Dukaten by place, once.
    const { data: profile } = await admin.from('profiles').select('dukaten').eq('id', u.id).single();
    expect(profile!.dukaten).toBe(dailyDukaten(result!.place));
    const { data: stats } = await u.client.from('player_stats').select('games_played').eq('user_id', u.id).single();
    expect(stats!.games_played).toBe(0);
  }, 120_000);
});

describe('spectators', () => {
  it('only friends may watch, and watchers read the game but never a hand', async () => {
    const host = await createTestUser('sh');
    const guest = await createTestUser('sg');
    const friend = await createTestUser('sf');
    const stranger = await createTestUser('ss');
    await sendFriendRequest(admin, friend.id, host.username);
    const req = (await listFriends(admin, host.id)).incoming[0];
    await respondFriendRequest(admin, host.id, req.friendshipId, true);

    const created = await createGame(admin, host.id);
    if (!created.ok) throw new Error(created.error);
    await joinGame(admin, guest.id, created.data.code);
    await performAction(admin, host.id, created.data.id, { type: 'start' }, (await loadGame(admin, created.data.id))!.version);
    const game = (await loadGame(admin, created.data.id))!;

    expect((await canSpectate(admin, stranger.id, game)).ok).toBe(false);
    expect((await canSpectate(admin, friend.id, game)).ok).toBe(true);
    await addSpectator(admin, friend.id, game.id);

    const { data: visible } = await friend.client.from('games').select('id').eq('id', game.id);
    expect(visible).toHaveLength(1);
    const { data: hands } = await friend.client.from('game_hands').select('user_id').eq('game_id', game.id);
    expect(hands).toEqual([]);
    const { data: hidden } = await stranger.client.from('games').select('id').eq('id', game.id);
    expect(hidden).toEqual([]);
  });
});

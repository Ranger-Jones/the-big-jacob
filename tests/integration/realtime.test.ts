import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, test } from 'vitest';
import { createGame, joinGame, loadGame, performAction } from '@/server/game-service';
import { admin, createTestUser } from './helpers';

function subscribeStatus(client: SupabaseClient, topic: string): Promise<string> {
  return new Promise((resolve) => {
    const channel = client.channel(topic, { config: { private: true } });
    const timer = setTimeout(() => resolve('TIMEOUT'), 8000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
        clearTimeout(timer);
        client.removeChannel(channel);
        resolve(status);
      }
    });
  });
}

describe('private game channels', () => {
  test('only members may join the game channel', async () => {
    const a = await createTestUser('rtA');
    const stranger = await createTestUser('rtX');
    const game = await createGame(admin, a.id);
    if (!game.ok) throw new Error(game.error);
    await a.client.realtime.setAuth();
    await stranger.client.realtime.setAuth();
    expect(await subscribeStatus(a.client, `game:${game.data.id}`)).toBe('SUBSCRIBED');
    expect(await subscribeStatus(stranger.client, `game:${game.data.id}`)).toBe('CHANNEL_ERROR');
  });
});

describe('live hands', () => {
  test('a player receives their own hand updates and never anyone else’s', async () => {
    const host = await createTestUser('lhH');
    const guest = await createTestUser('lhG');
    const game = await createGame(admin, host.id);
    if (!game.ok) throw new Error(game.error);
    const id = game.data.id;
    await joinGame(admin, guest.id, game.data.code);
    await performAction(admin, host.id, id, { type: 'start' }, (await loadGame(admin, id))!.version);
    await guest.client.realtime.setAuth();

    const seen: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no realtime event')), 12_000);
      guest.client.channel(`hands-test:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_hands', filter: `game_id=eq.${id}` }, (payload) => {
          seen.push((payload.new as { user_id: string }).user_id);
          if (seen.length >= 1) {
            clearTimeout(timer);
            // Give a possible leak of the host's row a moment to arrive as well.
            setTimeout(resolve, 1500);
          }
        })
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;
          // Both draws deal the cards: both hand rows change.
          await performAction(admin, host.id, id, { type: 'draw' });
          await performAction(admin, guest.id, id, { type: 'draw' });
        });
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(seen)).toEqual(new Set([guest.id]));
  }, 30_000);
});

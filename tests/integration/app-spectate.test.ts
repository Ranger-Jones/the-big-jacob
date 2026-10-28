import { describe, expect, it } from 'vitest';
import { GET, POST, type Ctx } from '@/server/app-api/handlers';
import { respondFriendRequest, sendFriendRequest } from '@/server/social-service';
import { admin, createTestUser } from './helpers';

async function ctxFor(prefix: string) {
  const u = await createTestUser(prefix);
  const { data: user } = await admin.from('profiles')
    .select('id, username, avatar_url, avatar_frame, table_felt, xp, rating, loot_equipped').eq('id', u.id).single();
  const ctx = (params: string[] = [], body: Record<string, unknown> = {}, query = ''): Ctx =>
    ({ admin, user: user!, params, body, query: new URLSearchParams(query) });
  return Object.assign(ctx, { id: u.id, username: user!.username, client: u.client });
}

describe('watching friends in the app', () => {
  it('lists friends at tables and lets only friends watch without seeing a hand', async () => {
    const player = await ctxFor('wp');
    const friend = await ctxFor('wf');
    const stranger = await ctxFor('ws');
    const req = await sendFriendRequest(admin, player.id, friend.username);
    if (!req.ok) throw new Error(req.error);
    const { data: f } = await admin.from('friendships').select('id').eq('requester_id', player.id).eq('addressee_id', friend.id).single();
    expect((await respondFriendRequest(admin, friend.id, f!.id, true)).ok).toBe(true);

    const table = await POST.table(player([], { kind: 'new' }));
    if (!table.ok) throw new Error(table.error);
    const { code } = table.data as { code: string };
    const opened = await GET.game(player([code]));
    const view = (opened.ok ? opened.data : null) as { view: { id: string; version: number } };
    await POST.action(player([view.view.id], { action: { type: 'addBot', level: 'easy' } }));
    expect((await POST.action(player([view.view.id], { action: { type: 'start' } }))).ok).toBe(true);

    // The friend sees the table on the home screen and in the friends list.
    const home = await GET.home(friend());
    const tables = (home.ok ? (home.data as { friendTables: { code: string; friendIds: string[] }[] }).friendTables : []);
    expect(tables).toEqual([expect.objectContaining({ code, friendIds: [player.id] })]);
    const friends = await GET.friends(friend());
    expect(friends.ok && (friends.data as { tables: { code: string }[] }).tables.map((t) => t.code)).toEqual([code]);

    // Watching: the table without any hand; the stranger is turned away.
    const watched = await GET.spectate(friend([code]));
    if (!watched.ok) throw new Error(watched.error);
    const data = watched.data as { spectating: boolean; hand: { cards: number[] }; view: { state: { players: { id: string }[]; hands?: unknown } } };
    expect(data.spectating).toBe(true);
    expect(data.hand.cards).toEqual([]);
    expect(data.view.state.hands).toBeUndefined();
    expect(data.view.state.players.some((p) => p.id === friend.id)).toBe(false);
    expect((await GET.spectate(stranger([code]))).ok).toBe(false);
    expect((await GET.spectate(player([code]))).ok).toBe(false);

    // The spectator may read the game row (realtime), but never the player's hand.
    const { data: row } = await friend.client.from('games').select('id').eq('code', code).maybeSingle();
    expect(row?.id).toBe(view.view.id);
    const { data: hands } = await friend.client.from('game_hands').select('user_id').eq('game_id', view.view.id);
    expect(hands ?? []).toEqual([]);
  }, 120_000);
});

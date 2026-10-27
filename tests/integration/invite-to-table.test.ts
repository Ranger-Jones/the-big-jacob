import { describe, expect, it } from 'vitest';
import { joinGame } from '@/server/game-service';
import { getFriendshipWith, inviteFriendToTable, respondFriendRequest, sendFriendRequest } from '@/server/social-service';
import { admin, createTestUser } from './helpers';

async function befriend(a: { id: string; username: string }, b: { id: string; username: string }) {
  await sendFriendRequest(admin, a.id, b.username);
  const { friendshipId } = await getFriendshipWith(admin, b.id, a.id);
  await respondFriendRequest(admin, b.id, friendshipId!, true);
}

describe('invite a friend to the table', () => {
  it('opens a table when needed, then reuses it for further friends', async () => {
    const host = await createTestUser('itH');
    const f1 = await createTestUser('itA');
    const f2 = await createTestUser('itB');
    await befriend(host, f1);
    await befriend(host, f2);

    const first = await inviteFriendToTable(admin, host.id, f1.id, null);
    expect(first.ok && first.data.created).toBe(true);
    const second = await inviteFriendToTable(admin, host.id, f2.id, null);
    expect(second.ok && second.data.created).toBe(false);
    expect(second.ok && first.ok && second.data.code === first.data.code).toBe(true);

    const { data: invites } = await admin.from('game_invites').select('to_id, status')
      .eq('game_id', first.ok ? first.data.gameId : '');
    expect(new Set(invites!.map((i) => i.to_id))).toEqual(new Set([f1.id, f2.id]));

    // Once the friend has joined, a second click just leads to the same table.
    await joinGame(admin, f1.id, first.ok ? first.data.code : '');
    const again = await inviteFriendToTable(admin, host.id, f1.id, null);
    expect(again.ok && again.data.alreadyThere).toBe(true);
  });

  it('only works for friends', async () => {
    const a = await createTestUser('itX');
    const stranger = await createTestUser('itY');
    expect((await inviteFriendToTable(admin, a.id, stranger.id, null)).ok).toBe(false);
  });
});

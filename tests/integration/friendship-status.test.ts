import { describe, expect, it } from 'vitest';
import { getFriendshipWith, removeFriend, respondFriendRequest, sendFriendRequest } from '@/server/social-service';
import { admin, createTestUser } from './helpers';

describe('friendship status on a profile', () => {
  it('walks through none → outgoing/incoming → friends → none', async () => {
    const a = await createTestUser('fsA');
    const b = await createTestUser('fsB');
    expect(await getFriendshipWith(admin, a.id, b.id)).toEqual({ status: 'none', friendshipId: null });

    expect((await sendFriendRequest(admin, a.id, b.username)).ok).toBe(true);
    const outgoing = await getFriendshipWith(admin, a.id, b.id);
    expect(outgoing.status).toBe('outgoing');
    const incoming = await getFriendshipWith(admin, b.id, a.id);
    expect(incoming).toEqual({ status: 'incoming', friendshipId: outgoing.friendshipId });

    expect((await respondFriendRequest(admin, b.id, incoming.friendshipId!, true)).ok).toBe(true);
    expect((await getFriendshipWith(admin, a.id, b.id)).status).toBe('friends');
    expect((await getFriendshipWith(admin, b.id, a.id)).status).toBe('friends');

    expect((await removeFriend(admin, b.id, incoming.friendshipId!)).ok).toBe(true);
    expect((await getFriendshipWith(admin, a.id, b.id)).status).toBe('none');
  });

  it('a stranger cannot act on someone else’s request', async () => {
    const a = await createTestUser('fsC');
    const b = await createTestUser('fsD');
    const x = await createTestUser('fsX');
    await sendFriendRequest(admin, a.id, b.username);
    const { friendshipId } = await getFriendshipWith(admin, a.id, b.id);
    expect((await respondFriendRequest(admin, x.id, friendshipId!, true)).ok).toBe(false);
    expect((await removeFriend(admin, x.id, friendshipId!)).ok).toBe(false);
  });
});

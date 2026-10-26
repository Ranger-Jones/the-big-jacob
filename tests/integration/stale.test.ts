import { describe, expect, it } from 'vitest';
import { closeStaleGames, createGame, joinGame, loadGame, performAction } from '@/server/game-service';
import { admin, createTestUser } from './helpers';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

describe('closing abandoned tables', () => {
  it('deletes old lobbies and idle games, keeps active ones', async () => {
    const host = await createTestUser('st');
    const guest = await createTestUser('su');

    const oldLobby = await createGame(admin, host.id);
    const freshLobby = await createGame(admin, host.id);
    const idleGame = await createGame(admin, host.id);
    const busyGame = await createGame(admin, host.id);
    if (!oldLobby.ok || !freshLobby.ok || !idleGame.ok || !busyGame.ok) throw new Error('setup failed');

    for (const g of [idleGame, busyGame]) {
      await joinGame(admin, guest.id, g.data.code);
      await performAction(admin, host.id, g.data.id, { type: 'start' }, (await loadGame(admin, g.data.id))!.version);
    }

    await admin.from('games').update({ created_at: hoursAgo(5) }).eq('id', oldLobby.data.id);
    // Idle: started a day ago, nobody moved for 13 hours.
    const idle = (await loadGame(admin, idleGame.data.id))!;
    await admin.from('games').update({
      created_at: hoursAgo(26), started_at: hoursAgo(25),
      state: { ...(await admin.from('games').select('state').eq('id', idle.id).single()).data!.state as object, waitSince: hoursAgo(13) },
    }).eq('id', idle.id);
    // Busy: also old, but the last turn began a minute ago.
    await admin.from('games').update({ created_at: hoursAgo(26), started_at: hoursAgo(25) }).eq('id', busyGame.data.id);

    await closeStaleGames(admin, Date.now(), true);

    expect(await loadGame(admin, oldLobby.data.id)).toBeNull();
    expect(await loadGame(admin, idleGame.data.id)).toBeNull();
    expect(await loadGame(admin, freshLobby.data.id)).not.toBeNull();
    expect(await loadGame(admin, busyGame.data.id)).not.toBeNull();
    const { data: rows } = await admin.from('game_players').select('game_id').eq('game_id', idleGame.data.id);
    expect(rows).toEqual([]);
  });
});

'use server';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import type { GameAction } from '@/lib/jakob/engine';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDefaultDeckId } from './deck-service';
import { runGameAction } from './game-commands';
import { createGame, joinGame, requestRematch, type Expectation } from './game-service';
import { findOrCreatePublicLobby } from './matchmaking-service';
import { fail } from './result';
import { sendPush } from './push-service';
import { inviteFriendToTable, inviteToGame } from './social-service';

const uuid = z.uuid();

export async function createGameAction() {
  const user = await requireUser();
  const admin = createAdminClient();
  const res = await createGame(admin, user.id, await getDefaultDeckId(admin, user.id));
  if (!res.ok) throw new Error(res.error);
  redirect(`/spiel/${res.data.code}`);
}

/** "Online spielen": into the open lobby (or a new one). */
export async function playOnlineAction() {
  const user = await requireUser();
  const admin = createAdminClient();
  const res = await findOrCreatePublicLobby(admin, user.id, await getDefaultDeckId(admin, user.id));
  if (!res.ok) throw new Error(res.error);
  redirect(`/spiel/${res.data.code}`);
}

export async function joinGameAction(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const res = await joinGame(createAdminClient(), user.id, String(form.get('code') ?? ''));
  if (!res.ok) return { error: res.error };
  redirect(`/spiel/${res.data.code}`);
}

export async function gameAction(gameId: string, action: GameAction, expected?: Expectation) {
  const user = await requireUser();
  return runGameAction(createAdminClient(), user, gameId, action, expected);
}

export async function rematchAction(gameId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(gameId).success) return fail('Ungültige Aktion.');
  return requestRematch(createAdminClient(), user.id, gameId);
}

export async function inviteAction(gameId: string, friendId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(gameId).success || !uuid.safeParse(friendId).success) return fail('Ungültige Aktion.');
  const admin = createAdminClient();
  const res = await inviteToGame(admin, user.id, gameId, friendId);
  if (res.ok) {
    const code = (await admin.from('games').select('code').eq('id', gameId).single()).data?.code;
    after(() => sendPush(admin, [friendId], {
      title: '🎴 Einladung an den Tisch', body: `${user.username} lädt dich zum Großen Jakob ein.`, url: `/spiel/${code}`, tag: `invite-${gameId}`,
    }));
  }
  return res;
}

/** Invite a friend straight from the friend list or a profile (into my lobby or a new table). */
export async function inviteFriendToTableAction(friendId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(friendId).success) return fail('Ungültige Aktion.');
  const admin = createAdminClient();
  const res = await inviteFriendToTable(admin, user.id, friendId, await getDefaultDeckId(admin, user.id));
  if (res.ok && !res.data.alreadyThere) {
    after(() => sendPush(admin, [friendId], {
      title: '🎴 Einladung an den Tisch', body: `${user.username} lädt dich zum Großen Jakob ein.`,
      url: `/spiel/${res.data.code}`, tag: `invite-${res.data.gameId}`,
    }));
  }
  return res;
}

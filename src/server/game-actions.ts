'use server';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import type { GameAction } from '@/lib/jakob/engine';
import { BOT_LEVELS, GOAL_OPTIONS, ROUND_OPTIONS, TAX_OPTIONS, TURN_OPTIONS } from '@/lib/jakob/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { canUseDeck, getDefaultDeckId } from './deck-service';
import { createGame, joinGame, performAction, requestRematch, type Expectation } from './game-service';
import { findOrCreatePublicLobby } from './matchmaking-service';
import { fail } from './result';
import { sendPush } from './push-service';
import { inviteToGame } from './social-service';

const cards = z.array(z.number().int().min(1).max(13)).min(1).max(160);
const literalUnion = <T extends readonly (string | number | null)[]>(values: T) =>
  z.union(values.map((v) => z.literal(v)) as unknown as [z.ZodLiteral<T[number]>, z.ZodLiteral<T[number]>]);

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('autoStart') }),
  z.object({
    type: z.literal('updateSettings'),
    settings: z.object({
      rounds: literalUnion(ROUND_OPTIONS).optional(),
      goal: literalUnion(GOAL_OPTIONS).optional(),
      turnSeconds: literalUnion(TURN_OPTIONS).optional(),
      tax: z.enum(TAX_OPTIONS).optional(),
      revolution: z.boolean().optional(),
      jestersTaxable: z.boolean().optional(),
      chat: z.boolean().optional(),
      snap: z.boolean().optional(),
      bomb: z.boolean().optional(),
      kingFall: z.boolean().optional(),
      jesterBan: z.boolean().optional(),
      events: z.boolean().optional(),
      tracker: z.boolean().optional(),
      missions: z.boolean().optional(),
      throne: z.boolean().optional(),
      teams: z.boolean().optional(),
      mercy: z.boolean().optional(),
      abdicate: z.boolean().optional(),
      jesterCurse: z.boolean().optional(),
      courtSwap: z.boolean().optional(),
      blitz: z.boolean().optional(),
      doubleDeck: z.boolean().optional(),
    }).strict(),
  }),
  z.object({ type: z.literal('addBot'), level: z.enum(BOT_LEVELS) }),
  z.object({ type: z.literal('removePlayer'), playerId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('setDeck'), deckId: z.string().min(1).max(64).nullable() }),
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('revolution') }),
  z.object({ type: z.literal('mercy') }),
  z.object({ type: z.literal('abdicate') }),
  z.object({ type: z.literal('takeover'), playerId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('taxReturn'), cards }),
  z.object({ type: z.literal('play'), cards }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('timeout') }),
  z.object({ type: z.literal('skip') }),
  z.object({ type: z.literal('botMove') }),
]);
const uuid = z.uuid();
const expectationSchema = z.union([
  z.number().int().min(0),
  z.object({ moveSeq: z.number().int().min(0) }).strict(),
]).optional();

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
  const parsed = actionSchema.safeParse(action);
  const exp = expectationSchema.safeParse(expected);
  if (!parsed.success || !exp.success || !uuid.safeParse(gameId).success) return fail('Ungültige Aktion.');
  const admin = createAdminClient();
  if (parsed.data.type === 'setDeck' && !(await canUseDeck(admin, user.id, parsed.data.deckId))) {
    return fail('Dieses Deck gehört dir nicht. Kopier es dir zuerst unter „Decks“.');
  }
  const res = await performAction(admin, user.id, gameId, parsed.data as GameAction, exp.data);
  // "Du bist dran": notify the next human when the turn moved to them.
  if (res.ok) {
    const { state, previousTurn } = res.data;
    const next = state.phase === 'play' ? state.turn : null;
    const nextPlayer = state.players.find((p) => p.id === next);
    if (next && next !== previousTurn && next !== user.id && nextPlayer && !nextPlayer.bot && !nextPlayer.autopilot) {
      const code = (await admin.from('games').select('code').eq('id', gameId).single()).data?.code;
      after(() => sendPush(admin, [next], {
        title: '👑 Du bist dran!',
        body: state.trick ? 'Am Tisch wartet ein Stich auf dich.' : 'Du spielst aus.',
        url: `/spiel/${code}`,
        tag: `turn-${gameId}`,
      }));
    }
  }
  return res;
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

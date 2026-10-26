import { randomInt } from 'node:crypto';
import {
  applyAction, createGameState, createRematchState, fromParts, placements, privateHand, publicState, secretsOf,
  type BotLevel, type GameAction, type GameState, type PrivateHand, type PublicState, type Secrets, type Settings,
} from '@/lib/jakob/engine';
import { EMPTY_STATS } from '@/lib/jakob/types';
import type { AdminClient } from '@/lib/supabase/admin';
import { isStale, LOBBY_IDLE_HOURS } from '@/lib/jakob/stale';
import { fail, ok, STALE, type ServiceResult } from './result';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand = (max: number) => randomInt(max);

export interface GameRow { id: string; code: string; version: number; state: GameState; rematchGameId: string | null }
/** What a client receives: the public state plus its own hand. */
export interface GameView { id: string; code: string; version: number; state: PublicState; rematchGameId: string | null }

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

type Secret = Partial<Secrets>;
type Row = {
  id: string; code: string; version: number; state: unknown; rematch_game_id: string | null;
  game_secrets: { data: unknown } | { data: unknown }[] | null;
};
const COLUMNS = 'id, code, version, state, rematch_game_id, game_secrets(data)';

function toGame(r: Row): GameRow {
  const secretRow = Array.isArray(r.game_secrets) ? r.game_secrets[0] : r.game_secrets;
  const secret = (secretRow?.data ?? {}) as Secret;
  return {
    id: r.id, code: r.code, version: r.version, rematchGameId: r.rematch_game_id,
    state: fromParts(r.state as PublicState, secret),
  };
}

export function toView(game: GameRow): GameView {
  return { id: game.id, code: game.code, version: game.version, state: publicState(game.state), rematchGameId: game.rematchGameId };
}

export async function loadGame(admin: AdminClient, id: string): Promise<GameRow | null> {
  const { data, error } = await admin.from('games').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as Row) : null;
}

export async function loadGameByCode(admin: AdminClient, code: string): Promise<GameRow | null> {
  const { data, error } = await admin.from('games').select(COLUMNS).eq('code', normalizeCode(code)).maybeSingle();
  if (error) throw error;
  return data ? toGame(data as Row) : null;
}

/** Only humans get rows (bots have no profile). */
function playersPayload(state: GameState) {
  const places = state.status === 'finished' ? placements(state) : {};
  return state.players
    .map((p, seat) => ({ p, seat }))
    .filter(({ p }) => !p.bot)
    .map(({ p, seat }) => ({
      userId: p.id, seat, left: p.left, points: state.points[p.id] ?? 0,
      place: places[p.id] ?? null, stats: state.stats[p.id] ?? EMPTY_STATS,
    }));
}

/** Hands of humans that differ from the previous state (all of them on first write). */
function handsPayload(prev: GameState | null, next: GameState) {
  return next.players.filter((p) => !p.bot).flatMap((p) => {
    const hand = privateHand(next, p.id);
    if (prev && JSON.stringify(privateHand(prev, p.id)) === JSON.stringify(hand)) return [];
    return [{ userId: p.id, hand }];
  });
}

async function commit(
  admin: AdminClient, gameId: string, expectedVersion: number, prev: GameState | null, next: GameState,
): Promise<number | 'conflict'> {
  const { data, error } = await admin.rpc('commit_game', {
    p_game_id: gameId,
    p_expected_version: expectedVersion,
    p_state: publicState(next) as never,
    p_secret: secretsOf(next) as never,
    p_players: playersPayload(next) as never,
    p_hands: handsPayload(prev, next) as never,
  });
  if (error) {
    if (error.message.includes('version_conflict')) return 'conflict';
    throw error;
  }
  return data;
}

export async function insertGame(admin: AdminClient, state: GameState): Promise<ServiceResult<{ id: string; code: string }>> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await admin.from('games')
      .insert({ code, host_id: state.hostId, status: 'lobby', state: publicState(state) as never, mode: state.mode, mode_ref: state.modeRef })
      .select('id').single();
    if (error) {
      if (error.code === '23505') continue;
      throw error;
    }
    try {
      const version = await commit(admin, data.id, 0, null, state);
      if (version === 'conflict') throw new Error('New game was modified concurrently.');
    } catch (err) {
      // Never leave a half-created game without players behind.
      await admin.from('games').delete().eq('id', data.id);
      throw err;
    }
    return ok({ id: data.id, code });
  }
  return fail('Konnte keinen Raum-Code erzeugen. Bitte nochmal versuchen.');
}

/** Campaign progress and daily results are booked when a solo game ends. */
async function afterFinish(admin: AdminClient, gameId: string, state: GameState) {
  if (state.mode === 'normal') return;
  const human = state.players.find((p) => !p.bot);
  if (!human || human.left) return;
  const place = placements(state)[human.id] ?? 99;
  if (state.mode === 'campaign' && place === 1) {
    const level = Number(state.modeRef);
    const { data } = await admin.from('profiles').select('campaign_level').eq('id', human.id).maybeSingle();
    if (data && Number.isInteger(level) && data.campaign_level < level) {
      await admin.from('profiles').update({ campaign_level: level }).eq('id', human.id);
    }
  }
  if (state.mode === 'daily' && state.modeRef) {
    await admin.from('daily_results').upsert(
      { day: state.modeRef, user_id: human.id, game_id: gameId, points: state.points[human.id] ?? 0, place },
      { onConflict: 'day,user_id', ignoreDuplicates: true },
    );
  }
}

/** A solo game against bots that starts right away (campaign stage or daily challenge). */
export async function createSoloGame(
  admin: AdminClient, userId: string,
  options: { mode: 'campaign' | 'daily'; ref: string; settings: Settings; bots: BotLevel[]; seed?: number; deckId?: string | null },
): Promise<ServiceResult<{ code: string }>> {
  let state = createGameState(userId, options.settings);
  state.players[0].deckId = options.deckId ?? null;
  state.mode = options.mode;
  state.modeRef = options.ref;
  state.seed = options.seed ?? null;
  for (const level of options.bots) {
    const res = applyAction(state, userId, { type: 'addBot', level }, rand);
    if (!res.ok) return fail(res.error);
    state = res.state;
  }
  const started = applyAction(state, userId, { type: 'start' }, rand);
  if (!started.ok) return fail(started.error);
  const created = await insertGame(admin, started.state);
  return created.ok ? ok({ code: created.data.code }) : created;
}

/** Any game (also left or finished) of a solo kind for this user – each daily challenge allows one attempt. */
export async function hasSoloGame(admin: AdminClient, userId: string, mode: 'campaign' | 'daily', ref: string): Promise<boolean> {
  const { data } = await admin.from('games').select('id, game_players!inner(user_id)')
    .eq('mode', mode).eq('mode_ref', ref).eq('game_players.user_id', userId).limit(1);
  return (data?.length ?? 0) > 0;
}

/** Unfinished solo game of this kind, so a reload continues instead of starting over. */
export async function findOpenSoloGame(admin: AdminClient, userId: string, mode: 'campaign' | 'daily', ref: string): Promise<string | null> {
  const { data } = await admin.from('games').select('code, game_players!inner(user_id, left_game)')
    .eq('mode', mode).eq('mode_ref', ref).eq('status', 'playing')
    .eq('game_players.user_id', userId).eq('game_players.left_game', false).limit(1);
  return data?.[0]?.code ?? null;
}

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = 0;

/**
 * Closes tables nobody plays at any more (see isStale). Deleting a game cascades to its players,
 * hands, chat and invites; anyone still watching gets the realtime DELETE and is sent home.
 * Runs lazily (home page, new tables) at most every 10 minutes per server instance.
 */
export async function closeStaleGames(admin: AdminClient, now = Date.now(), force = false): Promise<number> {
  if (!force && now - lastCleanup < CLEANUP_INTERVAL_MS) return 0;
  lastCleanup = now;
  const oldest = new Date(now - LOBBY_IDLE_HOURS * 3600_000).toISOString();
  const { data, error } = await admin.from('games')
    .select('id, status, created_at, started_at, wait:state->>waitSince')
    .in('status', ['lobby', 'playing']).lt('created_at', oldest).limit(500);
  if (error) throw error;
  const stale = data
    .filter((g) => isStale({ status: g.status, createdAt: g.created_at, startedAt: g.started_at, waitSince: (g.wait as string | null) ?? null }, now))
    .map((g) => g.id);
  if (stale.length === 0) return 0;
  const { error: delError } = await admin.from('games').delete().in('id', stale);
  if (delError) throw delError;
  return stale.length;
}

/** Cleanup must never break the page that triggered it. */
export async function closeStaleGamesQuietly(admin: AdminClient) {
  try {
    await closeStaleGames(admin);
  } catch (err) {
    console.error('closeStaleGames failed', err);
  }
}

export async function createGame(admin: AdminClient, userId: string, deckId: string | null = null) {
  await closeStaleGamesQuietly(admin);
  const state = createGameState(userId);
  state.players[0].deckId = deckId;
  return insertGame(admin, state);
}

/**
 * A player removed from the lobby loses their game_players row and with it (RLS) every further update.
 * They get a broadcast instead; the client verifies it by refetching (broadcasts are not trusted).
 */
async function notifyKicked(admin: AdminClient, gameId: string, userId: string) {
  const channel = admin.channel(`game:${gameId}`, { config: { private: true } });
  try {
    await channel.httpSend('kicked', { userId });
  } catch {
    // Not critical: the player notices on the next reload.
  } finally {
    await admin.removeChannel(channel);
  }
}

/**
 * Expected state for an action: a version (lobby actions) or a move sequence (moves in a running game).
 * Protects against double clicks and actions based on an outdated view.
 */
export type Expectation = number | { moveSeq: number };

function matches(game: GameRow, expected: Expectation): boolean {
  if (typeof expected === 'number') return game.version === expected;
  return game.state.moveSeq === expected.moveSeq;
}

export interface ActionOutcome { version: number; state: PublicState; hand: PrivateHand }

/**
 * Applies an action. With an expectation a mismatch yields STALE. Version conflicts while saving are
 * retried – except for an expected version; a move sequence is re-checked on retry.
 */
export async function performAction(
  admin: AdminClient, userId: string, gameId: string, action: GameAction, expected?: Expectation,
): Promise<ServiceResult<ActionOutcome>> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const game = await loadGame(admin, gameId);
    if (!game) return fail('Spiel nicht gefunden.');
    if (expected !== undefined && !matches(game, expected)) return fail(STALE);

    const res = applyAction(game.state, userId, action, rand);
    if (!res.ok) return fail(res.error);
    if (res.state === game.state) {
      return ok({ version: game.version, state: publicState(game.state), hand: privateHand(game.state, userId) });
    }
    // Without human players commit_game deletes the game (atomically, version-checked).
    const version = await commit(admin, gameId, game.version, game.state, res.state);
    if (version !== 'conflict') {
      if (action.type === 'removePlayer' && game.state.status === 'lobby') await notifyKicked(admin, gameId, action.playerId);
      if (res.state.status === 'finished' && game.state.status !== 'finished') await afterFinish(admin, gameId, res.state);
      return ok({ version, state: publicState(res.state), hand: privateHand(res.state, userId) });
    }
    if (typeof expected === 'number') return fail(STALE);
  }
  return fail('Gleichzeitige Aktion – bitte nochmal versuchen.');
}

export async function joinGame(admin: AdminClient, userId: string, code: string): Promise<ServiceResult<{ code: string }>> {
  const game = await loadGameByCode(admin, code);
  if (!game) return fail('Kein Spiel mit diesem Code gefunden.');
  const res = await performAction(admin, userId, game.id, { type: 'join' });
  return res.ok ? ok({ code: game.code }) : res;
}

export async function requestRematch(admin: AdminClient, userId: string, gameId: string): Promise<ServiceResult<{ code: string }>> {
  const game = await loadGame(admin, gameId);
  if (!game) return fail('Spiel nicht gefunden.');
  if (game.state.status !== 'finished') return fail('Das Spiel ist noch nicht beendet.');
  if (!game.state.players.some((p) => p.id === userId && !p.left)) return fail('Du warst nicht in diesem Spiel.');

  const existing = async (id: string | null) => (id ? loadGame(admin, id) : null);
  const already = await existing(game.rematchGameId);
  if (already) return ok({ code: already.code });

  const created = await insertGame(admin, createRematchState(userId, game.state));
  if (!created.ok) return created;

  const { data } = await admin.from('games')
    .update({ rematch_game_id: created.data.id })
    .eq('id', gameId).is('rematch_game_id', null).select('id');
  if (data && data.length > 0) return ok({ code: created.data.code });

  // Someone else was faster: drop our game and use theirs.
  await admin.from('games').delete().eq('id', created.data.id);
  const winner = await existing((await loadGame(admin, gameId))?.rematchGameId ?? null);
  return winner ? ok({ code: winner.code }) : fail('Revanche konnte nicht erstellt werden.');
}

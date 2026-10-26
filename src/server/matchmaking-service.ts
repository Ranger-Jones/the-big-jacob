import { randomInt } from 'node:crypto';
import { applyAction, createPublicLobbyState, type GameState } from '@/lib/jakob/engine';
import { PUBLIC_MAX_HUMANS } from '@/lib/jakob/types';
import type { AdminClient } from '@/lib/supabase/admin';
import { insertGame, joinGame, loadGame, performAction } from './game-service';
import { fail, ok, type ServiceResult } from './result';

const rand = (max: number) => randomInt(max);

/** The open lobby or running public game this user is already part of. */
async function currentPublicGame(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await admin.from('games').select('code, status, game_players!inner(user_id, left_game)')
    .eq('mode', 'public').in('status', ['lobby', 'playing'])
    .eq('game_players.user_id', userId).eq('game_players.left_game', false)
    .order('created_at', { ascending: false }).limit(1);
  return data?.[0]?.code ?? null;
}

/**
 * "Online spielen": joins the oldest open lobby that still has room, or opens a new one.
 * Players already waiting or playing in a public game are sent back there.
 */
export async function findOrCreatePublicLobby(
  admin: AdminClient, userId: string, deckId: string | null,
): Promise<ServiceResult<{ code: string; created: boolean }>> {
  const existing = await currentPublicGame(admin, userId);
  if (existing) return ok({ code: existing, created: false });

  const { data: open, error } = await admin.from('games').select('id, code')
    .eq('mode', 'public').eq('status', 'lobby').order('created_at', { ascending: true }).limit(10);
  if (error) throw error;
  for (const lobby of open ?? []) {
    const game = await loadGame(admin, lobby.id);
    if (!game || game.state.status !== 'lobby') continue;
    // Overdue lobby whose players' browsers are gone: start it now (bots fill up) instead of joining late.
    if (game.state.autoStartAt && Date.now() > Date.parse(game.state.autoStartAt) + 15_000) {
      await startDuePublicLobby(admin, lobby.id, game.state.hostId);
      continue;
    }
    const humans = game.state.players.filter((p) => !p.bot && !p.left).length;
    if (humans >= PUBLIC_MAX_HUMANS || game.state.banned.includes(userId)) continue;
    const joined = await joinGame(admin, userId, lobby.code);
    if (!joined.ok) continue;
    if (deckId) await performAction(admin, userId, lobby.id, { type: 'setDeck', deckId });
    return ok({ code: lobby.code, created: false });
  }

  const state: GameState = createPublicLobbyState(userId);
  state.players[0].deckId = deckId;
  const created = await insertGame(admin, state);
  return created.ok ? ok({ code: created.data.code, created: true }) : fail(created.error);
}

/** Numbers for the "Online spielen" card: people waiting right now and tables in play. */
export async function publicLobbyStats(admin: AdminClient): Promise<{ waiting: number; playing: number }> {
  const [{ data: lobbies }, { count }] = await Promise.all([
    admin.from('games').select('state').eq('mode', 'public').eq('status', 'lobby').limit(50),
    admin.from('games').select('id', { count: 'exact', head: true }).eq('mode', 'public').eq('status', 'playing'),
  ]);
  const waiting = (lobbies ?? []).reduce((n, g) => {
    const players = (g.state as { players?: { bot?: unknown; left?: boolean }[] }).players ?? [];
    return n + players.filter((p) => !p.bot && !p.left).length;
  }, 0);
  return { waiting, playing: count ?? 0 };
}

/** Starts an open lobby whose time is up (used when nobody's browser is there to trigger it). */
export async function startDuePublicLobby(admin: AdminClient, gameId: string, userId: string) {
  const game = await loadGame(admin, gameId);
  if (!game || game.state.mode !== 'public' || game.state.status !== 'lobby') return;
  if (!applyAction(game.state, userId, { type: 'autoStart' }, rand).ok) return;
  await performAction(admin, userId, gameId, { type: 'autoStart' });
}

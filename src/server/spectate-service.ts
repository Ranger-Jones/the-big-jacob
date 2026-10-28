import type { AdminClient } from '@/lib/supabase/admin';
import type { GameRow } from './game-service';
import { fail, ok, type ServiceResult } from './result';
import type { ProfileLite } from './social-service';

export interface FriendTable {
  code: string;
  friend: ProfileLite;
  /** Every friend at this table (the app marks each of them as "spielt gerade"). */
  friendIds: string[];
  round: number;
  players: number;
  status: 'lobby' | 'playing';
}

async function friendIds(admin: AdminClient, userId: string): Promise<string[]> {
  const { data, error } = await admin.from('friendships').select('requester_id, addressee_id')
    .eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  return data.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
}

/** Friends may watch; so may anyone invited to the table. */
export async function canSpectate(admin: AdminClient, userId: string, game: GameRow): Promise<ServiceResult> {
  if (game.state.players.some((p) => p.id === userId)) return fail('Du sitzt selbst an diesem Tisch.');
  if (game.state.status !== 'playing') return fail('Zuschauen geht nur bei laufenden Spielen.');
  const friends = new Set(await friendIds(admin, userId));
  if (game.state.players.some((p) => !p.bot && !p.left && friends.has(p.id))) return ok(undefined);
  const { data } = await admin.from('game_invites').select('id').eq('game_id', game.id).eq('to_id', userId).limit(1);
  return data && data.length > 0 ? ok(undefined) : fail('Zuschauen können nur Freunde der Spieler.');
}

export async function addSpectator(admin: AdminClient, userId: string, gameId: string) {
  const { error } = await admin.from('game_spectators').upsert({ game_id: gameId, user_id: userId }, { onConflict: 'game_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Running normal games of your friends (for "Freunde am Tisch"). */
export async function listFriendTables(admin: AdminClient, userId: string): Promise<FriendTable[]> {
  const ids = await friendIds(admin, userId);
  if (ids.length === 0) return [];
  const { data, error } = await admin.from('game_players')
    .select('user_id, games!inner(code, status, mode, state), profiles(id, username, avatar_url, avatar_frame)')
    .in('user_id', ids).eq('left_game', false).eq('games.status', 'playing').eq('games.mode', 'normal');
  if (error) throw error;
  const byCode = new Map<string, FriendTable>();
  const mine = new Set<string>();
  const { data: own } = await admin.from('game_players').select('games!inner(code, status)').eq('user_id', userId).eq('games.status', 'playing');
  for (const r of own ?? []) mine.add((r.games as unknown as { code: string }).code);
  for (const r of data) {
    const g = r.games as unknown as { code: string; status: 'playing'; state: { round: number; players: { left: boolean }[] } };
    if (mine.has(g.code)) continue;
    const known = byCode.get(g.code);
    if (known) {
      known.friendIds.push(r.user_id);
      continue;
    }
    byCode.set(g.code, {
      code: g.code, friend: r.profiles as ProfileLite, friendIds: [r.user_id], round: g.state.round,
      players: g.state.players.filter((p) => !p.left).length, status: g.status,
    });
  }
  return [...byCode.values()];
}

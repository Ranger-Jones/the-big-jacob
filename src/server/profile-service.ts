import { placements } from '@/lib/jakob/engine';
import { isValidQuickEmojis, normalizeQuickEmojis } from '@/lib/emojis';
import type { AdminClient } from '@/lib/supabase/admin';
import { USERNAME_RE } from '@/lib/username';
import { fail, ok, type ServiceResult } from './result';
import type { ProfileLite } from './social-service';

export { USERNAME_RE };

export interface PlayerStats {
  user_id: string; username: string; avatar_url: string | null;
  games_played: number; wins: number; total_points: number; best_points: number; avg_place: number;
  crowns: number; servant: number; revolutions: number; grand_revolutions: number; bombs: number;
  rises: number; cards_played: number;
}

export interface HistoryEntry {
  gameId: string;
  finishedAt: string;
  rounds: number;
  bots: { name: string; emoji: string; points: number; place: number }[];
  players: { profile: ProfileLite; points: number; place: number | null; left: boolean }[];
}

export async function isUsernameTaken(admin: AdminClient, username: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('id').eq('username', username.trim()).maybeSingle();
  return !!data;
}

export async function getStatsByUsername(admin: AdminClient, username: string): Promise<PlayerStats | null> {
  if (!USERNAME_RE.test(username)) return null;
  const { data, error } = await admin.from('player_stats').select('*').ilike('username', username.replace(/_/g, '\\_')).maybeSingle();
  if (error) throw error;
  return data as PlayerStats | null;
}

export async function getLeaderboard(admin: AdminClient, limit = 50): Promise<PlayerStats[]> {
  const { data, error } = await admin.from('leaderboard').select('*')
    .order('wins', { ascending: false }).order('crowns', { ascending: false }).order('total_points', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as PlayerStats[];
}

type FinishedState = { history?: { round: number }[]; points?: Record<string, number>; players?: { id: string; bot?: { name: string; emoji: string }; left: boolean }[] };

export async function getHistory(admin: AdminClient, userId: string, limit = 20): Promise<HistoryEntry[]> {
  const { data: mine, error } = await admin.from('game_players')
    .select('game_id, games!inner(status, finished_at)')
    .eq('user_id', userId).eq('games.status', 'finished');
  if (error) throw error;
  const recent = mine
    .map((m) => ({ gameId: m.game_id, finishedAt: (m.games as { finished_at: string }).finished_at }))
    .sort((x, y) => y.finishedAt.localeCompare(x.finishedAt))
    .slice(0, limit);
  if (recent.length === 0) return [];
  const ids = recent.map((r) => r.gameId);
  const [{ data: rows, error: e2 }, { data: games, error: e3 }] = await Promise.all([
    admin.from('game_players').select('game_id, points, place, left_game, seat, profiles(id, username, avatar_url)').in('game_id', ids),
    admin.from('games').select('id, state').in('id', ids),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  return recent.map((g) => {
    const state = (games.find((x) => x.id === g.gameId)?.state ?? {}) as FinishedState;
    const humans = rows.filter((r) => r.game_id === g.gameId);
    const places = state.players ? placements(state as Parameters<typeof placements>[0]) : {};
    const bots = (state.players ?? []).filter((p) => p.bot && !p.left).map((p) => ({
      name: p.bot!.name, emoji: p.bot!.emoji, points: state.points?.[p.id] ?? 0, place: places[p.id] ?? 0,
    }));
    return {
      ...g,
      rounds: state.history?.length ?? 0,
      bots,
      players: humans
        .sort((x, y) => (x.place ?? 99) - (y.place ?? 99) || x.seat - y.seat)
        .map((r) => ({ profile: r.profiles as ProfileLite, points: r.points, place: r.place, left: r.left_game })),
    };
  });
}

export async function renameUser(admin: AdminClient, userId: string, username: string): Promise<ServiceResult> {
  const name = username.trim();
  if (!USERNAME_RE.test(name)) return fail('Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen und _.');
  const { data: other } = await admin.from('profiles').select('id').eq('username', name).maybeSingle();
  if (other && other.id !== userId) return fail('Benutzername ist schon vergeben.');
  const { error } = await admin.from('profiles').update({ username: name }).eq('id', userId);
  if (error) return fail('Benutzername ist schon vergeben.');
  return ok(undefined);
}

/** Only objects directly in the user's own avatar folder, without encodings, query or fragment. */
function isOwnAvatarUrl(raw: string, userId: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const prefix = `/storage/v1/object/public/avatars/${userId}/`;
  const file = url.pathname.slice(prefix.length);
  return url.origin === origin && !raw.includes('%') && !url.search && !url.hash
    && url.pathname.startsWith(prefix) && /^[A-Za-z0-9._-]+$/.test(file) && !file.startsWith('.');
}

/** Clean up old avatars in the user's folder (storage on the free tier is scarce). */
async function removeOtherAvatars(admin: AdminClient, userId: string, keep: string) {
  const { data } = await admin.storage.from('avatars').list(userId, { limit: 100 });
  const old = (data ?? []).filter((f) => f.name !== keep).map((f) => `${userId}/${f.name}`);
  if (old.length > 0) await admin.storage.from('avatars').remove(old);
}

export async function setAvatarUrl(admin: AdminClient, userId: string, url: string): Promise<ServiceResult> {
  if (!isOwnAvatarUrl(url, userId)) return fail('Ungültige Bild-URL.');
  const { error } = await admin.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) throw error;
  await removeOtherAvatars(admin, userId, url.split('/').pop()!);
  return ok(undefined);
}

export async function removeAvatar(admin: AdminClient, userId: string): Promise<ServiceResult> {
  const { error } = await admin.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw error;
  await removeOtherAvatars(admin, userId, '');
  return ok(undefined);
}

export async function listActiveGames(admin: AdminClient, userId: string) {
  const { data, error } = await admin.from('game_players')
    .select('left_game, games!inner(code, status, state)')
    .eq('user_id', userId).eq('left_game', false).in('games.status', ['lobby', 'playing']);
  if (error) throw error;
  return data.map((r) => {
    const g = r.games as unknown as { code: string; status: 'lobby' | 'playing'; state: { players: { left: boolean }[]; round: number } };
    return { code: g.code, status: g.status, round: g.state.round, playerCount: g.state.players.filter((p) => !p.left).length };
  });
}

export async function getQuickEmojis(admin: AdminClient, userId: string): Promise<string[]> {
  const { data } = await admin.from('profiles').select('quick_emojis').eq('id', userId).maybeSingle();
  return normalizeQuickEmojis(data?.quick_emojis);
}

export async function setQuickEmojis(admin: AdminClient, userId: string, emojis: unknown): Promise<ServiceResult> {
  if (!isValidQuickEmojis(emojis)) return fail('Bitte genau 6 verschiedene Emojis auswählen.');
  const { error } = await admin.from('profiles').update({ quick_emojis: emojis }).eq('id', userId);
  if (error) throw error;
  return ok(undefined);
}

export interface Badge { id: string; emoji: string; title: string; hint: string; earned: boolean }

/** Achievements derived from the aggregated statistics. */
export function badgesFor(s: PlayerStats): Badge[] {
  const list: [string, string, string, string, boolean][] = [
    ['first-game', '🎴', 'Hoffähig', 'Ein Spiel beendet', s.games_played >= 1],
    ['first-win', '🏆', 'Thronfolger', 'Ein Spiel gewonnen', s.wins >= 1],
    ['ten-wins', '🏰', 'Dynastie', '10 Spiele gewonnen', s.wins >= 10],
    ['crowns', '👑', 'Kronensammler', '10 Runden als Großer Jakob', s.crowns >= 10],
    ['servant', '🧹', 'Demut', '10 Runden als Großer Knecht', s.servant >= 10],
    ['revolution', '✊', 'Revolutionär', 'Eine Revolution ausgerufen', s.revolutions + s.grand_revolutions >= 1],
    ['grand', '🔥', 'Umsturz', 'Eine Große Revolution ausgerufen', s.grand_revolutions >= 1],
    ['bomb', '💣', 'Sprengmeister', 'Eine Bombe gelegt', s.bombs >= 1],
    ['rise', '🪜', 'Vom Knecht zum König', 'Als Großer Knecht die nächste Runde gewonnen', s.rises >= 1],
    ['cards', '🃏', 'Kartenhai', '1000 Karten gespielt', s.cards_played >= 1000],
  ];
  return list.map(([id, emoji, title, hint, earned]) => ({ id, emoji, title, hint, earned }));
}

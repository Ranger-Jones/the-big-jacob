import { placements, type GameState } from '@/lib/jakob/engine';
import { BOT_RATING, eloDeltas, experienceFor, START_RATING, type RatedParticipant } from '@/lib/jakob/rating';
import type { AdminClient } from '@/lib/supabase/admin';

/** Normal and public games move the Elo rating; solo modes only give experience. */
export function isRated(state: Pick<GameState, 'mode'>): boolean {
  return state.mode === 'normal' || state.mode === 'public';
}

/**
 * Who counts as an opponent in the rating. In the open lobby the seats and bots are assigned by the
 * matchmaking, so bots count at their fixed strength. In private games the host picks the bots and the
 * rules, so only humans count – and only if at least two of them played to the end. This keeps Elo from
 * being farmed against hand-picked easy bots.
 */
export function ratedParticipants(state: GameState): GameState['players'] {
  const kicked = new Set(state.kicked ?? []);
  const field = state.players.filter((p) => !kicked.has(p.id));
  if (state.mode === 'public') return field;
  const humans = field.filter((p) => !p.bot);
  return humans.filter((p) => !p.left).length >= 2 ? humans : [];
}

/**
 * Books Elo and experience for a finished game. Safe to call more than once: the database books every
 * player at most once per game.
 */
export async function bookGameResults(admin: AdminClient, gameId: string, state: GameState) {
  // A game that ended before the first round was over (everyone left) is not booked.
  if (state.history.length === 0) return;
  const kicked = new Set(state.kicked ?? []);
  const humans = state.players.filter((p) => !p.bot && !kicked.has(p.id));
  if (humans.length === 0) return;

  const { data: profiles, error } = await admin.from('profiles').select('id, rating, rated_games').in('id', humans.map((p) => p.id));
  if (error) throw error;
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const places = placements(state);
  const field = isRated(state) ? ratedParticipants(state) : [];
  const participants: RatedParticipant[] = field.map((p) => ({
    id: p.id,
    rating: p.bot ? BOT_RATING[p.bot.level] : byId.get(p.id)?.rating ?? START_RATING,
    place: places[p.id] ?? state.players.length,
    human: !p.bot,
    games: p.bot ? 0 : byId.get(p.id)?.rated_games ?? 0,
  }));
  const deltas = participants.length >= 2 ? eloDeltas(participants) : {};
  const vsHumans = humans.filter((p) => !p.left).length > 1;

  const entries = humans.filter((p) => byId.has(p.id)).map((p) => {
    const stats = state.stats[p.id];
    return {
      userId: p.id,
      rated: p.id in deltas,
      delta: deltas[p.id] ?? 0,
      place: places[p.id] ?? null,
      players: state.players.length,
      xp: experienceFor({
        place: places[p.id] ?? state.players.length,
        players: state.players.length,
        left: p.left,
        crowns: stats?.crowns ?? 0,
        missions: stats?.missions ?? 0,
        revolutions: (stats?.revolutions ?? 0) + (stats?.grandRevolutions ?? 0),
        vsHumans,
      }),
    };
  });
  if (entries.length === 0) return;
  const { error: e2 } = await admin.rpc('apply_game_results', { p_game_id: gameId, p_entries: entries as never });
  if (e2) throw e2;
}

export interface RatingRow {
  user_id: string; username: string; avatar_url: string | null; avatar_frame: string | null;
  rating: number; peak_rating: number; rated_games: number; xp: number; wins: number; games_played: number;
}

/** Elo leaderboard: players with at least one rated game. */
export async function getRatingLeaderboard(admin: AdminClient, limit = 50): Promise<RatingRow[]> {
  const { data, error } = await admin.from('leaderboard')
    .select('user_id, username, avatar_url, avatar_frame, rating, peak_rating, rated_games, xp, wins, games_played')
    .gt('rated_games', 0)
    .order('rating', { ascending: false }).order('rated_games', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as RatingRow[];
}

export interface RatingSummary {
  rating: number; peakRating: number; ratedGames: number; xp: number;
  history: { gameId: string; delta: number; ratingAfter: number; xp: number; place: number | null; createdAt: string }[];
}

export async function getRatingSummary(admin: AdminClient, userId: string): Promise<RatingSummary | null> {
  const [{ data: profile }, { data: rows }] = await Promise.all([
    admin.from('profiles').select('rating, peak_rating, rated_games, xp').eq('id', userId).maybeSingle(),
    admin.from('rating_history').select('game_id, delta, rating_after, xp, place, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  if (!profile) return null;
  return {
    rating: profile.rating, peakRating: profile.peak_rating, ratedGames: profile.rated_games, xp: profile.xp,
    history: (rows ?? []).reverse().map((r) => ({
      gameId: r.game_id, delta: r.delta, ratingAfter: r.rating_after, xp: r.xp, place: r.place, createdAt: r.created_at,
    })),
  };
}

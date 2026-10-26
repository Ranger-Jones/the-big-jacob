'use client';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export interface RatingInfo { rating: number; xp: number; ratedGames: number }

/** Elo and experience of the given people (refetched when the list or `refresh` changes). */
export function useRatings(ids: string[], refresh: unknown = null): Record<string, RatingInfo> {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const key = [...ids].sort().join(',');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    supabase.from('profiles').select('id, rating, xp, rated_games').in('id', key.split(',')).then(({ data }) => {
      if (cancelled || !data) return;
      setRatings(Object.fromEntries(data.map((r) => [r.id, { rating: r.rating, xp: r.xp, ratedGames: r.rated_games }])));
    });
    return () => {
      cancelled = true;
    };
  }, [key, refresh, supabase]);
  return ratings;
}

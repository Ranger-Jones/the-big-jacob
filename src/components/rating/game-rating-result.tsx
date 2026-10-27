'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { fireConfetti } from '@/lib/confetti';
import { useT } from '@/lib/i18n/client';
import { levelFromXp, levelProgress, levelTitle, tierFor } from '@/lib/jakob/rating';
import { playSound } from '@/lib/sound';
import { createBrowserSupabase } from '@/lib/supabase/browser';

interface Booking { rated: boolean; rating_before: number; rating_after: number; delta: number; xp: number }

/** Elo change and experience earned in this game, with a level-up moment. */
export function GameRatingResult({ gameId, me }: { gameId: string; me: string }) {
  const t = useT();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const reduce = useReducedMotion();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [xpTotal, setXpTotal] = useState<number | null>(null);

  // The booking happens right after the last move; retry a few times in case we are faster.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function load() {
      const [{ data }, { data: profile }] = await Promise.all([
        supabase.from('rating_history').select('rated, rating_before, rating_after, delta, xp').eq('game_id', gameId).eq('user_id', me).maybeSingle(),
        supabase.from('profiles').select('xp').eq('id', me).maybeSingle(),
      ]);
      if (cancelled) return;
      if (data) {
        setBooking(data);
        setXpTotal(profile?.xp ?? null);
      } else if (++tries < 6) setTimeout(load, 1200);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId, me, supabase]);

  const levelUp = booking && xpTotal !== null && levelFromXp(xpTotal) > levelFromXp(xpTotal - booking.xp);
  useEffect(() => {
    if (!levelUp) return;
    playSound('crown');
    void fireConfetti('crown');
  }, [levelUp]);

  if (!booking || xpTotal === null) return null;
  const before = levelProgress(xpTotal - booking.xp);
  const after = levelProgress(xpTotal);
  const tierBefore = tierFor(booking.rating_before);
  const tierAfter = tierFor(booking.rating_after);
  const promoted = tierAfter.min > tierBefore.min;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {booking.rated && (
        <div className="flex items-center gap-3 rounded-2xl bg-velvet-deep/70 p-4 ring-2 ring-white/10">
          <span className="text-4xl" aria-hidden>{tierAfter.emoji}</span>
          <span className="min-w-0">
            <span className="block text-xs text-parchment/70">{t('Elo-Wertung')}</span>
            <span className="block font-display text-3xl font-bold tabular">
              {booking.rating_after}
              <span className={booking.delta >= 0 ? 'ml-2 text-vert brightness-150' : 'ml-2 text-wax brightness-150'}>
                {booking.delta >= 0 ? `+${booking.delta}` : booking.delta}
              </span>
            </span>
            <span className="block text-sm text-parchment/80">{promoted ? t('Aufgestiegen: {tier}!', { tier: t(tierAfter.name) }) : t(tierAfter.name)}</span>
          </span>
        </div>
      )}
      <div className="flex flex-col justify-center gap-1.5 rounded-2xl bg-velvet-deep/70 p-4 ring-2 ring-white/10">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-2xl font-bold">
            {levelUp ? t('Level {level}!', { level: after.level }) : t('Level {level}', { level: after.level })}
            <span className="ml-2 font-sans text-sm font-normal text-parchment/70">{t(levelTitle(after.level))}</span>
          </span>
          <span className="font-bold text-gold-soft">+{booking.xp} XP</span>
        </span>
        <span className="relative h-3 overflow-hidden rounded-full bg-white/10" aria-label={t('{current} von {needed} XP bis Level {level}', { current: after.current, needed: after.needed, level: after.level + 1 })}>
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-deep via-gold to-gold-soft"
            initial={{ width: `${(levelUp ? 0 : before.fraction) * 100}%` }}
            animate={{ width: `${after.fraction * 100}%` }}
            transition={{ duration: reduce ? 0 : 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </span>
        <span className="text-xs text-parchment/70">{t('{current} / {needed} XP bis Level {level}', { current: after.current, needed: after.needed, level: after.level + 1 })}</span>
      </div>
    </div>
  );
}

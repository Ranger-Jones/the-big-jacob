import { cx } from '@/lib/cx';
import { levelFromXp, PROVISIONAL_GAMES, tierFor } from '@/lib/jakob/rating';

/** "🛡️ 1134 · Lv 7" – compact Elo tier and level. */
export function RatingBadge({ rating, xp, ratedGames, className }: { rating: number; xp: number; ratedGames: number; className?: string }) {
  const tier = tierFor(rating);
  const provisional = ratedGames < PROVISIONAL_GAMES;
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold tabular', className)} title={`${tier.name} · ${rating} Elo${provisional ? ' (vorläufig)' : ''} · Level ${levelFromXp(xp)}`}>
      <span aria-hidden>{tier.emoji}</span>
      <span>{rating}{provisional ? '?' : ''}</span>
      <span className="opacity-60">·</span>
      <span>Lv {levelFromXp(xp)}</span>
    </span>
  );
}

/** Small round level badge on top of an avatar. */
export function LevelPip({ xp, className }: { xp: number; className?: string }) {
  return (
    <span
      className={cx('flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-display text-[0.7rem] font-bold leading-none text-ink ring-2 ring-velvet shadow', className)}
      title={`Level ${levelFromXp(xp)}`}
    >
      {levelFromXp(xp)}
    </span>
  );
}

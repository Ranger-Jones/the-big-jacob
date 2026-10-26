import { cx } from '@/lib/cx';
import type { PlayerStats } from '@/server/profile-service';

const TILES = [
  { key: 'games', label: 'Spiele', color: '#3a6fd8' },
  { key: 'wins', label: 'Siege', color: '#2f9e62' },
  { key: 'rate', label: 'Siegquote', color: '#8b4fc7' },
  { key: 'crowns', label: 'Kronen', color: '#f4b73a' },
  { key: 'revolutions', label: 'Revolutionen', color: '#c8323c' },
  { key: 'place', label: 'Ø Platz', color: '#e46aa0' },
] as const;

export function StatsGrid({ stats, compact = false }: { stats: PlayerStats; compact?: boolean }) {
  const values: Record<(typeof TILES)[number]['key'], string> = {
    games: String(stats.games_played),
    wins: String(stats.wins),
    rate: stats.games_played ? `${Math.round((stats.wins / stats.games_played) * 100)} %` : '–',
    crowns: String(stats.crowns),
    revolutions: String(stats.revolutions + stats.grand_revolutions),
    place: stats.games_played ? stats.avg_place.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–',
  };
  return (
    <dl className={cx('grid gap-2.5', compact ? 'grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3')}>
      {TILES.map((t) => (
        <div
          key={t.key}
          className="flex min-w-0 flex-col-reverse rounded-[1.1rem] bg-velvet-deep/50 px-3 py-2.5 text-parchment ring-1 ring-gold/20"
          style={{ boxShadow: `inset 0 -3px 0 ${t.color}` }}
        >
          <dt className="truncate text-sm font-bold text-parchment/65">{t.label}</dt>
          <dd data-testid={`stat-${t.key}`} className={cx('tabular whitespace-nowrap font-display font-bold text-gold-soft', compact ? 'text-2xl sm:text-3xl' : 'text-4xl')}>
            {values[t.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

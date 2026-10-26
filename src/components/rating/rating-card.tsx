import { Card } from '@/components/ui/card';
import { levelProgress, levelTitle, PROVISIONAL_GAMES, START_RATING, tierFor, TIERS } from '@/lib/jakob/rating';
import type { RatingSummary } from '@/server/rating-service';

const W = 320;
const H = 90;

/** Elo over the last rated games: one line, start rating as a faint guide, a hover title on every point. */
function RatingSparkline({ history }: { history: RatingSummary['history'] }) {
  const rated = history.filter((h) => h.delta !== 0 || h.ratingAfter !== START_RATING);
  if (rated.length < 2) return null;
  const values = rated.map((h) => h.ratingAfter);
  const min = Math.min(...values, START_RATING) - 10;
  const max = Math.max(...values, START_RATING) + 10;
  const x = (i: number) => 6 + (i / (rated.length - 1)) * (W - 12);
  const y = (v: number) => H - 6 - ((v - min) / (max - min)) * (H - 12);
  const path = rated.map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(h.ratingAfter).toFixed(1)}`).join(' ');
  const fmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeZone: 'Europe/Berlin' });
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={`Elo-Verlauf der letzten ${rated.length} Spiele, zuletzt ${values.at(-1)}`}>
        <line x1="0" x2={W} y1={y(START_RATING)} y2={y(START_RATING)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--color-gold-deep)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {rated.map((h, i) => (
          <g key={h.gameId}>
            <circle cx={x(i)} cy={y(h.ratingAfter)} r={i === rated.length - 1 ? 4 : 2.5} fill="var(--color-gold-deep)" stroke="var(--color-parchment)" strokeWidth="1.5" />
            {/* Bigger invisible hit target for the hover title */}
            <circle cx={x(i)} cy={y(h.ratingAfter)} r="9" fill="transparent">
              <title>{`${fmt.format(new Date(h.createdAt))}: ${h.ratingAfter} Elo (${h.delta >= 0 ? '+' : ''}${h.delta})${h.place ? ` · Platz ${h.place}` : ''}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-ink-soft">Elo der letzten {rated.length} gewerteten Spiele · gestrichelt: Startwert {START_RATING}</figcaption>
    </figure>
  );
}

/** Profile: Elo tier, level progress and the rating curve. */
export function RatingCard({ summary }: { summary: RatingSummary }) {
  const tier = tierFor(summary.rating);
  const next = TIERS.find((t) => t.min > summary.rating);
  const level = levelProgress(summary.xp);
  const provisional = summary.ratedGames < PROVISIONAL_GAMES;
  return (
    <Card className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col gap-3 sm:w-60">
        <div className="flex items-center gap-3">
          <span className="flex size-16 items-center justify-center rounded-full text-4xl ring-4" style={{ backgroundColor: `${tier.color}33`, boxShadow: `inset 0 0 0 3px ${tier.color}` }} aria-hidden>
            {tier.emoji}
          </span>
          <span>
            <span className="block font-display text-4xl font-bold leading-none tabular">{summary.rating}{provisional ? '?' : ''}</span>
            <span className="block font-bold text-ink-soft">{tier.name} · Elo</span>
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Bestwert {summary.peakRating} · {summary.ratedGames} gewertete {summary.ratedGames === 1 ? 'Partie' : 'Partien'}
          {provisional && ` · vorläufig, bis ${PROVISIONAL_GAMES} Partien gespielt sind`}
          {next && ` · noch ${next.min - summary.rating} bis ${next.emoji} ${next.name}`}
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold">Level {level.level} · {levelTitle(level.level)}</span>
          <span className="relative h-2.5 overflow-hidden rounded-full bg-ink-soft/20">
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${level.fraction * 100}%` }} />
          </span>
          <span className="text-xs text-ink-soft">{level.current} / {level.needed} XP bis Level {level.level + 1} · {summary.xp} XP insgesamt</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <RatingSparkline history={summary.history} />
        {summary.history.length < 2 && <p className="text-sm text-ink-soft">Nach ein paar gewerteten Spielen erscheint hier dein Elo-Verlauf.</p>}
      </div>
    </Card>
  );
}

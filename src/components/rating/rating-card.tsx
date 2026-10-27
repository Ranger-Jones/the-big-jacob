import { Card } from '@/components/ui/card';
import { intlLocale, type T } from '@/lib/i18n/core';
import { getLocale, getT } from '@/lib/i18n/server';
import { levelProgress, levelTitle, PROVISIONAL_GAMES, START_RATING, tierFor, TIERS } from '@/lib/jakob/rating';
import type { RatingSummary } from '@/server/rating-service';

const W = 320;
const H = 90;

/** Elo over the last rated games: one line, start rating as a faint guide, a hover title on every point. */
function RatingSparkline({ history, t, locale }: { history: RatingSummary['history']; t: T; locale: string }) {
  const rated = history.filter((h) => h.delta !== 0 || h.ratingAfter !== START_RATING);
  if (rated.length < 2) return null;
  const values = rated.map((h) => h.ratingAfter);
  const min = Math.min(...values, START_RATING) - 10;
  const max = Math.max(...values, START_RATING) + 10;
  const x = (i: number) => 6 + (i / (rated.length - 1)) * (W - 12);
  const y = (v: number) => H - 6 - ((v - min) / (max - min)) * (H - 12);
  const path = rated.map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(h.ratingAfter).toFixed(1)}`).join(' ');
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeZone: 'Europe/Berlin' });
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={t('Elo-Verlauf der letzten {n} Spiele, zuletzt {last}', { n: rated.length, last: values.at(-1) ?? '' })}>
        <line x1="0" x2={W} y1={y(START_RATING)} y2={y(START_RATING)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--color-gold-deep)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {rated.map((h, i) => (
          <g key={h.gameId}>
            <circle cx={x(i)} cy={y(h.ratingAfter)} r={i === rated.length - 1 ? 4 : 2.5} fill="var(--color-gold-deep)" stroke="var(--color-parchment)" strokeWidth="1.5" />
            {/* Bigger invisible hit target for the hover title */}
            <circle cx={x(i)} cy={y(h.ratingAfter)} r="9" fill="transparent">
              <title>{`${fmt.format(new Date(h.createdAt))}: ${h.ratingAfter} Elo (${h.delta >= 0 ? '+' : ''}${h.delta})${h.place ? ` · ${t('Platz {place}', { place: h.place })}` : ''}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-ink-soft">{t('Elo der letzten {n} gewerteten Spiele · gestrichelt: Startwert {start}', { n: rated.length, start: START_RATING })}</figcaption>
    </figure>
  );
}

/** Profile: Elo tier, level progress and the rating curve. */
export async function RatingCard({ summary }: { summary: RatingSummary }) {
  const t = await getT();
  const locale = intlLocale(await getLocale());
  const tier = tierFor(summary.rating);
  const next = TIERS.find((x) => x.min > summary.rating);
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
            <span className="block font-bold text-ink-soft">{t(tier.name)} · Elo</span>
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          {t('Bestwert {n}', { n: summary.peakRating })} · {summary.ratedGames === 1 ? t('{n} gewertete Partie', { n: summary.ratedGames }) : t('{n} gewertete Partien', { n: summary.ratedGames })}
          {provisional && ` · ${t('vorläufig, bis {n} Partien gespielt sind', { n: PROVISIONAL_GAMES })}`}
          {next && ` · ${t('noch {n} bis {emoji} {tier}', { n: next.min - summary.rating, emoji: next.emoji, tier: t(next.name) })}`}
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold">{t('Level {level}', { level: level.level })} · {t(levelTitle(level.level))}</span>
          <span className="relative h-2.5 overflow-hidden rounded-full bg-ink-soft/20">
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${level.fraction * 100}%` }} />
          </span>
          <span className="text-xs text-ink-soft">{t('{current} / {needed} XP bis Level {level}', { current: level.current, needed: level.needed, level: level.level + 1 })} · {t('{n} XP insgesamt', { n: summary.xp })}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <RatingSparkline history={summary.history} t={t} locale={locale} />
        {summary.history.length < 2 && <p className="text-sm text-ink-soft">{t('Nach ein paar gewerteten Spielen erscheint hier dein Elo-Verlauf.')}</p>}
      </div>
    </Card>
  );
}

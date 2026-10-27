import { PlayingCard } from '@/components/deck/playing-card';
import { Card } from '@/components/ui/card';
import { JESTER, RANK_NAMES } from '@/lib/jakob/cards';
import { PRESETS } from '@/lib/decks';
import { intlLocale } from '@/lib/i18n/core';
import { getLocale, getT } from '@/lib/i18n/server';
import type { DetailedStats } from '@/server/profile-service';
import { ColumnChart, LineChart } from './charts';

/** Placement distribution, favourite card and recent form on the profile. */
export async function DetailedStatsSection({ stats, isMe }: { stats: DetailedStats; isMe: boolean }) {
  const total = stats.placeCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const t = await getT();
  const locale = intlLocale(await getLocale());
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const played = stats.byRank.reduce((a, b) => a + b, 0);
  const favourite = stats.byRank.reduce((best, n, i) => (n > stats.byRank[best] ? i : best), 0) + 1;
  const podium = stats.placeCounts.slice(0, 3).reduce((a, b) => a + b, 0);
  const recent = stats.trend.slice(-10);
  const recentAvg = recent.reduce((a, t) => a + t.place, 0) / Math.max(1, recent.length);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-4xl font-bold">{t('Statistik')}</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">{t('Platzierungen')}</h3>
          <p className="-mt-1 text-sm text-ink-soft">{t(total === 1 ? '{pct} % auf dem Treppchen, aus {n} Spiel' : '{pct} % auf dem Treppchen, aus {n} Spielen', { pct: Math.round((podium / total) * 100), n: total })}</p>
          <ColumnChart
            labelAll tableHead={[t('Platz'), t('Spiele')]} unit={[t('{n} Spiel'), t('{n} Spiele')]}
            data={stats.placeCounts.map((n, i) => ({ label: t('Platz {place}', { place: i + 1 }), short: `${i + 1}.`, value: n }))}
          />
        </Card>
        {played > 0 && (
          <Card className="flex items-center gap-4 md:w-72 md:flex-col md:items-start">
            <PlayingCard rank={favourite} deck={PRESETS[0]} size="md" />
            <div>
              <h3 className="text-2xl font-bold">{t('Lieblingskarte')}</h3>
              <p className="font-display text-3xl font-bold">{t(RANK_NAMES[favourite])}</p>
              <p className="text-sm text-ink-soft">{t(isMe ? '{count}× gelegt, {pct} % deiner Karten' : '{count}× gelegt, {pct} % aller Karten', { count: stats.byRank[favourite - 1], pct: Math.round((stats.byRank[favourite - 1] / played) * 100) })}</p>
            </div>
          </Card>
        )}
      </div>

      {stats.trend.length >= 3 && (
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">{t('Formkurve')}</h3>
          <p className="-mt-1 text-sm text-ink-soft">
            {t('Punkte in den letzten {n} Spielen · zuletzt im Schnitt Platz {avg}', { n: stats.trend.length, avg: recentAvg.toLocaleString(locale, { maximumFractionDigits: 1 }) })}
          </p>
          <LineChart
            unit={[t('{n} Punkt'), t('{n} Punkte')]} tableHead={[t('Datum'), t('Platz'), t('Punkte')]}
            data={stats.trend.map((p) => ({ label: day(p.finishedAt), value: p.points, detail: `${p.players ? t('Platz {place} von {players}', { place: p.place, players: p.players }) : t('Platz {place}', { place: p.place })} · ${day(p.finishedAt)}` }))}
          />
        </Card>
      )}

      {played > 0 && (
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">{t('Gelegte Karten')}</h3>
          <p className="-mt-1 text-sm text-ink-soft">{t('{n} Karten insgesamt, nach Rang', { n: played })}</p>
          <ColumnChart
            tableHead={[t('Karte'), t('Gelegt')]} unit={[t('{n}× gelegt'), t('{n}× gelegt')]}
            data={stats.byRank.map((n, i) => ({ label: t(RANK_NAMES[i + 1]), short: i + 1 === JESTER ? 'N' : String(i + 1), value: n }))}
          />
        </Card>
      )}
    </section>
  );
}

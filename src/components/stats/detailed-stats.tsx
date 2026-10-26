import { PlayingCard } from '@/components/deck/playing-card';
import { Card } from '@/components/ui/card';
import { JESTER, RANK_NAMES } from '@/lib/jakob/cards';
import { PRESETS } from '@/lib/decks';
import type { DetailedStats } from '@/server/profile-service';
import { ColumnChart, LineChart } from './charts';

const games = (n: number) => `${n} ${n === 1 ? 'Spiel' : 'Spiele'}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

/** Placement distribution, favourite card and recent form on the profile. */
export function DetailedStatsSection({ stats, isMe }: { stats: DetailedStats; isMe: boolean }) {
  const total = stats.placeCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const played = stats.byRank.reduce((a, b) => a + b, 0);
  const favourite = stats.byRank.reduce((best, n, i) => (n > stats.byRank[best] ? i : best), 0) + 1;
  const podium = stats.placeCounts.slice(0, 3).reduce((a, b) => a + b, 0);
  const recent = stats.trend.slice(-10);
  const recentAvg = recent.reduce((a, t) => a + t.place, 0) / Math.max(1, recent.length);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-4xl font-bold">Statistik</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">Platzierungen</h3>
          <p className="-mt-1 text-sm text-ink-soft">{Math.round((podium / total) * 100)} % auf dem Treppchen, aus {games(total)}</p>
          <ColumnChart
            labelAll tableHead={['Platz', 'Spiele']} unit={games}
            data={stats.placeCounts.map((n, i) => ({ label: `Platz ${i + 1}`, short: `${i + 1}.`, value: n }))}
          />
        </Card>
        {played > 0 && (
          <Card className="flex items-center gap-4 md:w-72 md:flex-col md:items-start">
            <PlayingCard rank={favourite} deck={PRESETS[0]} size="md" />
            <div>
              <h3 className="text-2xl font-bold">Lieblingskarte</h3>
              <p className="font-display text-3xl font-bold">{RANK_NAMES[favourite]}</p>
              <p className="text-sm text-ink-soft">{stats.byRank[favourite - 1]}× gelegt, {Math.round((stats.byRank[favourite - 1] / played) * 100)} % {isMe ? 'deiner' : 'aller'} Karten</p>
            </div>
          </Card>
        )}
      </div>

      {stats.trend.length >= 3 && (
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">Formkurve</h3>
          <p className="-mt-1 text-sm text-ink-soft">
            Punkte in den letzten {games(stats.trend.length)} · zuletzt im Schnitt Platz {recentAvg.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
          </p>
          <LineChart
            unit={(n) => `${n} Punkte`} tableHead={['Datum', 'Platz', 'Punkte']}
            data={stats.trend.map((t) => ({ label: day(t.finishedAt), value: t.points, detail: `Platz ${t.place}${t.players ? ` von ${t.players}` : ''} · ${day(t.finishedAt)}` }))}
          />
        </Card>
      )}

      {played > 0 && (
        <Card className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">Gelegte Karten</h3>
          <p className="-mt-1 text-sm text-ink-soft">{played} Karten insgesamt, nach Rang</p>
          <ColumnChart
            tableHead={['Karte', 'Gelegt']} unit={(n) => `${n}× gelegt`}
            data={stats.byRank.map((n, i) => ({ label: RANK_NAMES[i + 1], short: i + 1 === JESTER ? 'N' : String(i + 1), value: n }))}
          />
        </Card>
      )}
    </section>
  );
}

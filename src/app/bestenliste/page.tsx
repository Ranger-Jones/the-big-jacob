import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { monthLabel, monthOf, monthTitle } from '@/lib/months';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getLeaderboard, getMonthlyChampions, getMonthlyLeaderboard } from '@/server/profile-service';
import { Icon, Medal } from '@/components/ui/icons';
import { EloTable } from '@/components/rating/elo-table';
import { getRatingLeaderboard } from '@/server/rating-service';

export const metadata: Metadata = { title: 'Bestenliste' };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const me = await requireUser();
  const admin = createAdminClient();
  const view = (await searchParams).zeitraum;
  const elo = view === 'elo';
  const monthly = view === 'monat';
  const month = monthOf(new Date());
  const [rows, monthRows, champions] = await Promise.all([
    monthly || elo ? Promise.resolve([]) : getLeaderboard(admin),
    monthly ? getMonthlyLeaderboard(admin, month) : Promise.resolve([]),
    getMonthlyChampions(admin, 1),
  ]);
  const eloRows = elo ? await getRatingLeaderboard(admin) : [];
  const lastChampion = champions[0];
  const tab = (active: boolean) => cx('rounded-xl px-4 py-2 font-bold', active ? 'bg-gold text-ink' : 'bg-velvet-deep/60 text-parchment/80 hover:bg-white/10');

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pb-12">
      <h1 className="text-6xl font-bold">Bestenliste</h1>
      {lastChampion && (
        <div className="flex items-center gap-3 rounded-2xl bg-velvet-deep/70 p-3 ring-2 ring-gold/50">
          <Icon name="crown" className="size-8 text-gold-soft" />
          <Avatar profile={lastChampion.champion} size="sm" />
          <p><b className="text-gold-soft">{monthTitle(lastChampion.month)}:</b> {lastChampion.champion.username} mit {lastChampion.champion.wins} {lastChampion.champion.wins === 1 ? 'Sieg' : 'Siegen'}</p>
        </div>
      )}
      <nav className="flex gap-2" aria-label="Zeitraum">
        <Link href="/bestenliste?zeitraum=elo" className={tab(elo)} aria-current={elo ? 'page' : undefined}>⚖️ Elo</Link>
        <Link href="/bestenliste" className={tab(!monthly && !elo)} aria-current={!monthly && !elo ? 'page' : undefined}>Siege</Link>
        <Link href="/bestenliste?zeitraum=monat" className={tab(monthly)} aria-current={monthly ? 'page' : undefined}>{monthLabel(month)}</Link>
      </nav>
      <p className="-mt-2 text-parchment/75">
        {elo ? 'Die Elo-Wertung steigt, wenn du vor stärkeren Spielern landest – und fällt, wenn schwächere dich überholen. Es zählen die Online-Lobby (Bots mit fester Stärke) und private Spiele mit mindestens zwei Menschen bis zum Schluss.' : monthly ? 'Die Saison läuft bis Monatsende. Wer dann vorne liegt, trägt den Titel einen Monat lang.' : 'Sortiert nach Siegen, dann nach Kronen (Runden als Großer Jakob). Kampagne und Tagesaufgabe zählen nicht mit.'}
      </p>

      <Card className="overflow-x-auto p-0">
        {elo ? <EloTable rows={eloRows} me={me.id} /> : monthly ? (
          monthRows.length === 0 ? (
            <p className="p-6 text-ink-soft">Diesen Monat wurde noch kein Spiel beendet. Die Krone ist noch zu haben!</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-ink-soft">
                  <th scope="col" className="px-3 py-3 font-bold sm:px-5">Platz</th>
                  <th scope="col" className="py-3 font-bold">Spieler</th>
                  <th scope="col" className="py-3 text-right font-bold">Siege</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold sm:px-0" title="Runden als Großer Jakob"><Icon name="crown" className="size-5" /></th>
                  <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell">Spiele</th>
                  <th scope="col" className="hidden px-5 py-3 text-right font-bold sm:table-cell">Punkte</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r, i) => (
                  <tr key={r.user_id} className={cx('border-t border-line', r.user_id === me.id && 'bg-gold/20')}>
                    <td className="tabular px-3 py-3 font-display text-2xl font-bold sm:px-5"><Medal place={i + 1} /></td>
                    <td className="py-3">
                      <Link href={`/profil/${r.username}`} className="flex min-w-0 items-center gap-2 font-bold hover:underline sm:gap-3">
                        <Avatar profile={r} size="sm" />
                        <span className="truncate">{r.username}</span>
                      </Link>
                    </td>
                    <td className="tabular py-3 text-right font-bold">{r.wins}</td>
                    <td className="tabular px-3 py-3 text-right sm:px-0">{r.crowns}</td>
                    <td className="tabular hidden py-3 text-right sm:table-cell">{r.games}</td>
                    <td className="tabular hidden px-5 py-3 text-right sm:table-cell">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : rows.length === 0 ? (
          <p className="p-6 text-ink-soft">Noch keine beendeten Spiele. Das erste Spiel bringt dich auf Platz 1.</p>
        ) : (
          <table className="w-full text-left sm:min-w-[38rem]">
            <thead>
              <tr className="text-sm text-ink-soft">
                <th scope="col" className="px-3 py-3 font-bold sm:px-5">Platz</th>
                <th scope="col" className="py-3 font-bold">Spieler</th>
                <th scope="col" className="py-3 text-right font-bold">Siege</th>
                <th scope="col" className="px-3 py-3 text-right font-bold sm:px-0" title="Runden als Großer Jakob"><Icon name="crown" className="size-5" /></th>
                <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell" title="Revolutionen"><Icon name="fist" className="size-5" /></th>
                <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell">Spiele</th>
                <th scope="col" className="hidden px-5 py-3 text-right font-bold sm:table-cell">Ø Platz</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user_id} className={cx('border-t border-line', r.user_id === me.id && 'bg-gold/20')}>
                  <td className="tabular px-3 py-3 font-display text-2xl font-bold sm:px-5"><Medal place={i + 1} /></td>
                  <td className="py-3">
                    <Link href={`/profil/${r.username}`} className="flex min-w-0 items-center gap-2 font-bold hover:underline sm:gap-3">
                      <Avatar profile={r} size="sm" />
                      <span className="truncate">{r.username}</span>
                    </Link>
                  </td>
                  <td className="tabular py-3 text-right font-bold">{r.wins}</td>
                  <td className="tabular px-3 py-3 text-right sm:px-0">{r.crowns}</td>
                  <td className="tabular hidden py-3 text-right sm:table-cell">{r.revolutions + r.grand_revolutions}</td>
                  <td className="tabular hidden py-3 text-right sm:table-cell">{r.games_played}</td>
                  <td className="tabular hidden px-5 py-3 text-right sm:table-cell">{r.avg_place.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getLeaderboard } from '@/server/profile-service';

export const metadata: Metadata = { title: 'Bestenliste' };
const MEDALS = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const me = await requireUser();
  const rows = await getLeaderboard(createAdminClient());
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pb-12">
      <h1 className="text-6xl font-bold">Bestenliste</h1>
      <p className="-mt-3 text-parchment/75">Sortiert nach Siegen, dann nach Kronen (Runden als Großer Jakob).</p>
      <Card className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-soft">Noch keine beendeten Spiele. Das erste Spiel bringt dich auf Platz 1.</p>
        ) : (
          <table className="w-full text-left sm:min-w-[38rem]">
            <thead>
              <tr className="text-sm text-ink-soft">
                <th scope="col" className="px-3 py-3 font-bold sm:px-5">Platz</th>
                <th scope="col" className="py-3 font-bold">Spieler</th>
                <th scope="col" className="py-3 text-right font-bold">Siege</th>
                <th scope="col" className="px-3 py-3 text-right font-bold sm:px-0" title="Runden als Großer Jakob">👑</th>
                <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell" title="Revolutionen">✊</th>
                <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell">Spiele</th>
                <th scope="col" className="hidden px-5 py-3 text-right font-bold sm:table-cell">Ø Platz</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user_id} className={cx('border-t border-line', r.user_id === me.id && 'bg-gold/20')}>
                  <td className="tabular px-3 py-3 font-display text-2xl font-bold sm:px-5">{i < 3 ? MEDALS[i] : i + 1}</td>
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

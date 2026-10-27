import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Crest } from '@/components/courts/crest';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getCourt } from '@/server/court-service';
import { CourtAdmin, InviteBox, KickButton } from './court-client';
import { Icon, Medal } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Hof' };

export default async function CourtPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const court = await getCourt(createAdminClient(), user.id, id);
  if (!court) notFound();
  const owner = court.ownerId === user.id;
  const since = new Date(court.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-12">
      <Link href="/hoefe" className="w-fit text-parchment/70 hover:text-parchment">‹ Alle Höfe</Link>
      <header className="flex flex-wrap items-center gap-5">
        <Crest id={court.crest} size="lg" />
        <div className="min-w-0">
          <h1 className="break-words text-6xl font-bold">{court.name}</h1>
          <p className="text-parchment/75">Gegründet am {since} · {court.courtGames} {court.courtGames === 1 ? 'Hofspiel' : 'Hofspiele'}</p>
        </div>
      </header>

      <InviteBox code={court.inviteCode} />

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">Hoftabelle</h2>
        <p className="-mt-2 text-sm text-parchment/70">Es zählen normale Spiele mit mindestens zwei Mitgliedern. Einen Sieg holt, wer von den Mitgliedern am besten abschneidet.</p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="bg-parchment-dark/70 text-sm text-ink-soft">
              <tr><th className="px-4 py-3">#</th><th className="px-2 py-3">Mitglied</th><th className="px-2 py-3 text-right">Siege</th><th className="px-2 py-3 text-right">Spiele</th><th className="px-4 py-3 text-right">Punkte</th>{owner && <th className="w-12" />}</tr>
            </thead>
            <tbody>
              {court.standings.map((s, i) => (
                <tr key={s.profile.id} className={cx('border-t border-line/60', s.profile.id === user.id && 'bg-gold/15')}>
                  <td className="px-4 py-2.5 font-display text-2xl">{s.games > 0 ? <Medal place={i + 1} /> : '–'}</td>
                  <td className="px-2 py-2.5">
                    <Link href={`/profil/${s.profile.username}`} className="flex items-center gap-2 font-bold hover:underline">
                      <Avatar profile={s.profile} size="sm" />
                      <span className="truncate">{s.profile.username}</span>
                      {s.owner && <span title="Hofherr" aria-label="Hofherr"><Icon name="crown" className="text-gold-soft" /></span>}
                    </Link>
                  </td>
                  <td className="tabular px-2 py-2.5 text-right font-bold">{s.wins}</td>
                  <td className="tabular px-2 py-2.5 text-right">{s.games}</td>
                  <td className="tabular px-4 py-2.5 text-right">{s.points}</td>
                  {owner && <td className="pr-2">{!s.owner && <KickButton courtId={court.id} member={s.profile} />}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <CourtAdmin courtId={court.id} owner={owner} name={court.name} crest={court.crest} />
    </main>
  );
}

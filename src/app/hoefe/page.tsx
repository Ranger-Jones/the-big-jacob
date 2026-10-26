import type { Metadata } from 'next';
import Link from 'next/link';
import { Crest } from '@/components/courts/crest';
import { Card } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { listMyCourts, MAX_COURTS } from '@/server/court-service';
import { CourtForms } from './court-forms';

export const metadata: Metadata = { title: 'Höfe' };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await requireUser();
  const courts = await listMyCourts(createAdminClient(), user.id);
  const { code } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-12">
      <div>
        <h1 className="text-6xl font-bold">Höfe</h1>
        <p className="mt-1 max-w-prose text-parchment/80">
          Ein Hof ist deine feste Runde: WG, Wache, Stammtisch. Er bekommt ein Wappen und eine eigene Tabelle, in die jedes Spiel zählt, an dem mindestens zwei Mitglieder teilnehmen.
        </p>
      </div>
      {courts.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courts.map((c) => (
            <li key={c.id}>
              <Link href={`/hoefe/${c.id}`} className="block rounded-3xl transition-transform hover:-translate-y-0.5">
                <Card tone="velvet" className="flex items-center gap-4">
                  <Crest id={c.crest} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-3xl font-bold">{c.name}</span>
                    <span className="block text-parchment/70">{c.members} {c.members === 1 ? 'Mitglied' : 'Mitglieder'}{c.owner && ' · du bist Hofherr'}</span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {courts.length < MAX_COURTS
        ? <CourtForms initialCode={code ?? ''} first={courts.length === 0} />
        : <p className="text-parchment/70">Du bist in {MAX_COURTS} Höfen, mehr geht nicht. Verlasse einen, um einen neuen zu gründen.</p>}
    </main>
  );
}

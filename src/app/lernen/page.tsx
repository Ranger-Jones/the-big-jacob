import type { Metadata } from 'next';
import Link from 'next/link';
import { Tutorial } from '@/components/tutorial/tutorial';
import { DEFAULT_DECK } from '@/lib/decks';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDeck, getDefaultDeckId } from '@/server/deck-service';

export const metadata: Metadata = { title: 'Spielen lernen' };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ modus?: string }> }) {
  const user = await requireUser();
  const admin = createAdminClient();
  const deckId = await getDefaultDeckId(admin, user.id);
  const deck = (deckId && (await getDeck(admin, deckId))) || DEFAULT_DECK;
  const practice = (await searchParams).modus === 'ueben';
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-12">
      <div>
        <h1 className="text-6xl font-bold">Spielen lernen</h1>
        <p className="mt-1 text-parchment/80">
          Sieben kurze Lektionen, danach ein Übungsspiel gegen drei Bots mit Tipps. Nichts davon zählt für die Bestenliste. Die vollständigen Regeln stehen unter <Link href="/regeln" className="font-bold text-gold-soft hover:underline">Regeln</Link>.
        </p>
      </div>
      <Tutorial deck={deck} startWithPractice={practice} />
    </main>
  );
}

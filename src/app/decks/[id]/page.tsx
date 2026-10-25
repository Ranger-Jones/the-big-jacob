import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DeckEditor } from '@/components/deck/deck-editor';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDeck } from '@/server/deck-service';

export const metadata: Metadata = { title: 'Deck gestalten' };

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await getDeck(createAdminClient(), id);
  if (!deck || deck.ownerId !== user.id) notFound();
  return <DeckEditor key={deck.id} deck={deck} me={user.id} />;
}

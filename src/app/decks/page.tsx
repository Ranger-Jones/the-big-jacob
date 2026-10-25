import type { Metadata } from 'next';
import { DeckGallery } from '@/components/deck/deck-gallery';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDefaultDeckId, listDecks, listDecksOf } from '@/server/deck-service';
import { listFriends } from '@/server/social-service';

export const metadata: Metadata = { title: 'Decks' };

export default async function DecksPage() {
  const user = await requireUser();
  const admin = createAdminClient();
  const friends = (await listFriends(admin, user.id)).friends.map((f) => f.profile.id);
  const [mine, friendDecks, defaultId] = await Promise.all([
    listDecks(admin, user.id),
    listDecksOf(admin, friends),
    getDefaultDeckId(admin, user.id),
  ]);
  return <DeckGallery mine={mine} friends={friendDecks} defaultId={defaultId} />;
}

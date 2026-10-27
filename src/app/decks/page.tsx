import type { Metadata } from 'next';
import { DeckGallery } from '@/components/deck/deck-gallery';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDefaultDeckId, listDecks, listDecksOf, listGallery, publicDeckIds, type GallerySort } from '@/server/deck-service';
import { listFriends } from '@/server/social-service';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Decks') };
}

export default async function DecksPage({ searchParams }: { searchParams: Promise<{ galerie?: string }> }) {
  const user = await requireUser();
  const sort: GallerySort = (await searchParams).galerie === 'neu' ? 'neu' : 'beliebt';
  const admin = createAdminClient();
  const friends = (await listFriends(admin, user.id)).friends.map((f) => f.profile.id);
  const [mine, friendDecks, defaultId, gallery, shared] = await Promise.all([
    listDecks(admin, user.id),
    listDecksOf(admin, friends),
    getDefaultDeckId(admin, user.id),
    listGallery(admin, user.id, sort),
    publicDeckIds(admin, user.id),
  ]);
  return (
    <DeckGallery
      me={user.id} mine={mine} friends={friendDecks} defaultId={defaultId}
      gallery={gallery.filter((d) => d.ownerId !== user.id)} sort={sort} shared={shared}
    />
  );
}

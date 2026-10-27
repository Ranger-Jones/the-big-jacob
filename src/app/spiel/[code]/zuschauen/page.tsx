import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getT } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDecksByIds } from '@/server/deck-service';
import { loadGameByCode, toView } from '@/server/game-service';
import { getQuickEmojis } from '@/server/profile-service';
import { addSpectator, canSpectate } from '@/server/spectate-service';
import { JoinError } from '../join-error';
import { SpectatorClient } from './spectator-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Zuschauen') };
}

export default async function SpectatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const admin = createAdminClient();
  const game = await loadGameByCode(admin, code);
  if (!game) notFound();
  if (game.state.players.some((p) => p.id === user.id)) redirect(`/spiel/${game.code}`);
  if (game.state.status === 'finished') redirect(`/spiel/${game.code}/wiederholung`);
  const allowed = await canSpectate(admin, user.id, game);
  if (!allowed.ok) return <JoinError message={(await getT())(allowed.error)} />;
  await addSpectator(admin, user.id, game.id);
  const humanIds = game.state.players.filter((p) => !p.bot).map((p) => p.id);
  const [{ data: profiles }, decks, quickEmojis] = await Promise.all([
    admin.from('profiles').select('id, username, avatar_url, avatar_frame').in('id', humanIds),
    getDecksByIds(admin, game.state.players.map((p) => p.deckId).filter((d): d is string => !!d)),
    getQuickEmojis(admin, user.id),
  ]);
  return (
    <SpectatorClient
      key={game.id}
      initial={toView(game)}
      initialProfiles={Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))}
      initialDecks={decks}
      me={user.id}
      quickEmojis={quickEmojis}
      // eslint-disable-next-line react-hooks/purity -- server render time, used to sync client clocks
      serverNow={Date.now()}
      felt={user.table_felt}
    />
  );
}

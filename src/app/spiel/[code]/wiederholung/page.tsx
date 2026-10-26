import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDecksByIds } from '@/server/deck-service';
import { loadGameByCode } from '@/server/game-service';
import { JoinError } from '../join-error';
import { ReplayViewer } from './replay-viewer';

export const metadata: Metadata = { title: 'Wiederholung' };

export default async function ReplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireUser();
  const admin = createAdminClient();
  const game = await loadGameByCode(admin, code);
  if (!game) notFound();
  if (game.state.status !== 'finished') return <JoinError message="Die Wiederholung gibt es erst, wenn das Spiel vorbei ist." />;
  if (!game.state.replay?.length) return <JoinError message="Für dieses Spiel wurde keine Wiederholung aufgezeichnet." />;
  const humanIds = game.state.players.filter((p) => !p.bot).map((p) => p.id);
  const [{ data: profiles }, decks] = await Promise.all([
    admin.from('profiles').select('id, username, avatar_url, avatar_frame').in('id', humanIds),
    getDecksByIds(admin, game.state.players.map((p) => p.deckId).filter((d): d is string => !!d)),
  ]);
  return (
    <ReplayViewer
      code={game.code}
      players={game.state.players}
      rounds={game.state.replay}
      history={game.state.history}
      profiles={Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))}
      decks={decks}
    />
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { berlinDay } from '@/lib/daily';
import { getT } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDecksByIds } from '@/server/deck-service';
import { loadGameByCode } from '@/server/game-service';
import { JoinError } from '../join-error';
import { ReplayViewer } from './replay-viewer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Wiederholung') };
}

export default async function ReplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getT();
  const user = await requireUser();
  const admin = createAdminClient();
  const game = await loadGameByCode(admin, code);
  if (!game) notFound();
  if (game.state.status !== 'finished') return <JoinError message={t('Die Wiederholung gibt es erst, wenn das Spiel vorbei ist.')} />;
  // Daily challenge: only the player sees the replay on the day itself (the deal is the same for everyone).
  let rounds = game.state.replay;
  if (game.state.mode === 'daily') {
    const ownGame = game.state.players.some((p) => p.id === user.id);
    const dayOver = (game.state.modeRef ?? '') < berlinDay();
    rounds = ownGame || dayOver ? game.state.replayLog : null;
    if (!rounds?.length) return <JoinError message={t('Die Wiederholung der Tagesaufgabe gibt es für andere erst morgen.')} />;
  }
  if (!rounds?.length) return <JoinError message={t('Für dieses Spiel wurde keine Wiederholung aufgezeichnet.')} />;
  const humanIds = game.state.players.filter((p) => !p.bot).map((p) => p.id);
  const [{ data: profiles }, decks] = await Promise.all([
    admin.from('profiles').select('id, username, avatar_url, avatar_frame').in('id', humanIds),
    getDecksByIds(admin, game.state.players.map((p) => p.deckId).filter((d): d is string => !!d)),
  ]);
  return (
    <ReplayViewer
      code={game.code}
      players={game.state.players}
      rounds={rounds}
      history={game.state.history}
      profiles={Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))}
      decks={decks}
    />
  );
}

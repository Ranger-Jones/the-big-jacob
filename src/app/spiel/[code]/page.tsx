import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { privateHand } from '@/lib/jakob/engine';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { getDecksByIds, listDecks } from '@/server/deck-service';
import { joinGame, loadGameByCode, toView } from '@/server/game-service';
import { getQuickEmojis } from '@/server/profile-service';
import { listFriends } from '@/server/social-service';
import { GameClient } from './game-client';
import { JoinError } from './join-error';

export const metadata: Metadata = { title: 'Am Tisch' };

export default async function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const admin = createAdminClient();
  let game = await loadGameByCode(admin, code);
  if (!game) notFound();
  if (!game.state.players.some((p) => p.id === user.id)) {
    const joined = await joinGame(admin, user.id, code);
    if (!joined.ok) {
      return <JoinError message={joined.error} spectateHref={game.state.status === 'playing' ? `/spiel/${game.code}/zuschauen` : undefined} />;
    }
    game = await loadGameByCode(admin, code);
    if (!game) notFound();
  }
  const humanIds = game.state.players.filter((p) => !p.bot).map((p) => p.id);
  const deckIds = game.state.players.map((p) => p.deckId).filter((d): d is string => !!d);
  const [{ data: profiles }, friends, decks, myDecks, quickEmojis] = await Promise.all([
    admin.from('profiles').select('id, username, avatar_url, avatar_frame').in('id', humanIds),
    listFriends(admin, user.id),
    getDecksByIds(admin, deckIds),
    listDecks(admin, user.id),
    getQuickEmojis(admin, user.id),
  ]);
  return (
    <GameClient
      key={game.id}
      initial={toView(game)}
      initialHand={privateHand(game.state, user.id)}
      initialProfiles={Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))}
      initialDecks={decks}
      me={user.id}
      friends={friends.friends.map((f) => f.profile)}
      myDecks={myDecks}
      quickEmojis={quickEmojis}
      felt={user.table_felt}
      // eslint-disable-next-line react-hooks/purity -- server render time, used to sync client clocks
      serverNow={Date.now()}
    />
  );
}

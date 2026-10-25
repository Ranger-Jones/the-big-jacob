import Link from 'next/link';
import { FriendsOnline } from '@/components/dashboard/friends-online';
import { InviteList } from '@/components/dashboard/invite-list';
import { PlayActions } from '@/components/dashboard/play-actions';
import { HeroCards } from '@/components/landing/hero-cards';
import { StatsGrid } from '@/components/stats-grid';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import { getStatsByUsername, listActiveGames } from '@/server/profile-service';
import { listFriends, listPendingInvites } from '@/server/social-service';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const admin = createAdminClient();
  const [invites, active, friends, stats] = await Promise.all([
    listPendingInvites(admin, user.id),
    listActiveGames(admin, user.id),
    listFriends(admin, user.id),
    getStatsByUsername(admin, user.username),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-12">
      <h1 className="break-words text-5xl font-bold sm:text-6xl">Willkommen am Hof, {user.username}!</h1>

      {invites.length > 0 && (
        <Card className="flex flex-col gap-3 ring-gold shadow-[0_6px_0_var(--color-gold-deep)]">
          <h2 className="text-3xl font-bold">Einladungen</h2>
          <InviteList invites={invites} />
        </Card>
      )}

      {active.length > 0 && (
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Deine offenen Tische</h2>
          <ul className="flex flex-wrap gap-2">
            {active.map((g) => (
              <li key={g.code}>
                <Link href={`/spiel/${g.code}`} className={buttonClass('secondary', 'sm')}>
                  {g.code} · {g.status === 'lobby' ? 'Lobby' : `Runde ${g.round}`} · {g.playerCount} am Tisch
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PlayActions />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Freunde online</h2>
          <FriendsOnline friends={friends.friends.map((f) => f.profile)} />
        </Card>
        {stats && (
          <Card tone="velvet" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-3xl font-bold">Deine Bilanz</h2>
              <Link href={`/profil/${user.username}`} className="text-sm font-bold text-gold-soft hover:underline">Zum Profil</Link>
            </div>
            <StatsGrid stats={stats} compact />
          </Card>
        )}
      </div>

      <Card tone="velvet" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dein eigenes Deck</h2>
          <p className="text-parchment/75">Gib jeder Karte Namen, Symbol oder Foto – und spiel damit am Tisch.</p>
        </div>
        <Link href="/decks" className={buttonClass('primary')}>Decks gestalten</Link>
      </Card>
    </main>
  );
}

function Landing() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <h1 className="gold-text text-6xl font-bold leading-[0.95] sm:text-8xl">Der Große Jakob</h1>
        <p className="max-w-md text-xl text-parchment/85">
          Wer zuerst seine Karten los ist, wird König. Wer zuletzt übrig bleibt, schrubbt die Böden – und zahlt Steuern.
          Bis jemand beide Narren zieht und die Revolution ausruft.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registrieren" className={buttonClass('primary', 'lg')}>Am Hof anmelden</Link>
          <Link href="/login" className={buttonClass('velvet', 'lg')}>Einloggen</Link>
        </div>
        <Link href="/regeln" className="font-bold text-gold-soft hover:underline">Wie geht das Spiel?</Link>
      </div>
      <HeroCards />
    </main>
  );
}

import Link from 'next/link';
import { FriendRequests } from '@/components/dashboard/friend-requests';
import { FriendsOnline } from '@/components/dashboard/friends-online';
import { HomeHero } from '@/components/dashboard/home-hero';
import { InviteList } from '@/components/dashboard/invite-list';
import { PlayActions } from '@/components/dashboard/play-actions';
import { HeroCards } from '@/components/landing/hero-cards';
import { StatsGrid } from '@/components/stats-grid';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import { CAMPAIGN, campaignTitle } from '@/lib/campaign';
import { berlinDay } from '@/lib/daily';
import { getKingOfWeek, getStatsByUsername, listActiveGames } from '@/server/profile-service';
import { Avatar } from '@/components/ui/avatar';
import { listFriendTables } from '@/server/spectate-service';
import { getFriendLists } from '@/lib/supabase/cached';
import { listPendingInvites } from '@/server/social-service';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const admin = createAdminClient();
  const [invites, active, friends, stats, friendTables, { data: progress }, { data: daily }] = await Promise.all([
    listPendingInvites(admin, user.id),
    listActiveGames(admin, user.id),
    getFriendLists(user.id),
    getStatsByUsername(admin, user.username),
    listFriendTables(admin, user.id),
    admin.from('profiles').select('campaign_level').eq('id', user.id).single(),
    admin.from('daily_results').select('points').eq('day', berlinDay()).eq('user_id', user.id).maybeSingle(),
  ]);
  const level = progress?.campaign_level ?? 0;
  const king = await getKingOfWeek(admin, [user.id, ...friends.friends.map((f) => f.profile.id)]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-12">
      <section className="grid items-center gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <div className="text-center lg:text-left">
            <h1 className="break-words text-5xl font-bold sm:text-6xl">Willkommen am Hof, {user.username}</h1>
            {stats && stats.games_played > 0 && (
              <p className="mt-2 text-parchment/75">
                <b className="text-gold-soft">{stats.wins}</b> {stats.wins === 1 ? 'Sieg' : 'Siege'} · <b className="text-gold-soft">{stats.crowns}</b>× Großer Jakob
              </p>
            )}
          </div>
          <PlayActions />
        </div>
        <div className="order-1 lg:order-2"><HomeHero /></div>
      </section>

      {friends.incoming.length > 0 && (
        <Card className="flex flex-col gap-3 ring-wax shadow-[0_6px_0_#7f1a22]">
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            Freundschaftsanfragen
            <span className="flex size-7 items-center justify-center rounded-full bg-wax font-sans text-base text-parchment">{friends.incoming.length}</span>
          </h2>
          <FriendRequests requests={friends.incoming} />
        </Card>
      )}

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

      {king && (
        <Card tone="velvet" className="flex items-center gap-4 ring-gold/60">
          <span className="relative">
            <Avatar profile={king} size="lg" className="ring-4 ring-gold" />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl drop-shadow" aria-hidden>👑</span>
          </span>
          <span>
            <span className="block text-sm font-bold text-gold-soft">König der Woche</span>
            <span className="block font-display text-3xl font-bold">{king.user_id === user.id ? 'Du!' : king.username}</span>
            <span className="block text-parchment/75">{king.wins} {king.wins === 1 ? 'Sieg' : 'Siege'} in den letzten 7 Tagen unter dir und deinen Freunden</span>
          </span>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/kampagne" className="group">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <span className="text-5xl" aria-hidden>{CAMPAIGN[Math.min(level, CAMPAIGN.length - 1)].emoji}</span>
            <span>
              <span className="block font-display text-3xl font-bold">Kampagne</span>
              <span className="block text-parchment/75">Vom Bauern zum König · Station {Math.min(level + 1, CAMPAIGN.length)} von {CAMPAIGN.length}</span>
              <span className="block text-sm text-gold-soft">Dein Titel: {campaignTitle(level)}</span>
            </span>
          </Card>
        </Link>
        <Link href="/herausforderung" className="group">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <span className="text-5xl" aria-hidden>📅</span>
            <span>
              <span className="block font-display text-3xl font-bold">Tägliche Herausforderung</span>
              <span className="block text-parchment/75">Dieselbe Hand für alle – wer holt heute die meisten Punkte?</span>
              <span className="block text-sm text-gold-soft">{daily ? `Heute erledigt: ${daily.points} Punkte` : 'Heute noch offen'}</span>
            </span>
          </Card>
        </Link>
      </div>

      {friendTables.length > 0 && (
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Freunde am Tisch</h2>
          <ul className="flex flex-col gap-2">
            {friendTables.map((t) => (
              <li key={t.code} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 truncate"><b>{t.friend.username}</b> spielt gerade · Runde {t.round} · {t.players} am Tisch</span>
                <Link href={`/spiel/${t.code}/zuschauen`} className={buttonClass('secondary', 'sm')}>👀 Zuschauen</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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

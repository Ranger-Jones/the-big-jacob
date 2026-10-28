import Link from 'next/link';
import { botArtUrl } from '@/lib/bot-art';
import { FriendRequests } from '@/components/dashboard/friend-requests';
import { FriendsOnline } from '@/components/dashboard/friends-online';
import { HomeHero } from '@/components/dashboard/home-hero';
import { InviteList } from '@/components/dashboard/invite-list';
import { PlayActions } from '@/components/dashboard/play-actions';
import { PlayOnlineCard } from '@/components/rating/play-online-card';
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
import { Icon, STAGE_ICONS } from '@/components/ui/icons';
import { getT } from '@/lib/i18n/server';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;
  const t = await getT();

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
            <h1 className="break-words text-5xl font-bold sm:text-6xl">{t('Willkommen am Hof, {name}', { name: user.username })}</h1>
            {stats && stats.games_played > 0 && (
              <p className="mt-2 text-parchment/75">
                <b className="text-gold-soft">{stats.wins}</b> {stats.wins === 1 ? t('Sieg') : t('Siege')} · <b className="text-gold-soft">{stats.crowns}</b>× {t('Großer Jakob')}
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
            {t('Freundschaftsanfragen')}
            <span className="flex size-7 items-center justify-center rounded-full bg-wax font-sans text-base text-parchment">{friends.incoming.length}</span>
          </h2>
          <FriendRequests requests={friends.incoming} />
        </Card>
      )}

      {invites.length > 0 && (
        <Card className="flex flex-col gap-3 ring-gold shadow-[0_6px_0_var(--color-gold-deep)]">
          <h2 className="text-3xl font-bold">{t('Einladungen')}</h2>
          <InviteList invites={invites} />
        </Card>
      )}

      {active.length > 0 && (
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Deine offenen Tische')}</h2>
          <ul className="flex flex-wrap gap-2">
            {active.map((g) => (
              <li key={g.code}>
                <Link href={`/spiel/${g.code}`} className={buttonClass('secondary', 'sm')}>
                  {g.status === 'lobby' ? t('{code} · Lobby · {count} am Tisch', { code: g.code, count: g.playerCount }) : t('{code} · Runde {round} · {count} am Tisch', { code: g.code, round: g.round, count: g.playerCount })}
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
            <Icon name="crown" className="absolute -top-7 left-1/2 size-8 -translate-x-1/2 text-gold drop-shadow" />
          </span>
          <span>
            <span className="block text-sm font-bold text-gold-soft">{t('König der Woche')}</span>
            <span className="block font-display text-3xl font-bold">{king.user_id === user.id ? t('Du!') : king.username}</span>
            <span className="block text-parchment/75">{king.wins === 1 ? t('1 Sieg in den letzten 7 Tagen unter dir und deinen Freunden') : t('{count} Siege in den letzten 7 Tagen unter dir und deinen Freunden', { count: king.wins })}</span>
          </span>
        </Card>
      )}

      <PlayOnlineCard userId={user.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/kampagne" className="group">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <Icon name={STAGE_ICONS[CAMPAIGN[Math.min(level, CAMPAIGN.length - 1)].level] ?? 'crown'} className="size-12 text-gold-soft" />
            <span>
              <span className="block font-display text-3xl font-bold">{t('Kampagne')}</span>
              <span className="block text-parchment/75">{t('Vom Bauern zum König · Station {n} von {total}', { n: Math.min(level + 1, CAMPAIGN.length), total: CAMPAIGN.length })}</span>
              <span className="block text-sm text-gold-soft">{t('Dein Titel: {title}', { title: t(campaignTitle(level)) })}</span>
            </span>
          </Card>
        </Link>
        <Link href="/herausforderung" className="group">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <Icon name="calendar" className="size-12 text-gold-soft" />
            <span>
              <span className="block font-display text-3xl font-bold">{t('Tägliche Herausforderung')}</span>
              <span className="block text-parchment/75">{t('Dieselbe Hand für alle – wer holt heute die meisten Punkte?')}</span>
              <span className="block text-sm text-gold-soft">{daily ? t('Heute erledigt: {points} Punkte', { points: daily.points }) : t('Heute noch offen')}</span>
            </span>
          </Card>
        </Link>
        <Link href="/bots" className="group sm:col-span-2">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <span className="flex shrink-0 -space-x-4">
              {['König Peschel', 'Gräfin Charlotta', 'Hofnarr Hugo'].map((name) => (
                // eslint-disable-next-line @next/next/no-img-element -- static cached SVG portrait
                <img key={name} src={botArtUrl(name)} alt="" className="size-12 rounded-full ring-2 ring-gold" />
              ))}
            </span>
            <span>
              <span className="block font-display text-3xl font-bold">{t('Gegen Bots spielen')}</span>
              <span className="block text-parchment/75">{t('17 Charaktere vom Bauern bis zum König – im Duell, eins gegen eins')}</span>
            </span>
          </Card>
        </Link>
        <Link href="/lernen" className="group sm:col-span-2">
          <Card tone="velvet" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-0.5">
            <Icon name="book" className="size-12 text-gold-soft" />
            <span>
              <span className="block font-display text-3xl font-bold">{t('Spielen lernen')}</span>
              <span className="block text-parchment/75">{t('Sieben kurze Lektionen und ein Übungsspiel mit Tipps, ganz ohne Druck')}</span>
            </span>
          </Card>
        </Link>
      </div>

      {friendTables.length > 0 && (
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Freunde am Tisch')}</h2>
          <ul className="flex flex-col gap-2">
            {friendTables.map((ft) => (
              <li key={ft.code} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 truncate"><b>{ft.friend.username}</b> {t('spielt gerade · Runde {round} · {count} am Tisch', { round: ft.round, count: ft.players })}</span>
                <Link href={`/spiel/${ft.code}/zuschauen`} className={buttonClass('secondary', 'sm')}><Icon name="eye" /> {t('Zuschauen')}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card tone="velvet" className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Freunde online')}</h2>
          <FriendsOnline friends={friends.friends.map((f) => f.profile)} />
        </Card>
        {stats && (
          <Card tone="velvet" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-3xl font-bold">{t('Deine Bilanz')}</h2>
              <Link href={`/profil/${user.username}`} className="text-sm font-bold text-gold-soft hover:underline">{t('Zum Profil')}</Link>
            </div>
            <StatsGrid stats={stats} compact />
          </Card>
        )}
      </div>

      <Card tone="velvet" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('Dein eigenes Deck')}</h2>
          <p className="text-parchment/75">{t('Gib jeder Karte Namen, Symbol oder Foto – und spiel damit am Tisch.')}</p>
        </div>
        <Link href="/decks" className={buttonClass('primary')}>{t('Decks gestalten')}</Link>
      </Card>
    </main>
  );
}

async function Landing() {
  const t = await getT();
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <h1 className="gold-text text-6xl font-bold leading-[0.95] sm:text-8xl">Der Große Jakob</h1>
        <p className="max-w-md text-xl text-parchment/85">
          {t('Wer zuerst seine Karten los ist, wird König. Wer zuletzt übrig bleibt, schrubbt die Böden – und zahlt Steuern. Bis jemand beide Narren zieht und die Revolution ausruft.')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registrieren" className={buttonClass('primary', 'lg')}>{t('Am Hof anmelden')}</Link>
          <Link href="/login" className={buttonClass('velvet', 'lg')}>{t('Einloggen')}</Link>
        </div>
        <Link href="/regeln" className="font-bold text-gold-soft hover:underline">{t('Wie geht das Spiel?')}</Link>
      </div>
      <HeroCards />
    </main>
  );
}

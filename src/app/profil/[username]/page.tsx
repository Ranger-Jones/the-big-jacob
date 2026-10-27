import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RatingCard } from '@/components/rating/rating-card';
import { StatsGrid } from '@/components/stats-grid';
import { getRatingSummary } from '@/server/rating-service';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { parseUsernameParam } from '@/lib/username';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { signOut } from '@/server/auth-actions';
import { monthTitle } from '@/lib/months';
import { intlLocale } from '@/lib/i18n/core';
import { getLocale, getT } from '@/lib/i18n/server';
import { badgesFor, getDetailedStats, getHistory, getMonthlyChampions, getRivalries, getStatsByUsername } from '@/server/profile-service';
import { DetailedStatsSection } from '@/components/stats/detailed-stats';
import { AvatarUpload } from './avatar-upload';
import { AppSettings } from '@/components/app-shell/pwa';
import { CosmeticsPicker } from './cosmetics-picker';
import { RenameForm } from './rename-form';
import { FriendshipControls } from './friendship-controls';
import { getFriendshipWith } from '@/server/social-service';
import { BADGE_ICONS, Icon, Medal } from '@/components/ui/icons';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const t = await getT();
  return { title: parseUsernameParam((await params).username) ?? t('Profil') };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const username = parseUsernameParam((await params).username);
  const me = await requireUser();
  if (!username) notFound();
  const locale = await getLocale();
  const t = await getT();
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });
  const admin = createAdminClient();
  const stats = await getStatsByUsername(admin, username);
  if (!stats) notFound();
  const isMe = stats.user_id === me.id;
  const [history, champions, rivals, detailed, rating] = await Promise.all([
    getHistory(admin, stats.user_id), getMonthlyChampions(admin, 12), getRivalries(admin, stats.user_id), getDetailedStats(admin, stats.user_id),
    getRatingSummary(admin, stats.user_id),
  ]);
  const friendship = isMe ? null : await getFriendshipWith(admin, me.id, stats.user_id);
  const titles = champions.filter((c) => c.champion.user_id === stats.user_id).map((c) => monthTitle(c.month, t));
  const badges = badgesFor(stats);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pb-12">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {isMe ? <AvatarUpload me={me.id} profile={stats} /> : <Avatar profile={stats} size="xl" className="ring-4 ring-gold" />}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h1 className="break-all text-6xl font-bold">{stats.username}</h1>
          <p className="text-parchment/75">
            {stats.crowns > 0 ? t('{count}× Großer Jakob gewesen', { count: stats.crowns }) : t('Noch nie auf dem Thron gesessen')}
            {stats.servant > 0 && ` · ${t('{count}× Großer Knecht', { count: stats.servant })}`}
          </p>
          {titles.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {titles.map((title) => <li key={title} className="rounded-full bg-gold/25 px-3 py-0.5 text-sm font-bold text-gold-soft ring-1 ring-gold/60"><Icon name="crown" /> {title}</li>)}
            </ul>
          )}
          {friendship && <FriendshipControls key={`${friendship.status}-${friendship.friendshipId}`} username={stats.username} friendId={stats.user_id} initial={friendship} />}
          {isMe && (
            <div className="flex flex-wrap items-center gap-2">
              <RenameForm current={stats.username} />
              <form action={signOut}>
                <button type="submit" className="rounded-xl px-3 py-2 text-sm font-bold text-parchment/70 hover:bg-white/10 hover:text-parchment">{t('Abmelden')}</button>
              </form>
            </div>
          )}
        </div>
      </section>

      {rating && <RatingCard summary={rating} />}

      <StatsGrid stats={stats} />
      <DetailedStatsSection stats={detailed} isMe={isMe} />

      {isMe && <CosmeticsPicker stats={stats} profile={stats} felt={me.table_felt} />}
      {isMe && <Card><AppSettings /></Card>}

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">{t('Abzeichen')}</h2>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {badges.map((b) => (
            <li
              key={b.id}
              title={t(b.hint)}
              className={cx(
                'flex flex-col items-center gap-1 rounded-2xl p-3 text-center ring-2',
                b.earned ? 'bg-gold/20 ring-gold/60' : 'bg-velvet-deep/50 ring-white/10 opacity-55 grayscale',
              )}
            >
              <Icon name={BADGE_ICONS[b.id] ?? 'star'} className="size-10 text-gold-soft" />
              <span className="font-bold leading-tight">{t(b.title)}</span>
              <span className="text-xs leading-tight text-parchment/70">{t(b.hint)}</span>
            </li>
          ))}
        </ul>
      </section>

      {rivals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">{t('Rivalitäten')}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {rivals.map((r) => {
              const lead = r.wins - r.losses;
              return (
                <li key={r.profile.id}>
                  <Card className="flex items-center gap-3 p-3">
                    <Avatar profile={r.profile} size="sm" />
                    <span className="min-w-0 flex-1">
                      <Link href={`/profil/${r.profile.username}`} className="block truncate font-bold hover:underline">{r.profile.username}</Link>
                      <span className="block text-xs text-ink-soft">{r.games === 1 ? t('1 Spiel zusammen') : t('{count} Spiele zusammen', { count: r.games })}</span>
                    </span>
                    <span className={cx('tabular rounded-xl px-3 py-1 font-display text-2xl font-bold', lead > 0 ? 'bg-vert/20 text-vert' : lead < 0 ? 'bg-wax/15 text-wax' : 'bg-parchment-dark')}>
                      {r.wins} : {r.losses}
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="-mt-1 text-xs text-parchment/60">{t('Gezählt wird, wer im gemeinsamen Spiel vor dem anderen landete.')}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">{t('Letzte Spiele')}</h2>
        {history.length === 0 ? (
          <Card><p className="text-ink-soft">{isMe ? t('Noch keine Spiele. Eröffne einen Tisch auf der Startseite.') : t('Noch keine beendeten Spiele.')}</p></Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.map((g) => {
              const rows = [
                ...g.players.map((p) => ({ key: p.profile.id, name: p.profile.username, avatar: p.profile, place: p.place, points: p.points, left: p.left, self: p.profile.id === stats.user_id })),
                ...g.bots.map((b) => ({ key: b.name, name: b.name, avatar: { username: b.name, avatar_url: null, emoji: b.emoji }, place: b.place, points: b.points, left: false, self: false })),
              ].sort((x, y) => (x.place ?? 99) - (y.place ?? 99));
              return (
                <li key={g.gameId}>
                  <Card className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-bold text-ink-soft">{dateFmt.format(new Date(g.finishedAt))} · {g.rounds === 1 ? t('1 Runde') : t('{count} Runden', { count: g.rounds })}</p>
                    <ol className="flex flex-col gap-1">
                      {rows.map((p) => (
                        <li key={p.key} className={cx('flex items-center gap-2 rounded-xl px-2 py-1', p.self && 'bg-gold/25', p.left && 'opacity-50')}>
                          <span className="flex w-6 justify-center">{p.place ? <Medal place={p.place} /> : '–'}</span>
                          <Avatar profile={p.avatar} size="xs" />
                          <span className="flex-1 truncate font-bold">{p.name}</span>
                          <span className="tabular font-display text-xl font-bold">{p.points}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

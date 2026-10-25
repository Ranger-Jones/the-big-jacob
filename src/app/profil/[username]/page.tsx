import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatsGrid } from '@/components/stats-grid';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { parseUsernameParam } from '@/lib/username';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { signOut } from '@/server/auth-actions';
import { badgesFor, getHistory, getStatsByUsername } from '@/server/profile-service';
import { AvatarUpload } from './avatar-upload';
import { RenameForm } from './rename-form';

const MEDALS = ['🥇', '🥈', '🥉'];
const dateFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  return { title: parseUsernameParam((await params).username) ?? 'Profil' };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const username = parseUsernameParam((await params).username);
  const me = await requireUser();
  if (!username) notFound();
  const admin = createAdminClient();
  const stats = await getStatsByUsername(admin, username);
  if (!stats) notFound();
  const isMe = stats.user_id === me.id;
  const history = await getHistory(admin, stats.user_id);
  const badges = badgesFor(stats);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pb-12">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {isMe ? <AvatarUpload me={me.id} profile={stats} /> : <Avatar profile={stats} size="xl" className="ring-4 ring-gold" />}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h1 className="break-all text-6xl font-bold">{stats.username}</h1>
          <p className="text-parchment/75">
            {stats.crowns > 0 ? `${stats.crowns}× Großer Jakob gewesen` : 'Noch nie auf dem Thron gesessen'}
            {stats.servant > 0 && ` · ${stats.servant}× Großer Knecht`}
          </p>
          {isMe && (
            <div className="flex flex-wrap items-center gap-2">
              <RenameForm current={stats.username} />
              <form action={signOut}>
                <button type="submit" className="rounded-xl px-3 py-2 text-sm font-bold text-parchment/70 hover:bg-white/10 hover:text-parchment">Abmelden</button>
              </form>
            </div>
          )}
        </div>
      </section>

      <StatsGrid stats={stats} />

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">Abzeichen</h2>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {badges.map((b) => (
            <li
              key={b.id}
              title={b.hint}
              className={cx(
                'flex flex-col items-center gap-1 rounded-2xl p-3 text-center ring-2',
                b.earned ? 'bg-gold/20 ring-gold/60' : 'bg-velvet-deep/50 ring-white/10 opacity-55 grayscale',
              )}
            >
              <span className="text-4xl" aria-hidden>{b.emoji}</span>
              <span className="font-bold leading-tight">{b.title}</span>
              <span className="text-xs leading-tight text-parchment/70">{b.hint}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">Letzte Spiele</h2>
        {history.length === 0 ? (
          <Card><p className="text-ink-soft">{isMe ? 'Noch keine Spiele. Eröffne einen Tisch auf der Startseite.' : 'Noch keine beendeten Spiele.'}</p></Card>
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
                    <p className="text-sm font-bold text-ink-soft">{dateFmt.format(new Date(g.finishedAt))} · {g.rounds} {g.rounds === 1 ? 'Runde' : 'Runden'}</p>
                    <ol className="flex flex-col gap-1">
                      {rows.map((p) => (
                        <li key={p.key} className={cx('flex items-center gap-2 rounded-xl px-2 py-1', p.self && 'bg-gold/25', p.left && 'opacity-50')}>
                          <span className="w-6 text-center">{p.place && p.place <= 3 ? MEDALS[p.place - 1] : p.place ?? '–'}</span>
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

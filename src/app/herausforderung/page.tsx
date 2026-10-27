import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { berlinDay, berlinYesterday } from '@/lib/daily';
import { intlLocale } from '@/lib/i18n/core';
import { getLocale, getT } from '@/lib/i18n/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/server';
import { DailyStart } from './daily-start';
import { Icon, Medal } from '@/components/ui/icons';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Tägliche Herausforderung') };
}

type Row = { user_id: string; points: number; place: number; profiles: { username: string; avatar_url: string | null; avatar_frame: string | null } | null };

export default async function DailyPage() {
  const user = await requireUser();
  const t = await getT();
  const dayFmt = new Intl.DateTimeFormat(intlLocale(await getLocale()), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' });
  const admin = createAdminClient();
  const today = berlinDay();
  const yesterday = berlinYesterday();
  const select = 'user_id, points, place, profiles(username, avatar_url, avatar_frame)';
  const [{ data: rows }, { data: prev }] = await Promise.all([
    admin.from('daily_results').select(select).eq('day', today).order('points', { ascending: false }).order('place').limit(50),
    admin.from('daily_results').select(select).eq('day', yesterday).order('points', { ascending: false }).order('place').limit(1),
  ]);
  const list = (rows ?? []) as unknown as Row[];
  const mine = list.find((r) => r.user_id === user.id);
  const champion = (prev ?? [])[0] as unknown as Row | undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-14">
      <div>
        <h1 className="gold-text text-6xl font-bold">{t('Tägliche Herausforderung')}</h1>
        <p className="mt-1 text-parchment/80">{dayFmt.format(new Date())}: {t('Alle bekommen dieselben Karten. Drei Runden gegen drei gerissene Bots – ein Versuch pro Tag.')}</p>
      </div>

      <Card className="flex flex-col gap-3">
        {mine ? (
          <>
            <h2 className="text-3xl font-bold">{t('Dein Ergebnis heute')}</h2>
            <p className="text-xl"><b>{t('{n} Punkte', { n: mine.points })}</b> · {t('{place}. Platz am Tisch', { place: mine.place })}</p>
            <p className="text-sm text-ink-soft">{t('Morgen wartet eine neue Hand.')}</p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold">{t('Bereit für heute?')}</h2>
            <p className="text-ink-soft">{t('Gezählt werden deine Punkte nach drei Runden. Verlässt du den Tisch, zählt der Versuch nicht.')}</p>
            <DailyStart />
          </>
        )}
      </Card>

      {champion?.profiles && (
        <p className="rounded-2xl bg-velvet-deep/70 p-3 text-center ring-2 ring-gold/40">
          <Icon name="crown" className="text-gold-soft" /> {t('Gestern gewann')} <b>{champion.profiles.username}</b> {t('mit {n} Punkten.', { n: champion.points })}
        </p>
      )}

      <Card className="flex flex-col gap-2 p-0">
        <h2 className="px-5 pt-4 text-3xl font-bold">{t('Rangliste heute')}</h2>
        {list.length === 0 ? (
          <p className="px-5 pb-5 text-ink-soft">{t('Noch niemand hat heute gespielt. Hol dir Platz 1!')}</p>
        ) : (
          <ol className="flex flex-col">
            {list.map((r, i) => (
              <li key={r.user_id} className={cx('flex items-center gap-3 border-t border-line px-5 py-2.5', r.user_id === user.id && 'bg-gold/20')}>
                <span className="w-8 text-center font-display text-2xl font-bold"><Medal place={i + 1} /></span>
                {r.profiles && <Avatar profile={r.profiles} size="sm" />}
                <span className="min-w-0 flex-1 truncate font-bold">{r.profiles?.username ?? '…'}</span>
                <span className="tabular font-display text-2xl font-bold">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </main>
  );
}

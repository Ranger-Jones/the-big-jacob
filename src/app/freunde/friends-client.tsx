'use client';
import Link from 'next/link';
import { InviteToTableButton } from '@/components/social/invite-to-table-button';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useOnlineUsers } from '@/components/app-shell/online-presence';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import {
  removeFriendAction, respondFriendRequestAction, searchAction, sendFriendRequestAction,
} from '@/server/social-actions';
import type { FriendEntry, FriendLists, ProfileLite } from '@/server/social-service';
import { useT } from '@/lib/i18n/client';

function Row({ profile, online, children }: { profile: ProfileLite; online?: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="relative">
        <Avatar profile={profile} size="sm" />
        {online !== undefined && (
          <span className={cx('absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-parchment', online ? 'bg-vert' : 'bg-ink-soft/40')} />
        )}
      </span>
      <Link href={`/profil/${profile.username}`} className="min-w-0 flex-1 truncate font-bold hover:underline">{profile.username}</Link>
      <span className="flex shrink-0 gap-2">{children}</span>
    </li>
  );
}

/** Confirm card for /freunde?add=<username>, e.g. after scanning a friend's QR code with the phone camera. */
function AddFromCodeCard({ profile, onSend, onDismiss }: { profile: ProfileLite; onSend: () => Promise<void>; onDismiss: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="flex flex-col items-center gap-3 text-center ring-2! ring-gold! sm:flex-row sm:text-left">
      <Avatar profile={profile} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-3xl font-bold">{profile.username}</p>
        <p className="text-ink-soft">{t('möchte dich als Freund hinzufügen?')}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Button
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSend();
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="friends" />
          {t('Freundschaftsanfrage senden')}
        </Button>
        <Button variant="ghost" onClick={onDismiss} className="min-h-12">
          <Icon name="close" />
          {t('Nicht jetzt')}
        </Button>
      </div>
    </Card>
  );
}

export function FriendsClient({ me, lists, addProfile = null, hasAddParam = false }: {
  me: string; lists: FriendLists; addProfile?: ProfileLite | null; hasAddParam?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [addDismissed, setAddDismissed] = useState(false);
  const online = useOnlineUsers();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [removing, setRemoving] = useState<FriendEntry | null>(null);
  const known = new Set([...lists.friends, ...lists.incoming, ...lists.outgoing].map((f) => f.profile.id));

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => setResults(q.length >= 2 ? await searchAction(q) : []), q.length >= 2 ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  // Live: show requests and acceptances by others immediately.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const refresh = () => router.refresh();
      channel = supabase.channel(`friends:${me}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${me}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${me}` }, refresh)
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, router, supabase]);

  async function request(username: string) {
    const res = await sendFriendRequestAction(username);
    if (!res.ok) return toast.error(t(res.error));
    toast.success(res.data.status === 'accepted' ? t('Ihr seid jetzt Freunde!') : t('Anfrage an {name} gesendet', { name: username }));
    setQuery('');
    router.refresh();
  }

  // Drops ?add from the address bar (also when the card is not shown: myself, already a friend …).
  const clearAddParam = useCallback(() => router.replace('/freunde', { scroll: false }), [router]);
  useEffect(() => {
    if (hasAddParam && !addProfile) clearAddParam();
  }, [hasAddParam, addProfile, clearAddParam]);

  async function sendFromCode(profile: ProfileLite) {
    const res = await sendFriendRequestAction(profile.username);
    if (!res.ok) return void toast.error(t(res.error));
    toast.success(res.data.status === 'accepted' ? t('Ihr seid jetzt Freunde!') : t('Anfrage an {name} gesendet', { name: profile.username }));
    setAddDismissed(true);
    clearAddParam();
  }

  function dismissAdd() {
    setAddDismissed(true);
    clearAddParam();
  }

  async function respond(entry: FriendEntry, accept: boolean) {
    const res = await respondFriendRequestAction(entry.friendshipId, accept);
    if (!res.ok) return toast.error(t(res.error));
    if (accept) toast.success(t('Du und {name} seid jetzt Freunde', { name: entry.profile.username }));
    router.refresh();
  }

  async function remove(entry: FriendEntry) {
    setRemoving(null);
    const res = await removeFriendAction(entry.friendshipId);
    if (!res.ok) return toast.error(t(res.error));
    router.refresh();
  }

  const friendsSorted = [...lists.friends].sort((a, b) => Number(online.has(b.profile.id)) - Number(online.has(a.profile.id)));

  return (
    <main className="mx-auto grid w-full content-start max-w-5xl flex-1 grid-cols-[minmax(0,1fr)] gap-5 px-4 pb-12 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-5">
        <h1 className="text-5xl font-bold">{t('Freunde')}</h1>
        {addProfile && !addDismissed && (
          <AddFromCodeCard profile={addProfile} onSend={() => sendFromCode(addProfile)} onDismiss={dismissAdd} />
        )}
        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Freunde finden')}</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Benutzername suchen')}
            aria-label={t('Benutzername suchen')}
            className="h-12 rounded-2xl bg-parchment-dark/70 px-4 ring-1 ring-inset ring-line outline-none text-ink placeholder:text-ink-soft/60 focus:bg-white/10 focus:ring-gold-deep"
          />
          {query.trim().length >= 2 && (
            results.length === 0 ? (
              <p className="text-sm text-ink-soft">{t('Niemand mit diesem Namen gefunden.')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {results.map((p) => (
                  <Row key={p.id} profile={p}>
                    {known.has(p.id)
                      ? <span className="text-sm font-semibold text-ink-soft">{t('schon verbunden')}</span>
                      : <Button size="sm" onClick={() => request(p.username)}>{t('Anfrage senden')}</Button>}
                  </Row>
                ))}
              </ul>
            )
          )}
        </Card>

        {(lists.incoming.length > 0 || lists.outgoing.length > 0) && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold">{t('Anfragen')}</h2>
            <ul className="divide-y divide-line">
              {lists.incoming.map((f) => (
                <Row key={f.friendshipId} profile={f.profile}>
                  <Button size="sm" onClick={() => respond(f, true)}>{t('Annehmen')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(f, false)}>{t('Ablehnen')}</Button>
                </Row>
              ))}
              {lists.outgoing.map((f) => (
                <Row key={f.friendshipId} profile={f.profile}>
                  <span className="self-center text-sm font-semibold text-ink-soft">{t('ausstehend')}</span>
                  <Button size="sm" variant="ghost" onClick={() => remove(f)}>{t('Zurückziehen')}</Button>
                </Row>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="flex flex-col gap-2 lg:mt-14">
        <h2 className="text-3xl font-bold">{t('Deine Freunde')}</h2>
        {friendsSorted.length === 0 ? (
          <p className="text-ink-soft">{t('Noch niemand hier. Such oben nach dem Benutzernamen deiner Freunde.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {friendsSorted.map((f) => (
              <Row key={f.friendshipId} profile={f.profile} online={online.has(f.profile.id)}>
                <InviteToTableButton friendId={f.profile.id} username={f.profile.username} compact />
                <Button size="sm" variant="ghost" onClick={() => setRemoving(f)}>{t('Entfernen')}</Button>
              </Row>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title={t('Freund entfernen?')}>
        <p className="text-ink-soft">{t('{name} verschwindet aus deiner Freundesliste.', { name: removing?.profile.username ?? '' })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>{t('Abbrechen')}</Button>
          <Button variant="danger" onClick={() => removing && remove(removing)}>{t('Entfernen')}</Button>
        </div>
      </Modal>
    </main>
  );
}

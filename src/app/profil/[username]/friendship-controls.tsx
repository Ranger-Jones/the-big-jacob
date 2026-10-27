'use client';
import { useRouter } from 'next/navigation';
import { InviteToTableButton } from '@/components/social/invite-to-table-button';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { removeFriendAction, respondFriendRequestAction, sendFriendRequestAction } from '@/server/social-actions';
import type { FriendshipWith } from '@/server/social-service';
import { useT } from '@/lib/i18n/client';

/** Friendship status with the person whose profile is shown, plus the matching actions. */
export function FriendshipControls({ username, friendId, initial }: { username: string; friendId?: string; initial: FriendshipWith }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { status, friendshipId } = initial;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (!res.ok) return toast.error(t(res.error ?? 'Das hat nicht geklappt.'));
    if (success) toast.success(success);
    router.refresh();
  }

  const send = () => run(async () => {
    const res = await sendFriendRequestAction(username);
    if (res.ok && res.data.status === 'accepted') toast.success(t('Du und {name} seid jetzt Freunde', { name: username }));
    else if (res.ok) toast.success(t('Anfrage an {name} gesendet', { name: username }));
    return res;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'none' && (
        <Button size="sm" onClick={send} disabled={busy}><Icon name="friends" className="size-5" /> {t('Freundschaftsanfrage senden')}</Button>
      )}

      {status === 'outgoing' && friendshipId && (
        <>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-parchment/85 ring-1 ring-white/15">
            <Icon name="hourglass" /> {t('Anfrage gesendet')}
          </span>
          <Button size="sm" variant="ghost" onClick={() => run(() => removeFriendAction(friendshipId), t('Anfrage zurückgezogen'))} disabled={busy}>
            {t('Zurückziehen')}
          </Button>
        </>
      )}

      {status === 'incoming' && friendshipId && (
        <>
          <span className="flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-gold-soft ring-1 ring-gold/50">
            <Icon name="mail" /> {t('{name} möchte mit dir befreundet sein', { name: username })}
          </span>
          <Button size="sm" onClick={() => run(() => respondFriendRequestAction(friendshipId, true), t('Du und {name} seid jetzt Freunde', { name: username }))} disabled={busy}>
            {t('Annehmen')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => run(() => respondFriendRequestAction(friendshipId, false))} disabled={busy}>
            {t('Ablehnen')}
          </Button>
        </>
      )}

      {status === 'friends' && friendshipId && (
        <>
          <span className="flex items-center gap-1.5 rounded-full bg-vert/15 px-3 py-1 text-sm font-bold text-[#7fe0a8] ring-1 ring-vert/50">
            <Icon name="check-circle" /> {t('Ihr seid befreundet')}
          </span>
          {friendId && <InviteToTableButton friendId={friendId} username={username} />}
          <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={busy}>{t('Freund entfernen')}</Button>
          <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)} title={t('Freund entfernen?')}>
            <p className="text-ink-soft">{t('{name} verschwindet aus deiner Freundesliste. Ihr könnt euch jederzeit wieder eine Anfrage schicken.', { name: username })}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmRemove(false)}>{t('Behalten')}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmRemove(false);
                  void run(() => removeFriendAction(friendshipId), t('{name} ist nicht mehr in deiner Freundesliste', { name: username }));
                }}
              >
                {t('Entfernen')}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

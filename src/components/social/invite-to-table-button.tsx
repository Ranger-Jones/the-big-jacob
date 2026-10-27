'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';
import { inviteFriendToTableAction } from '@/server/game-actions';
import { useT } from '@/lib/i18n/client';

/** Invites a friend into my open lobby (or a new table) and takes me there. */
export function InviteToTableButton({ friendId, username, compact, className }: {
  friendId: string; username: string; compact?: boolean; className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    const res = await inviteFriendToTableAction(friendId);
    if (!res.ok) {
      setBusy(false);
      return toast.error(t(res.error));
    }
    toast.success(res.data.alreadyThere
      ? t('{name} sitzt schon an deinem Tisch', { name: username })
      : res.data.created ? t('Neuer Tisch eröffnet – {name} ist eingeladen', { name: username }) : t('{name} ist an deinen Tisch eingeladen', { name: username }));
    router.push(`/spiel/${res.data.code}`);
  }

  return (
    <Button
      size="sm"
      variant={compact ? 'velvet' : 'primary'}
      onClick={invite}
      disabled={busy}
      aria-label={t('{name} an den Tisch einladen', { name: username })}
      className={cx(compact && 'px-2', className)}
    >
      <Icon name="cards" className="size-5" />
      {!compact && <span>{busy ? t('Lädt ein …') : t('An den Tisch einladen')}</span>}
    </Button>
  );
}

'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';
import { inviteFriendToTableAction } from '@/server/game-actions';

/** Invites a friend into my open lobby (or a new table) and takes me there. */
export function InviteToTableButton({ friendId, username, compact, className }: {
  friendId: string; username: string; compact?: boolean; className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    const res = await inviteFriendToTableAction(friendId);
    if (!res.ok) {
      setBusy(false);
      return toast.error(res.error);
    }
    toast.success(res.data.alreadyThere
      ? `${username} sitzt schon an deinem Tisch`
      : res.data.created ? `Neuer Tisch eröffnet – ${username} ist eingeladen` : `${username} ist an deinen Tisch eingeladen`);
    router.push(`/spiel/${res.data.code}`);
  }

  return (
    <Button
      size="sm"
      variant={compact ? 'velvet' : 'primary'}
      onClick={invite}
      disabled={busy}
      aria-label={`${username} an den Tisch einladen`}
      className={cx(compact && 'px-2', className)}
    >
      <Icon name="cards" className="size-5" />
      {!compact && <span>{busy ? 'Lädt ein …' : 'An den Tisch einladen'}</span>}
    </Button>
  );
}

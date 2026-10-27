'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { respondFriendRequestAction } from '@/server/social-actions';
import type { FriendEntry } from '@/server/social-service';
import { useT } from '@/lib/i18n/client';

export function FriendRequests({ requests }: { requests: FriendEntry[] }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(entry: FriendEntry, accept: boolean) {
    setBusy(entry.friendshipId);
    const res = await respondFriendRequestAction(entry.friendshipId, accept);
    setBusy(null);
    if (!res.ok) return toast.error(t(res.error));
    if (accept) toast.success(t('Du und {name} seid jetzt Freunde', { name: entry.profile.username }));
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r) => (
        <li key={r.friendshipId} className="flex flex-wrap items-center gap-3">
          <Avatar profile={r.profile} size="sm" />
          <span className="min-w-0 flex-1 basis-48 break-words leading-snug">
            <Link href={`/profil/${r.profile.username}`} className="font-bold hover:underline">{r.profile.username}</Link> {t('möchte mit dir befreundet sein')}
          </span>
          <span className="flex gap-2">
            <Button size="sm" onClick={() => respond(r, true)} disabled={busy === r.friendshipId}>{t('Annehmen')}</Button>
            <Button size="sm" variant="ghost" onClick={() => respond(r, false)} disabled={busy === r.friendshipId}>{t('Ablehnen')}</Button>
          </span>
        </li>
      ))}
    </ul>
  );
}

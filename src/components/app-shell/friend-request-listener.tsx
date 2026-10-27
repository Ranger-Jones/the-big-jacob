'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { respondFriendRequestAction } from '@/server/social-actions';
import { Icon } from '@/components/ui/icons';
import { useT } from '@/lib/i18n/client';

/**
 * Keeps the friend-request badge and the dashboard live: any change to a friendship addressed to me
 * refreshes the page data; a new request also pops up with accept / decline.
 */
export function FriendRequestListener({ me }: { me: string }) {
  const t = useT();
  const tRef = useRef(t);
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
    tRef.current = t;
  }, [pathname, t]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function announce(friendshipId: string) {
      const t = tRef.current;
      const { data } = await supabase.from('friendships')
        .select('id, status, requester:profiles!friendships_requester_id_fkey(username)')
        .eq('id', friendshipId).maybeSingle();
      if (!data || data.status !== 'pending' || pathRef.current.startsWith('/spiel/')) return;
      const name = (data.requester as { username: string } | null)?.username ?? t('Jemand');
      toast(t('{name} möchte mit dir befreundet sein', { name }), {
        icon: <Icon name="friends" className="size-5 text-gold-deep" />,
        id: `friend-${friendshipId}`,
        duration: 20_000,
        action: {
          label: t('Annehmen'),
          onClick: async () => {
            const res = await respondFriendRequestAction(friendshipId, true);
            if (res.ok) toast.success(t('Du und {name} seid jetzt Freunde', { name }));
            else toast.error(t(res.error));
            router.refresh();
          },
        },
        cancel: {
          label: t('Ablehnen'),
          onClick: () => { void respondFriendRequestAction(friendshipId, false).then(() => router.refresh()); },
        },
      });
    }

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`friend-requests:${me}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${me}` }, (payload) => {
          router.refresh();
          const row = payload.new as { id?: string; status?: string } | null;
          if (payload.eventType === 'INSERT' && row?.id && row.status === 'pending') void announce(row.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${me}` }, () => router.refresh())
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, router, supabase]);

  return null;
}

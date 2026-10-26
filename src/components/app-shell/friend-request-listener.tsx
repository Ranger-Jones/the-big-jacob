'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { respondFriendRequestAction } from '@/server/social-actions';
import { Icon } from '@/components/ui/icons';

/**
 * Keeps the friend-request badge and the dashboard live: any change to a friendship addressed to me
 * refreshes the page data; a new request also pops up with accept / decline.
 */
export function FriendRequestListener({ me }: { me: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function announce(friendshipId: string) {
      const { data } = await supabase.from('friendships')
        .select('id, status, requester:profiles!friendships_requester_id_fkey(username)')
        .eq('id', friendshipId).maybeSingle();
      if (!data || data.status !== 'pending' || pathRef.current.startsWith('/spiel/')) return;
      const name = (data.requester as { username: string } | null)?.username ?? 'Jemand';
      toast(`${name} möchte mit dir befreundet sein`, {
        icon: <Icon name="friends" className="size-5 text-gold-deep" />,
        id: `friend-${friendshipId}`,
        duration: 20_000,
        action: {
          label: 'Annehmen',
          onClick: async () => {
            const res = await respondFriendRequestAction(friendshipId, true);
            if (res.ok) toast.success(`Du und ${name} seid jetzt Freunde`);
            else toast.error(res.error);
            router.refresh();
          },
        },
        cancel: {
          label: 'Ablehnen',
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

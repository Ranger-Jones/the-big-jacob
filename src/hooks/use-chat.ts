'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { sendChatAction } from '@/server/chat-actions';

export interface ChatMessage { id: string; user_id: string; body: string; created_at: string }

/** Chat of one game: last 100 messages plus live inserts. */
export function useChat(gameId: string, me: string, enabled: boolean, onIncoming?: (m: ChatMessage) => void) {
  const t = useT();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const incoming = useRef(onIncoming);
  useEffect(() => {
    incoming.current = onIncoming;
  }, [onIncoming]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const { data } = await supabase.from('game_messages').select('id, user_id, body, created_at')
        .eq('game_id', gameId).order('created_at', { ascending: false }).limit(100);
      if (!cancelled && data) setMessages(data.reverse());
      channel = supabase.channel(`chat:${gameId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_id=eq.${gameId}` }, (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list.slice(-149), m]));
          if (m.user_id !== me) incoming.current?.(m);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, gameId, me, supabase]);

  const send = useCallback(async (body: string) => {
    const res = await sendChatAction(gameId, body);
    if (!res.ok) toast.error(t(res.error));
    return res.ok;
  }, [gameId, t]);

  return { messages, send };
}

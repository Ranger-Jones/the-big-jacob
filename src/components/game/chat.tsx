'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cx } from '@/lib/cx';
import { QUICK_PHRASES } from '@/lib/emojis';
import type { ChatMessage } from '@/hooks/use-chat';
import { CHAT_MAX } from '@/server/chat-limits';
import { useTable } from './table-context';

const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export function ChatPanel({ messages, onSend, className }: { messages: ChatMessage[]; onSend: (body: string) => Promise<boolean>; className?: string }) {
  const { me, nameOf, avatarOf, colorOf } = useTable();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function send(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    if (await onSend(trimmed)) setText('');
    setSending(false);
  }

  return (
    <div className={cx('flex min-h-0 flex-col gap-2', className)}>
      <ol ref={list} className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">Noch still am Hof. Sag was!</li>}
        {messages.map((m) => {
          const mine = m.user_id === me;
          return (
            <li key={m.id} className={cx('flex items-end gap-2', mine && 'flex-row-reverse')}>
              <Avatar profile={avatarOf(m.user_id)} ring={colorOf(m.user_id)} size="xs" />
              <span className={cx('max-w-[80%] rounded-2xl px-3 py-1.5 text-sm', mine ? 'rounded-br-sm bg-wine text-parchment' : 'rounded-bl-sm bg-parchment-dark')}>
                {!mine && <span className="block text-xs font-bold" style={{ color: colorOf(m.user_id) }}>{nameOf(m.user_id)}</span>}
                <span className="whitespace-pre-wrap break-words">{m.body}</span>
                <span className={cx('ml-2 text-[0.65rem]', mine ? 'text-parchment/60' : 'text-ink-soft')}>{time.format(new Date(m.created_at))}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {QUICK_PHRASES.map((p) => (
          <button key={p} type="button" onClick={() => send(p)} className="shrink-0 rounded-full bg-parchment-dark px-3 py-1 text-xs font-bold text-ink-soft ring-1 ring-line hover:bg-white/70">
            {p}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX}
          placeholder="Nachricht an den Tisch"
          aria-label="Nachricht"
          className="h-11 min-w-0 flex-1 rounded-xl bg-white/60 px-3 text-ink ring-2 ring-inset ring-line outline-none focus:ring-gold-deep"
        />
        <button type="submit" disabled={!text.trim() || sending} className="h-11 rounded-xl bg-wine px-4 font-bold text-parchment disabled:opacity-50">
          Senden
        </button>
      </form>
    </div>
  );
}

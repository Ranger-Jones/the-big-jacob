'use client';
/* eslint-disable @next/next/no-img-element -- small static SVG portraits, cached by the art route */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { botArtUrl } from '@/lib/bot-art';
import { useT } from '@/lib/i18n/client';
import { useTable } from './table-context';

const SHOW_MS = 4500;

/** What a persona bot just said, as a speech bubble with its portrait over the table. */
export function QuipBubble() {
  const t = useT();
  const { state } = useTable();
  const quip = state.quip;
  // A line from the last couple of moves still pops up when the table opens (the greeting at the start).
  const seen = useRef(quip && state.moveSeq - quip.seq > 2 ? quip.seq : null);
  const [shown, setShown] = useState<NonNullable<typeof quip> | null>(null);

  // Keyed by the line's seq: every state update brings a fresh quip object, which must not restart
  // (or cancel) the timer of a line that is already showing.
  const seq = quip?.seq ?? null;
  useEffect(() => {
    // Older lines that were already there when the table opened stay quiet.
    if (!quip || seq === seen.current) return;
    seen.current = seq;
    setShown(quip);
    const timer = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [seq]);

  const bot = shown ? state.players.find((p) => p.id === shown.by)?.bot : null;
  return (
    <AnimatePresence>
      {shown && bot && (
        <motion.div
          key={shown.seq}
          role="status"
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          className="pointer-events-none fixed left-1/2 top-[5.5rem] z-40 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center gap-3"
        >
          <img src={botArtUrl(bot.name)} alt="" className="size-14 shrink-0 rounded-full ring-4 ring-gold shadow-lg" />
          <p className="parchment relative rounded-2xl px-4 py-2.5 text-base font-bold leading-snug shadow-[0_4px_0_rgb(0_0_0/0.35)] ring-2 ring-gold/70">
            <span aria-hidden className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-inherit ring-2 ring-gold/70 [clip-path:polygon(0_0,0_100%,100%_100%)]" />
            <span className="block text-xs text-ink-soft">{t(bot.name)}</span>
            „{t(shown.text)}“
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

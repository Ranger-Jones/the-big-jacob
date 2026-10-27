'use client';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PlayingCard } from '@/components/deck/playing-card';
import { CrownMark } from '@/components/ui/logo';
import { useT } from '@/lib/i18n/client';
import { describeCards, describeLog, EVENT_TEXT } from '@/lib/jakob/texts';
import { useTable } from './table-context';
import { BURST_KINDS, TableBurst, type BurstKind } from './table-burst';
import type { LogEntry } from '@/lib/jakob/types';
import { EVENT_ICONS, Icon, LOG_ICONS, stripEmoji } from '@/components/ui/icons';

function tilt(seq: number, i: number) {
  return (((seq * 37 + i * 53) % 17) - 8) * 0.9;
}

/** Fine velvet grain for the felt (SVG turbulence as a data URI). */
const FELT_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The royal table: carved wooden rim with gold inlay around wine-red velvet.
 * All rows have fixed heights so the table never grows or shrinks during play.
 */
export function TrickArea() {
  const t = useT();
  const { state, me, nameOf, deckOf, felt } = useTable();
  const reduce = useReducedMotion();
  const trick = state.trick;
  const fromMe = trick?.by === me;
  const log = state.log
    .filter((e) => e.kind !== 'tax' && e.kind !== 'event')
    .slice(-3)
    .reverse()
    .map((e) => ({ seq: e.seq, kind: e.kind, text: describeLog(e, (id) => nameOf(id), t, me) }))
    .filter((e) => e.text);

  // Special plays get a burst over the table – only ones that happen while we watch.
  const [mountedAt] = useState(() => state.log.at(-1)?.seq ?? -1);
  const burst = (state.log.slice(-3).reverse().find((e) => BURST_KINDS.includes(e.kind) && e.seq > mountedAt) ?? null) as
    (LogEntry & { kind: BurstKind }) | null;
  const burstSubtitle = !burst ? null
    : burst.kind === 'snap' ? (burst.to === me ? t('Du setzt aus') : t('{name} setzt aus', { name: nameOf(burst.to ?? '') }))
      : burst.kind === 'bomb' ? (burst.by === me ? t('Du sprengst den Stich') : t('{name} sprengt den Stich', { name: nameOf(burst.by ?? '') }))
        : burst.by === me ? t('Du gewinnst den Stich') : t('{name} gewinnt den Stich', { name: nameOf(burst.by ?? '') });
  const [rim, animateRim] = useAnimate();
  const burstKey = burst ? `${burst.kind}-${burst.seq}` : null;
  useEffect(() => {
    if (!burstKey || reduce || !rim.current) return;
    void animateRim(rim.current, burstKey.startsWith('unbeatable') ? { scale: [1, 1.03, 1] } : { x: [0, -10, 9, -6, 5, -2, 0] }, { duration: 0.5 });
  }, [burstKey, reduce, animateRim, rim]);

  return (
    <div className="relative mx-auto w-full max-w-3xl pt-2.5 sm:pt-3">
      {/* Spotlight: a soft cone of torch light falling onto the table */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[34rem] w-[150%] max-w-[56rem] -translate-x-1/2"
        style={{
          background: 'radial-gradient(ellipse 46% 52% at 50% 64%, rgb(255 214 140 / 0.2), transparent 72%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[110%] max-w-[44rem] -translate-x-1/2 opacity-60"
        style={{
          clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(180deg, rgb(255 226 170 / 0.16), rgb(255 214 140 / 0.04) 70%, transparent)',
        }}
      />
      {state.event && (
        <span
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-velvet-deep px-3 py-1 text-xs font-bold text-gold-soft ring-2 ring-gold/50 shadow-[0_3px_0_rgb(0_0_0/0.4)]"
          title={t(EVENT_TEXT[state.event].text)}
        >
          <Icon name={EVENT_ICONS[state.event] ?? 'sparkles'} /> {t(EVENT_TEXT[state.event].title)}
        </span>
      )}

      {/* Carved wooden rim */}
      <div
        ref={rim}
        className="relative rounded-[50%/42%] p-[7px] shadow-[0_10px_0_rgb(0_0_0/0.35),0_20px_34px_rgb(0_0_0/0.45)] sm:p-[14px]"
        style={{
          background:
            'repeating-linear-gradient(100deg, rgb(255 255 255 / 0.04) 0 6px, transparent 6px 14px), linear-gradient(180deg, #8a5a2e 0%, #5c3519 45%, #3a1f0d 100%)',
        }}
      >
        {/* Gold inlay */}
        <div className="rounded-[50%/42%] bg-gradient-to-b from-gold-soft via-gold to-gold-deep p-[3px]">
          {/* Velvet felt */}
          <div
            className="relative flex h-[12.75rem] flex-col items-center overflow-hidden rounded-[50%/42%] px-4 pt-4 sm:h-[19.5rem] sm:pt-8"
            style={{
              backgroundColor: felt.colors[1],
              backgroundImage: `${FELT_GRAIN}, radial-gradient(ellipse at 50% 35%, ${felt.colors[0]} 0%, ${felt.colors[1]} 45%, ${felt.colors[2]} 100%)`,
              boxShadow: 'inset 0 0 50px rgb(0 0 0 / 0.6), inset 0 6px 0 rgb(0 0 0 / 0.25)',
            }}
          >
            <TableBurst entry={burst} subtitle={burstSubtitle} />
            {/* Woven border and crest watermark */}
            <span aria-hidden className="pointer-events-none absolute inset-3 rounded-[50%/42%] border border-dashed border-gold/25" />
            <CrownMark className="pointer-events-none absolute left-1/2 top-1/2 size-28 sm:size-40 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] grayscale" />
            <span aria-hidden className="pointer-events-none absolute inset-x-[20%] top-0 h-1/2 rounded-b-full bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_220_160/0.18),transparent_70%)]" />

            <div className="relative flex h-[6.4rem] w-full items-center justify-center sm:h-[9.5rem]" aria-live="polite">
              <AnimatePresence mode="popLayout">
                {trick ? (
                  <motion.div
                    key={trick.seq}
                    className="flex items-center"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: fromMe ? 160 : -140, scale: 0.7, rotate: fromMe ? 0 : -8 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: -18, filter: 'blur(2px)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  >
                    {trick.cards.map((c, i) => (
                      <PlayingCard
                        key={i}
                        rank={c}
                        deck={deckOf(trick.by)}
                        size="lg"
                        className="-ml-10 first:ml-0 max-sm:!w-[3.7rem] max-sm:-ml-8 shadow-[0_6px_10px_rgb(0_0_0/0.45)]"
                        style={{ rotate: `${tilt(trick.seq, i)}deg`, zIndex: i }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-xs text-center font-display text-2xl text-parchment/70"
                  >
                    {state.phase === 'play' && state.turn ? (state.turn === me ? t('Du spielst aus') : t('{name} spielt aus', { name: nameOf(state.turn) })) : t('Der Tisch ist leer')}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <p className="relative h-5 max-w-full truncate text-center text-xs font-bold text-parchment/90 sm:h-6 sm:text-sm">
              {trick ? (
                <>
                  {nameOf(trick.by, true)}: {describeCards(trick.cards, t)}
                  <span className="text-parchment/60"> · {trick.count === 1 ? t('schlage mit 1 Karte') : t('schlage mit {count} Karten', { count: trick.count })}</span>
                </>
              ) : ' '}
            </p>

            <ul className="relative flex h-[2.6rem] w-full max-w-md flex-col items-center gap-0.5 overflow-hidden text-center text-xs text-parchment/70 sm:h-[3.9rem] sm:text-sm">
              <AnimatePresence initial={false}>
                {log.map((e, i) => (
                  <motion.li
                    key={`${e.seq}-${e.kind}`}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1 - i * 0.3, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="max-w-full truncate"
                  >
                    {LOG_ICONS[e.kind] && <Icon name={LOG_ICONS[e.kind]} className="mr-1 text-gold-soft" />}
                    {stripEmoji(e.text ?? '')}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

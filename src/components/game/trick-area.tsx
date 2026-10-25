'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlayingCard } from '@/components/deck/playing-card';
import { describeCards, describeLog, EVENT_TEXT } from '@/lib/jakob/texts';
import { useTable } from './table-context';

function tilt(seq: number, i: number) {
  return (((seq * 37 + i * 53) % 17) - 8) * 0.9;
}

/** The velvet table in the middle: the current trick, who laid it and a short log. */
export function TrickArea() {
  const { state, me, nameOf, deckOf } = useTable();
  const reduce = useReducedMotion();
  const trick = state.trick;
  const fromMe = trick?.by === me;
  const log = state.log
    .filter((e) => e.kind !== 'tax' && e.kind !== 'event')
    .slice(-3)
    .reverse()
    .map((e) => ({ seq: e.seq, kind: e.kind, text: describeLog(e, (id) => nameOf(id, true)) }))
    .filter((e) => e.text);

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-[50%/38%] border-4 border-gold-deep/70 bg-wine px-4 py-5 shadow-[inset_0_0_60px_rgb(0_0_0/0.55),0_10px_0_rgb(0_0_0/0.35)] sm:py-7">
      <span aria-hidden className="pointer-events-none absolute inset-2 rounded-[50%/38%] border border-gold/25" />
      {state.event && (
        <span className="absolute -top-4 rounded-full bg-velvet-deep px-3 py-1 text-xs font-bold text-gold-soft ring-2 ring-gold/40" title={EVENT_TEXT[state.event].text}>
          {EVENT_TEXT[state.event].emoji} {EVENT_TEXT[state.event].title}
        </span>
      )}

      <div className="relative flex min-h-[7rem] items-center justify-center sm:min-h-[9rem]" aria-live="polite">
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
                  className="-ml-10 first:ml-0 max-sm:!w-[4.2rem] max-sm:-ml-9"
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
              {state.phase === 'play' && state.turn ? `${nameOf(state.turn, true)} ${state.turn === me ? 'spielst' : 'spielt'} aus` : 'Der Tisch ist leer'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {trick && (
        <p className="text-center text-sm font-bold text-parchment/90">
          {nameOf(trick.by, true)}: {describeCards(trick.cards)}
          <span className="text-parchment/60"> · schlage mit {trick.count} {trick.count === 1 ? 'Karte' : 'Karten'}</span>
        </p>
      )}

      <ul className="flex min-h-[3.6rem] w-full max-w-md flex-col items-center gap-0.5 text-center text-xs text-parchment/70 sm:text-sm">
        <AnimatePresence initial={false}>
          {log.map((e, i) => (
            <motion.li
              key={`${e.seq}-${e.kind}`}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1 - i * 0.3, y: 0 }}
              exit={{ opacity: 0 }}
              className="truncate"
            >
              {e.text}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

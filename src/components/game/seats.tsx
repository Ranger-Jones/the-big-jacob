'use client';
import { AnimatePresence, motion } from 'motion/react';
import { CardBack } from '@/components/deck/playing-card';
import { Avatar } from '@/components/ui/avatar';
import { cx } from '@/lib/cx';
import { rankEmoji, rankTitle, waitingOn } from '@/lib/jakob/engine';
import { useTable } from './table-context';

/** Fraction of the current deadline that is left (1 → 0). */
export function deadlineFraction(now: number, total: number | null, deadline: string | null) {
  if (!deadline || !total) return null;
  const left = Date.parse(deadline) - now;
  return Math.max(0, Math.min(1, left / (total * 1000)));
}

function TimerRing({ fraction, color }: { fraction: number; color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-1.5 rounded-full"
      style={{
        background: `conic-gradient(${fraction < 0.25 ? 'var(--color-wax)' : color} ${fraction * 360}deg, transparent 0)`,
        mask: 'radial-gradient(circle, transparent 62%, #000 64%)',
        WebkitMask: 'radial-gradient(circle, transparent 62%, #000 64%)',
      }}
    />
  );
}

/** Opponents (and you) in rank order around the top of the table. */
export function Seats({ timer }: { timer: number | null }) {
  const { state, me, nameOf, avatarOf, deckOf, colorOf, g } = useTable();
  const order = state.order.length ? state.order : state.players.map((p) => p.id);
  const waiting = new Set(waitingOn(state));
  const present = order.filter((id) => !state.players.find((p) => p.id === id)?.left);
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 pt-2 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label="Spieler am Tisch">
      {order.map((id) => {
        const p = state.players.find((x) => x.id === id);
        if (!p) return null;
        const index = present.indexOf(id);
        const count = state.handCounts[id] ?? 0;
        const isTurn = state.phase === 'play' && state.turn === id;
        const passed = state.phase === 'play' && state.passed.includes(id);
        const finishedAt = state.finished.indexOf(id);
        const out = finishedAt >= 0 || state.shamed.includes(id);
        const isWaiting = waiting.has(id) && state.phase !== 'play';
        const deck = deckOf(id);
        return (
          <li
            key={id}
            className={cx(
              'relative flex w-[6.6rem] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl px-1.5 pb-2 pt-2.5 text-center transition-all',
              isTurn ? 'bg-gold/20 ring-2 ring-gold' : 'bg-velvet-deep/60 ring-2 ring-white/10',
              p.left && 'opacity-40',
            )}
          >
            <span className="relative">
              {isTurn && timer !== null && <TimerRing fraction={timer} color="var(--color-gold)" />}
              <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="md" className={cx(isTurn && 'animate-pulse-ring')} />
              {!p.bot && !p.left && (
                <span className={cx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-velvet-deep', g.online.has(id) ? 'bg-vert' : 'bg-ink-soft')} />
              )}
              {index >= 0 && state.phase && state.phase !== 'draw' && (
                <span className="absolute -left-2 -top-2 text-lg drop-shadow" title={rankTitle(index, present.length)} aria-hidden>
                  {rankEmoji(index, present.length)}
                </span>
              )}
            </span>
            <span className="w-full truncate text-sm font-bold leading-tight">{nameOf(id, true)}</span>
            <span className="w-full truncate text-[0.7rem] leading-tight text-parchment/70">
              {index >= 0 && state.phase !== 'draw' ? rankTitle(index, present.length) : p.bot ? 'Bot' : 'Höfling'}
            </span>
            <span className="flex h-8 items-center gap-1">
              {p.left ? (
                <span className="text-xs font-bold">ist gegangen</span>
              ) : state.phase === 'draw' ? (
                state.draws[id] !== undefined ? <span className="text-xs font-bold text-gold-soft">zog eine {state.draws[id] === 13 ? 'Narr' : state.draws[id]}</span> : <span className="text-xs">zieht …</span>
              ) : out ? (
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-ink">
                  {state.shamed.includes(id) ? '🤡 raus' : `${finishedAt + 1}. raus`}
                </span>
              ) : (
                <>
                  <CardBack design={deck.design} size="xs" className="!w-5" />
                  <span className="tabular font-display text-xl font-bold" aria-label={`${count} Karten`}>{count}</span>
                </>
              )}
            </span>
            <AnimatePresence>
              {(passed || isWaiting) && (
                <motion.span
                  initial={{ opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cx(
                    'absolute -bottom-2.5 rounded-full px-2 py-0.5 text-[0.7rem] font-bold shadow',
                    passed ? 'bg-parchment text-ink' : 'bg-velvet-soft text-parchment',
                  )}
                >
                  {passed ? 'passt' : 'überlegt …'}
                </motion.span>
              )}
            </AnimatePresence>
            {(state.phase === 'play' || state.phase === 'roundEnd') && (
              <span className="tabular absolute right-1.5 top-1 text-[0.7rem] font-bold text-gold-soft" title="Punkte">{state.points[id] ?? 0}</span>
            )}
            {p.id === me && <span className="sr-only">Das bist du</span>}
          </li>
        );
      })}
    </ul>
  );
}

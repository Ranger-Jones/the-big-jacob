'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { CardBack } from '@/components/deck/playing-card';
import { Avatar } from '@/components/ui/avatar';
import { cx } from '@/lib/cx';
import { rankEmoji, rankTitle, waitingOn } from '@/lib/jakob/engine';
import { TEAM_INFO } from '@/lib/jakob/texts';
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
  const list = useRef<HTMLUListElement>(null);
  const focus = state.phase === 'play' ? state.turn : null;
  // On phones the seats scroll sideways: keep whoever is on turn in view.
  useEffect(() => {
    const ul = list.current;
    const li = focus ? ul?.querySelector<HTMLElement>(`[data-seat="${focus}"]`) : null;
    if (!ul || !li || ul.scrollWidth <= ul.clientWidth) return;
    ul.scrollTo({ left: li.offsetLeft - (ul.clientWidth - li.clientWidth) / 2, behavior: 'smooth' });
  }, [focus]);
  return (
    <ul ref={list} className="no-scrollbar relative -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-2 pt-2 sm:gap-2 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label="Spieler am Tisch">
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
            data-seat={id}
            className={cx(
              'relative flex w-[5.1rem] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl px-1 pb-1 pt-2 text-center transition-all duration-300 sm:w-[6.4rem]',
              passed && !isTurn && 'opacity-55',
              state.teams && state.teams[id] !== undefined && (state.teams[id] === 0 ? 'border-b-4 border-[#6c2a8e]' : 'border-b-4 border-[#2f7a4f]'),
              p.left && 'opacity-40',
            )}
          >
            {/* Medallion: gold frame, glowing while on turn */}
            <span
              className={cx(
                'relative rounded-full p-[3px] transition-shadow duration-300',
                isTurn ? 'bg-gradient-to-b from-gold-soft to-gold-deep shadow-[0_0_0_4px_rgb(244_183_58/0.22),0_0_22px_rgb(244_183_58/0.55)]' : 'bg-gold-deep/70',
              )}
            >
              {isTurn && timer !== null && <TimerRing fraction={timer} color="var(--color-gold)" />}
              <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="md" className="max-sm:!size-10" />
              {!p.bot && !p.left && (
                <span className={cx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-velvet-deep', g.online.has(id) ? 'bg-vert' : 'bg-ink-soft')} />
              )}
              {p.autopilot && (
                <span className="absolute -bottom-1 -left-2 rounded-full bg-velvet-soft px-1 text-xs ring-2 ring-velvet-deep" title="Ein Bot spielt gerade für diese Person">🤖</span>
              )}
              {index >= 0 && state.phase && state.phase !== 'draw' && (
                <span className="absolute -left-2 -top-2 text-lg drop-shadow" title={rankTitle(index, present.length)} aria-hidden>
                  {rankEmoji(index, present.length)}
                </span>
              )}
            </span>
            <span className={cx('w-full truncate text-xs font-bold leading-tight sm:text-sm', isTurn && 'text-gold-soft')}>
              {state.teams && state.teams[id] !== undefined && <span aria-label={TEAM_INFO[state.teams[id]].name}>{TEAM_INFO[state.teams[id]].emoji} </span>}
              {nameOf(id, true)}
            </span>
            <span className="hidden w-full truncate text-[0.7rem] leading-tight text-parchment/70 sm:block">
              {index >= 0 && state.phase !== 'draw' ? rankTitle(index, present.length) : p.bot ? 'Bot' : 'Höfling'}
            </span>
            <span className="flex h-6 items-center gap-1 rounded-full bg-black/30 px-2 sm:h-7">
              {p.left ? (
                <span className="text-xs font-bold">ist gegangen</span>
              ) : state.phase === 'draw' ? (
                state.draws[id] !== undefined ? <span className="text-xs font-bold text-gold-soft">zog eine {state.draws[id] === 13 ? 'Narr' : state.draws[id]}</span> : <span className="text-xs">zieht …</span>
              ) : passed ? (
                <span className="text-xs font-bold text-parchment/75">passt</span>
              ) : out ? (
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-[#2b1a12]">
                  {state.shamed.includes(id) ? '🤡 raus' : `${finishedAt + 1}. raus`}
                </span>
              ) : (
                <>
                  <CardBack design={deck.design} size="xs" className="!w-3.5" />
                  <span className="tabular whitespace-nowrap text-xs font-bold sm:text-sm" aria-label={`${count} Karten`}>{count}<span className="hidden sm:inline"> {count === 1 ? 'Karte' : 'Karten'}</span></span>
                </>
              )}
            </span>
            <AnimatePresence>
              {isWaiting && (
                <motion.span
                  initial={{ opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cx(
                    'absolute -bottom-2.5 rounded-full px-2 py-0.5 text-[0.7rem] font-bold shadow',
                    'bg-velvet-soft text-parchment',
                  )}
                >
                  überlegt …
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

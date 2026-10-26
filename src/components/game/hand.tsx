'use client';
import { motion } from 'motion/react';
import { PlayingCard } from '@/components/deck/playing-card';
import { cx } from '@/lib/cx';
import type { DeckEntry } from '@/lib/decks';
import { countBy, JESTER, rankWord } from '@/lib/jakob/cards';
import type { Trick } from '@/lib/jakob/types';

export type Selection = Record<number, number>;

export function selectedCards(sel: Selection): number[] {
  return Object.entries(sel).flatMap(([rank, n]) => Array(n).fill(Number(rank)));
}

interface Props {
  cards: number[];
  deck: DeckEntry;
  selection: Selection;
  onChange: (sel: Selection) => void;
  /** play: choose a set for the trick; tax: choose `taxCount` cards to return; view: read-only. */
  mode: 'play' | 'tax' | 'view';
  trick?: Trick | null;
  taxCount?: number;
  /** Ranks that can be part of a legal play (others are dimmed). */
  playable?: Set<number> | null;
  /** Ranks that just arrived as tax. */
  received?: number[];
}

/** Your hand as one stack per rank – compact on phones, quick to select with one tap. */
export function Hand({ cards, deck, selection, onChange, mode, trick, taxCount = 0, playable, received = [] }: Props) {
  const groups = [...countBy(cards)].sort((a, b) => a[0] - b[0]);
  const receivedSet = new Set(received);
  const total = Object.values(selection).reduce((a, b) => a + b, 0);

  function tap(rank: number, count: number) {
    const cur = selection[rank] ?? 0;
    const next: Selection = { ...selection };
    if (mode === 'tax') {
      if (cur < count && total < taxCount) next[rank] = cur + 1;
      else next[rank] = 0;
      return onChange(next);
    }
    if (rank === JESTER) {
      next[rank] = cur >= count ? 0 : cur + 1;
      return onChange(next);
    }
    // Only one natural rank per play: picking another rank replaces it, jesters stay.
    for (const key of Object.keys(next)) if (Number(key) !== JESTER && Number(key) !== rank) next[Number(key)] = 0;
    if (cur === 0) {
      const jesters = next[JESTER] ?? 0;
      next[rank] = trick ? Math.min(count, Math.max(1, trick.count - jesters)) : count;
    } else next[rank] = cur - 1;
    onChange(next);
  }

  return (
    <ul className="no-scrollbar -mx-4 flex gap-x-1.5 overflow-x-auto px-4 pb-1 pt-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-3 sm:overflow-visible sm:px-0 sm:pt-0" aria-label="Deine Karten">
      {groups.map(([rank, count]) => {
        const sel = selection[rank] ?? 0;
        const dim = mode === 'play' && playable ? !playable.has(rank) : false;
        const name = rank === JESTER ? 'Narr' : rankWord(rank);
        return (
          <motion.li key={rank} layout className="relative shrink-0 pb-1 pr-1" transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
            {/* Paper edges behind the top card hint at the stack height. */}
            {count > 1 && <span aria-hidden className="absolute left-1 top-1 h-[calc(100%-0.25rem)] w-[calc(100%-0.25rem)] rounded-[10%] border-2 border-black/20" style={{ backgroundColor: deck.design.paper }} />}
            {count > 2 && <span aria-hidden className="absolute left-0.5 top-0.5 h-[calc(100%-0.25rem)] w-[calc(100%-0.25rem)] rounded-[10%] border-2 border-black/20" style={{ backgroundColor: deck.design.paper }} />}
            <PlayingCard
              rank={rank}
              deck={deck}
              size="md"
              className="max-sm:!w-[4.1rem]"
              selected={sel > 0}
              dimmed={dim && sel === 0}
              marked={receivedSet.has(rank)}
              onClick={mode === 'view' ? undefined : () => tap(rank, count)}
              label={`${name}, ${count} Stück${sel ? `, ${sel} ausgewählt` : ''}`}
            />
            <span className={cx(
              'pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 text-xs font-bold tabular shadow',
              sel > 0 ? 'bg-gold text-ink' : 'bg-velvet-deep text-parchment ring-1 ring-white/20',
            )}>
              {sel > 0 ? `${sel}/${count}` : `×${count}`}
            </span>
          </motion.li>
        );
      })}
      {groups.length === 0 && <li className="py-6 font-display text-2xl text-parchment/70">Keine Karten mehr – gut gemacht!</li>}
    </ul>
  );
}

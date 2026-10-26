'use client';
import { PlayingCard } from '@/components/deck/playing-card';
import { cx } from '@/lib/cx';
import { copiesOf, countBy, RANKS } from '@/lib/jakob/cards';
import { getSettings } from '@/lib/jakob/engine';
import { useTable } from './table-context';

/** "Kartengedächtnis": how many of each rank are still out there (not played, not in your hand). */
export function CardTracker({ hand }: { hand: number[] }) {
  const { state, deckOf, me } = useTable();
  const played = countBy(state.played);
  const mine = countBy(hand);
  const deck = deckOf(me);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">Pro Karte: gespielt · bei dir · noch bei den anderen.</p>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {RANKS.map((r) => {
          const total = copiesOf(r, getSettings(state).doubleDeck ? 2 : 1);
          const gone = played.get(r) ?? 0;
          const own = mine.get(r) ?? 0;
          const others = total - gone - own;
          return (
            <li key={r} className={cx('flex flex-col items-center gap-1 rounded-xl p-1.5', others === 0 ? 'bg-parchment-dark/40 opacity-60' : 'bg-parchment-dark/80')}>
              <PlayingCard rank={r} deck={deck} size="sm" />
              <span className="tabular text-xs font-bold">{gone} · {own} · <span className={others > 0 ? 'text-wax' : ''}>{others}</span></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

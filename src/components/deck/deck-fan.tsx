'use client';
import { cx } from '@/lib/cx';
import { deckName, type DeckEntry } from '@/lib/decks';
import { useT } from '@/lib/i18n/client';
import { JESTER } from '@/lib/jakob/cards';
import { CardBack, PlayingCard, type CardSize } from './playing-card';

const STEP: Record<CardSize, number> = { xs: 0.9, sm: 1.25, md: 1.7, lg: 2.3, xl: 3.1 };
const WIDTH: Record<CardSize, number> = { xs: 2.25, sm: 3.4, md: 4.6, lg: 6.2, xl: 8.5 };

/** A small fanned preview of a deck: back, top card, a middle card and the jester. */
export function DeckFan({ deck, size = 'sm', className }: { deck: DeckEntry; size?: CardSize; className?: string }) {
  const t = useT();
  const ranks = [1, 7, JESTER];
  const step = STEP[size];
  return (
    <div
      className={cx('relative shrink-0', className)}
      style={{ width: `${WIDTH[size] + step * 3}rem`, height: `${WIDTH[size] * 1.4 + 0.6}rem` }}
      aria-label={t('Deck {name}', { name: deckName(deck, t) })}
    >
      <span className="absolute bottom-0 left-0 origin-bottom -rotate-12">
        <CardBack design={deck.design} size={size} />
      </span>
      {ranks.map((r, i) => (
        <span
          key={r}
          className="absolute bottom-0 origin-bottom"
          style={{ left: `${step * (i + 1)}rem`, rotate: `${[-4, 4, 12][i]}deg`, zIndex: i + 1 }}
        >
          <PlayingCard rank={r} deck={deck} size={size} />
        </span>
      ))}
    </div>
  );
}

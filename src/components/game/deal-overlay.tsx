'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { CardBack } from '@/components/deck/playing-card';
import type { DeckDesign } from '@/lib/decks';

/**
 * Dealing flourish at the start of each round: card backs fly from the middle of the screen to the
 * seats along the top and to your hand at the bottom. Plays once per round, never on page load.
 */
export function DealOverlay({ round, seats, mySeat, design }: { round: number; seats: number; mySeat: number; design: DeckDesign }) {
  const reduce = useReducedMotion();
  const [mountedRound] = useState(round);
  if (reduce || round <= mountedRound || seats < 1) return null;
  const passes = 3;
  const cards = Array.from({ length: seats * passes }, (_, i) => i);
  return (
    <div key={round} aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {cards.map((i) => {
        const seat = i % seats;
        const toMe = seat === mySeat;
        const x = toMe ? 0 : ((seat + 0.5) / seats - 0.5) * 80;
        const y = toMe ? 38 : -34;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -ml-7 -mt-10"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.9 }}
            animate={{ x: `${x}vw`, y: `${y}vh`, rotate: (seat % 2 ? 1 : -1) * (180 + i * 7), opacity: [0, 1, 1, 0], scale: 0.7 }}
            transition={{ delay: i * 0.045, duration: 0.55, ease: 'easeOut' }}
          >
            <CardBack design={design} size="sm" />
          </motion.div>
        );
      })}
    </div>
  );
}

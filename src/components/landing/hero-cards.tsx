'use client';
import { motion, useReducedMotion } from 'motion/react';
import { PlayingCard } from '@/components/deck/playing-card';
import { DEFAULT_DECK } from '@/lib/decks';

const FAN = [12, 9, 5, 1, 2, 13];

/** The landing moment: a hand of cards fans open, the Great Jakob on top. */
export function HeroCards() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto flex h-72 w-full max-w-md items-end justify-center sm:h-96" aria-hidden>
      {FAN.map((rank, i) => {
        const offset = i - (FAN.length - 1) / 2;
        const angle = offset * 10;
        return (
          <motion.div
            key={rank}
            className="absolute bottom-6 origin-[50%_120%]"
            initial={reduce ? false : { rotate: 0, y: 40, opacity: 0 }}
            animate={{ rotate: angle, x: offset * 30, y: Math.abs(offset) * 7, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 140, damping: 16 }}
            style={{ zIndex: rank === 1 ? 10 : i }}
          >
            <PlayingCard rank={rank} deck={DEFAULT_DECK} size="xl" className={rank === 1 ? 'shadow-[0_0_0_3px_var(--color-gold),0_18px_30px_rgb(0_0_0/0.5)]' : ''} />
          </motion.div>
        );
      })}
    </div>
  );
}

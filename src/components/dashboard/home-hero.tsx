'use client';
import { motion, useReducedMotion } from 'motion/react';
import { CardBack, PlayingCard } from '@/components/deck/playing-card';
import { DEFAULT_DECK } from '@/lib/decks';

/** Three cards under a soft spotlight: the Great Jakob in the middle, flanked by a back and the cook. */
export function HomeHero() {
  const reduce = useReducedMotion();
  const enter = (delay: number, rotate: number, x: number) => ({
    initial: reduce ? false : { opacity: 0, y: 30, rotate: 0 },
    animate: { opacity: 1, y: 0, rotate, x },
    transition: { delay, type: 'spring' as const, stiffness: 140, damping: 16 },
  });
  return (
    <div className="relative mx-auto flex h-56 w-full max-w-sm items-end justify-center sm:h-72" aria-hidden>
      <div className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_60%,rgb(255_214_140/0.22),transparent_72%)]" />
      <motion.div className="absolute bottom-4 origin-bottom" {...enter(0.05, -14, -70)}>
        <CardBack design={DEFAULT_DECK.design} size="lg" className="max-sm:!w-[5.4rem]" />
      </motion.div>
      <motion.div className="absolute bottom-4 origin-bottom" {...enter(0.15, 13, 70)}>
        <PlayingCard rank={9} deck={DEFAULT_DECK} size="lg" className="max-sm:!w-[5.4rem]" />
      </motion.div>
      <motion.div className="relative z-10 mb-2" {...enter(0.25, 0, 0)}>
        <PlayingCard rank={1} deck={DEFAULT_DECK} size="xl" className="shadow-[0_0_0_2px_var(--color-gold),0_0_44px_rgb(244_183_58/0.4)] max-sm:!w-[7.4rem]" />
      </motion.div>
    </div>
  );
}

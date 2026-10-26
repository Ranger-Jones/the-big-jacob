'use client';
import { motion, useReducedMotion } from 'motion/react';
import { cx } from '@/lib/cx';

/**
 * The ribbon under the table: who is on turn, in gold when it is you, plus the turn timer as a bar.
 * Fixed height so nothing below it moves when the timer appears or the text changes.
 */
export function TurnBanner({ text, mine, seconds, fraction }: { text: string; mine: boolean; seconds: number | null; fraction: number | null }) {
  const reduce = useReducedMotion();
  const urgent = fraction !== null && fraction < 0.25;
  return (
    <div className="relative z-10 -mt-5 flex flex-col items-center gap-1.5 sm:-mt-6" aria-live="polite">
      <motion.div
        key={mine ? 'mine' : 'other'}
        initial={reduce ? false : { scaleX: 0.85, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={cx(
          'flex h-9 w-[min(92%,26rem)] items-center justify-center gap-2 px-8 text-sm font-extrabold sm:h-10 sm:text-base',
          mine
            ? 'bg-gradient-to-b from-gold-soft to-gold text-[#2b1a12] shadow-[0_4px_0_var(--color-gold-deep),0_0_26px_rgb(244_183_58/0.45)]'
            : 'bg-velvet-soft text-parchment shadow-[0_4px_0_var(--color-velvet-deep)]',
        )}
        style={{ clipPath: 'polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)' }}
      >
        <span className="truncate">{text}</span>
        {seconds !== null && <span className={cx('tabular shrink-0 opacity-80', urgent && 'text-wax opacity-100')}>{seconds}s</span>}
      </motion.div>
      {/* Turn timer */}
      <div className={cx('h-1.5 w-[min(70%,18rem)] overflow-hidden rounded-full bg-white/10 transition-opacity', fraction === null && 'opacity-0')} aria-hidden>
        <div
          className={cx('h-full rounded-full transition-[width] duration-300 ease-linear', urgent ? 'bg-wax' : 'bg-gold')}
          style={{ width: `${Math.round((fraction ?? 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}

'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { LogEntry } from '@/lib/jakob/types';

export type BurstKind = 'snap' | 'bomb' | 'unbeatable';
export const BURST_KINDS: readonly string[] = ['snap', 'bomb', 'unbeatable'];

const STAMP: Record<BurstKind, { text: string; color: string; glow: string }> = {
  snap: { text: 'Schnapp!', color: '#ffe066', glow: '#7fd3ff' },
  bomb: { text: 'Bumm!', color: '#ff8a3d', glow: '#ff3d2e' },
  unbeatable: { text: 'Unschlagbar!', color: '#ffd77a', glow: '#f4b73a' },
};

function Lightning() {
  return (
    <motion.svg
      viewBox="0 0 200 120"
      className="absolute inset-0 size-full"
      preserveAspectRatio="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.3, 1, 0] }}
      transition={{ duration: 0.7, times: [0, 0.1, 0.25, 0.35, 1] }}
      aria-hidden
    >
      <defs>
        <filter id="bolt-glow"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      <polyline points="18,8 70,52 58,58 118,96 104,100 190,116" fill="none" stroke="#9fe3ff" strokeWidth="9" filter="url(#bolt-glow)" />
      <polyline points="18,8 70,52 58,58 118,96 104,100 190,116" fill="none" stroke="#fffbe0" strokeWidth="3.5" strokeLinejoin="round" />
      <polyline points="70,52 96,40 112,46" fill="none" stroke="#fffbe0" strokeWidth="1.6" />
    </motion.svg>
  );
}

function Explosion() {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: 'radial-gradient(circle, #fff3b0 0%, #ff9b3d 35%, #c8323c 60%, transparent 72%)' }}
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: [0.2, 1.4, 1.8], opacity: [0, 1, 0] }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      aria-hidden
    />
  );
}

function Rays() {
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.9, 0], rotate: 40, scale: 1.1 }}
      transition={{ duration: 1.6, ease: 'easeOut' }}
      aria-hidden
    >
      {Array.from({ length: 16 }, (_, i) => (
        <polygon key={i} points="0,0 -6,-95 6,-95" fill="#ffd77a" opacity="0.55" transform={`rotate(${i * 22.5})`} />
      ))}
    </motion.svg>
  );
}

/**
 * A short, loud moment over the table for special plays. Each burst plays once (keyed by its log entry)
 * and hides itself; entries that already existed when the table mounted are never replayed.
 */
export function TableBurst({ entry, subtitle }: { entry: (LogEntry & { kind: BurstKind }) | null; subtitle: string | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[50%/42%]" aria-live="assertive">
      <AnimatePresence>
        {entry && (
          <motion.div
            key={`${entry.kind}-${entry.seq}`}
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 1.9, times: [0, 0.75, 1] }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: STAMP[entry.kind].glow }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 0] }}
              transition={{ duration: 0.5 }}
            />
            {!reduce && entry.kind === 'snap' && <Lightning />}
            {!reduce && entry.kind === 'bomb' && <Explosion />}
            {!reduce && entry.kind === 'unbeatable' && <Rays />}
            <motion.span
              className="relative font-display text-5xl font-bold sm:text-7xl"
              style={{
                color: STAMP[entry.kind].color,
                WebkitTextStroke: '2px #2b1a12',
                textShadow: `0 4px 0 #2b1a12, 0 0 24px ${STAMP[entry.kind].glow}`,
              }}
              initial={reduce ? { opacity: 0 } : { scale: 2.6, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            >
              {entry.kind === 'snap' ? '⚡ ' : entry.kind === 'bomb' ? '💥 ' : '👑 '}
              {STAMP[entry.kind].text}
            </motion.span>
            {subtitle && (
              <motion.span
                className="relative mt-2 rounded-full bg-velvet-deep/90 px-3 py-1 text-sm font-bold text-parchment ring-2 ring-gold/50"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {subtitle}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

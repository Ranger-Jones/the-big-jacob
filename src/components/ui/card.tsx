import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

/** A parchment panel. Use `tone="velvet"` for darker panels on the table. */
export function Card({ className, tone = 'parchment', ...props }: HTMLAttributes<HTMLDivElement> & { tone?: 'parchment' | 'velvet' }) {
  return (
    <div
      className={cx(
        'rounded-[1.4rem] p-5',
        tone === 'parchment'
          ? 'parchment ring-2 ring-line shadow-[0_6px_0_rgb(0_0_0/0.35)]'
          : 'bg-velvet-deep/70 text-parchment ring-2 ring-white/10 shadow-[0_6px_0_rgb(0_0_0/0.35)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}

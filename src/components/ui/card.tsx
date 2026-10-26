import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

/** A velvet panel with a gold edge. `tone="velvet"` is a lighter, more transparent variant. */
export function Card({ className, tone = 'parchment', ...props }: HTMLAttributes<HTMLDivElement> & { tone?: 'parchment' | 'velvet' }) {
  return (
    <div
      className={cx(
        'rounded-[1.4rem] p-5',
        tone === 'parchment'
          ? 'parchment ring-1 ring-line shadow-[0_10px_30px_rgb(0_0_0/0.35)]'
          : 'bg-velvet-deep/55 text-parchment ring-1 ring-white/10 backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}

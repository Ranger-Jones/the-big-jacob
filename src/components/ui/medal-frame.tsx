'use client';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n/client';

/** Medal wrapper with a translated tooltip ("1. Platz"); a client component so server pages can use Medal too. */
export function MedalFrame({ place, color, className, children }: { place: number; color: string; className: string; children: ReactNode }) {
  const t = useT();
  return <span className={className} style={{ color }} title={t('{place}. Platz', { place })}>{children}</span>;
}

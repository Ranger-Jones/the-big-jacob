'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** At the table the phone screen belongs to the game: the site header only shows from sm upwards. */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const atTable = usePathname().startsWith('/spiel/');
  return <div className={atTable ? 'max-sm:hidden' : undefined}>{children}</div>;
}

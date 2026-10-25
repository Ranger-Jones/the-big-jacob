'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** Icon-only on phones, icon + label from sm upwards. */
export function NavLink({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 font-bold transition-colors sm:px-3',
        active ? 'bg-white/12 text-gold-soft' : 'text-parchment/80 hover:bg-white/10 hover:text-parchment',
      )}
    >
      <span aria-hidden className="text-lg sm:text-base">{icon}</span>
      <span className="sr-only md:not-sr-only">{children}</span>
    </Link>
  );
}

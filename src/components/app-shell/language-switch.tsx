'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale, useT } from '@/lib/i18n/client';
import { cx } from '@/lib/cx';
import { LOCALES } from '@/lib/i18n/core';
import { setLocaleAction } from '@/server/locale-actions';

/** Compact DE | EN toggle (header and profile settings); the whole page re-renders in the chosen language. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="radiogroup" aria-label={t('Sprache wählen')} className={cx('flex items-center rounded-full bg-white/5 p-0.5 ring-1 ring-white/10', pending && 'opacity-60', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          onClick={() => start(async () => {
            if (l === locale) return;
            await setLocaleAction(l);
            router.refresh();
          })}
          className={cx(
            'min-h-8 rounded-full px-2 text-xs font-extrabold uppercase tracking-wide transition-colors',
            locale === l ? 'bg-gold text-[#2b1a12]' : 'text-parchment/70 hover:text-parchment',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

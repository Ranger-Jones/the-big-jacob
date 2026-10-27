'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, intlLocale, makeT, type Locale, type T } from './core';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translator for client components: `const t = useT(); t('Passen')`. */
export function useT(): T {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/** BCP-47 tag for Intl formatters (dates, numbers). */
export function useIntlLocale(): string {
  return intlLocale(useLocale());
}

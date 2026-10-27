import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { isLocale, LOCALE_COOKIE, localeFromHeader, makeT, type Locale } from './core';

/** The visitor's language: their saved choice, otherwise the browser language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromHeader((await headers()).get('accept-language'));
});

/** Translator for server components, metadata and server actions. */
export async function getT() {
  return makeT(await getLocale());
}

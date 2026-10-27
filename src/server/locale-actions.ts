'use server';
import { cookies } from 'next/headers';
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n/core';

/** Saves the language choice for a year. Works without login (also on the gate page). */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
  });
}

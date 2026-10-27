import { EN } from './en';

/**
 * Minimal i18n: the German text *is* the key. `translate('de', …)` returns it unchanged,
 * `translate('en', …)` looks it up in the English dictionary and falls back to German.
 * Placeholders use braces: t('{name} ist dran', { name }).
 */
export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';
export const LOCALE_COOKIE = 'jakob_lang';

export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

/**
 * Keys with placeholders also match finished German sentences, so texts built on the server
 * ("Der Tisch ist voll (8 Plätze).") translate via the key "Der Tisch ist voll ({n} Plätze).".
 */
let patterns: { re: RegExp; names: string[]; en: string; literal: number }[] | null = null;
function patternList() {
  patterns ??= Object.entries(EN)
    .filter(([de]) => /\{\w+\}/.test(de))
    .map(([de, en]) => {
      const names: string[] = [];
      const source = de.split(/(\{\w+\})/).map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m) {
          names.push(m[1]);
          return '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      return { re: new RegExp(`^${source}$`), names, en, literal: de.replace(/\{\w+\}/g, '').length };
    })
    // Most specific first, so "Gib genau {n} Karten zurück." wins over "{count} Karten".
    .sort((a, b) => b.literal - a.literal);
  return patterns;
}

function lookup(text: string): string | null {
  if (EN[text] !== undefined) return EN[text];
  for (const p of patternList()) {
    const m = p.re.exec(text);
    if (m) return format(p.en, Object.fromEntries(p.names.map((n, i) => [n, m[i + 1]])));
  }
  return null;
}

export function translate(locale: Locale, text: string, vars?: Vars): string {
  const template = locale === 'en' ? (lookup(text) ?? text) : text;
  return format(template, vars);
}

export function makeT(locale: Locale): T {
  return (text, vars) => translate(locale, text, vars);
}

/** German for numbers, dates and plural-free helpers. */
export function intlLocale(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'de-DE';
}

/** Picks a locale from an Accept-Language header (German unless English is preferred). */
export function localeFromHeader(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const first = header.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('en') ? 'en' : DEFAULT_LOCALE;
}

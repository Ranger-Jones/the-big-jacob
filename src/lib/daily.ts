import { DEFAULT_SETTINGS, type Settings } from './jakob/types';

/** The daily challenge: same deal for everybody, three rounds against three sly bots. */
export const DAILY_SETTINGS: Settings = { ...DEFAULT_SETTINGS, rounds: 3, events: true, chat: false };
export const DAILY_BOTS = 3;

/** Today's date in Berlin as YYYY-MM-DD. */
export function berlinDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Stable numeric seed for a day. */
export function daySeed(day: string): number {
  let h = 2166136261;
  for (const ch of `jakob-${day}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 1_000_000_007;
}

export function berlinYesterday(): string {
  return berlinDay(new Date(Date.now() - 86_400_000));
}

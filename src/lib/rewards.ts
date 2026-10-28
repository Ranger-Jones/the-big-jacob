import { personaTier, type PersonaTier } from './jakob/personas';

/** Dukaten for the daily challenge, by place at the table (once per day). */
export function dailyDukaten(place: number): number {
  return place === 1 ? 40 : place === 2 ? 25 : place === 3 ? 15 : 10;
}

/** Dukaten for every campaign station conquered for the first time. */
export const CAMPAIGN_STATION_DUKATEN = 25;

const FIRST_WIN: Record<PersonaTier, number> = { 'Anfänger': 15, 'Fortgeschritten': 25, 'Meister': 40, 'Königlich': 60 };

/** Dukaten for the first duel won against a bot – the stronger, the more. */
export function botFirstWinDukaten(elo: number): number {
  return FIRST_WIN[personaTier(elo)];
}

export type Season = 'halloween' | 'christmas' | 'winter' | 'spring' | 'summer' | 'none';

/** Seasonal theme for a date (Berlin time). */
export function seasonFor(date: Date): Season {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const md = month * 100 + day;
  if (md >= 1010 && md <= 1102) return 'halloween';
  if (md >= 1201 && md <= 1226) return 'christmas';
  if (md >= 1227 || md <= 229) return 'winter';
  if (md >= 320 && md <= 531) return 'spring';
  if (md >= 601 && md <= 831) return 'summer';
  return 'none';
}

export const SEASON_LABEL: Record<Season, string> = {
  halloween: '🎃 Halloween am Hof',
  christmas: '🎄 Weihnachten am Hof',
  winter: '❄️ Winter am Hof',
  spring: '🌸 Frühling am Hof',
  summer: '✨ Sommer am Hof',
  none: '',
};

/** Month helpers (Berlin calendar) for the monthly league. */
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export interface MonthKey { year: number; month: number } // month 1–12

export function monthOf(date: Date): MonthKey {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric' }).formatToParts(date);
  return { year: Number(parts.find((p) => p.type === 'year')?.value), month: Number(parts.find((p) => p.type === 'month')?.value) };
}

export function shiftMonth(key: MonthKey, by: number): MonthKey {
  const index = key.year * 12 + (key.month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** UTC range covering the month (with a day of slack for the Berlin offset, filtered precisely later). */
export function monthRange(key: MonthKey): { from: string; to: string } {
  const from = new Date(Date.UTC(key.year, key.month - 1, 1) - 86_400_000);
  const next = shiftMonth(key, 1);
  const to = new Date(Date.UTC(next.year, next.month - 1, 1) + 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function sameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

export function monthLabel(key: MonthKey): string {
  return `${MONTHS[key.month - 1]} ${key.year}`;
}

/** "König des Oktobers" */
export function monthTitle(key: MonthKey): string {
  const name = MONTHS[key.month - 1];
  const genitive = /[sxzß]$/.test(name) ? name : `${name}s`;
  return `König des ${genitive} ${key.year}`;
}

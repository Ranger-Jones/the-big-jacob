/** Card ranks 1–12 (lower is better) plus the jester (13), which is wild when played with other cards. */
export const JESTER = 13;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Rank = (typeof RANKS)[number];

/** Rank n exists n times, plus two jesters: 80 cards. */
export function fullDeck(): number[] {
  const deck: number[] = [];
  for (let r = 1; r <= 12; r++) for (let i = 0; i < r; i++) deck.push(r);
  deck.push(JESTER, JESTER);
  return deck;
}

export const DECK_SIZE = 80;

export function copiesOf(rank: number): number {
  return rank === JESTER ? 2 : rank;
}

export type RandInt = (maxExclusive: number) => number;

export function shuffle<T>(items: readonly T[], rand: RandInt): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortHand(cards: readonly number[]): number[] {
  return [...cards].sort((x, y) => x - y);
}

export function countBy(cards: readonly number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/** True if `part` is a sub-multiset of `whole`. */
export function containsAll(whole: readonly number[], part: readonly number[]): boolean {
  const have = countBy(whole);
  for (const [rank, n] of countBy(part)) if ((have.get(rank) ?? 0) < n) return false;
  return true;
}

/** Removes the cards of `part` (multiset) from `whole`. Caller ensures containment. */
export function removeCards(whole: readonly number[], part: readonly number[]): number[] {
  const rest = [...whole];
  for (const c of part) {
    const i = rest.indexOf(c);
    if (i >= 0) rest.splice(i, 1);
  }
  return rest;
}

/** Remaining cards of the 80-card deck after removing the given ones. */
export function remainingDeck(removed: readonly number[]): number[] {
  return removeCards(fullDeck(), removed);
}

export interface PlayShape {
  /** Effective rank of the set: the natural rank, or 13 for jesters only. */
  rank: number;
  count: number;
  jesters: number;
}

/** Null if the cards are not a valid set (all naturals must share one rank). */
export function playShape(cards: readonly number[]): PlayShape | null {
  if (cards.length === 0) return null;
  const naturals = cards.filter((c) => c !== JESTER);
  if (cards.some((c) => !Number.isInteger(c) || c < 1 || c > JESTER)) return null;
  const rank = naturals.length > 0 ? naturals[0] : JESTER;
  if (naturals.some((c) => c !== rank)) return null;
  return { rank, count: cards.length, jesters: cards.length - naturals.length };
}

/** Default German character names, used by the classic deck and as fallback. */
export const RANK_NAMES: Record<number, string> = {
  1: 'Der Große Jakob',
  2: 'Erzbischof',
  3: 'Hofmarschall',
  4: 'Baronin',
  5: 'Äbtissin',
  6: 'Ritter',
  7: 'Näherin',
  8: 'Maurer',
  9: 'Köchin',
  10: 'Schäferin',
  11: 'Steinmetz',
  12: 'Bauer',
  13: 'Narr',
};

/** Spoken plural used in buttons and the log, e.g. "3× Neun". */
const NUMBER_WORDS: Record<number, string> = {
  1: 'Eins', 2: 'Zwei', 3: 'Drei', 4: 'Vier', 5: 'Fünf', 6: 'Sechs', 7: 'Sieben',
  8: 'Acht', 9: 'Neun', 10: 'Zehn', 11: 'Elf', 12: 'Zwölf', 13: 'Narr',
};

export function rankWord(rank: number): string {
  return NUMBER_WORDS[rank] ?? String(rank);
}

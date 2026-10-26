import { countBy, fullDeck, JESTER, playShape, removeCards, type PlayShape } from './cards';
import type { CourtEvent, Settings, Trick } from './types';

export interface RuleContext {
  settings: Pick<Settings, 'snap' | 'bomb' | 'jestersTaxable'>;
  event: CourtEvent | null;
  /** Number of 80-card decks in play (2 with "Doppeldeck"). */
  decks?: number;
}

export const isReversed = (ctx: RuleContext) => ctx.event === 'reversed';

/** Effective rank of a set, honouring "Narrenfreiheit" (a lone jester set beats everything). */
export function effectiveRank(shape: PlayShape, ctx: RuleContext): number {
  if (shape.jesters === shape.count && ctx.event === 'jesterFreedom') return 0;
  return shape.rank;
}

/** True if rank a is strictly better than rank b in this round. */
export function better(a: number, b: number, ctx: RuleContext): boolean {
  return isReversed(ctx) ? a > b : a < b;
}

export function isBomb(shape: PlayShape, ctx: RuleContext): boolean {
  return ctx.settings.bomb && shape.jesters === 0 && shape.count >= 4;
}

export type PlayVerdict =
  | { ok: true; shape: PlayShape; rank: number; bomb: boolean; snap: boolean }
  | { ok: false; error: string };

/** Checks whether the cards may be laid on the current trick (hand containment is checked elsewhere). */
export function judgePlay(cards: readonly number[], trick: Trick | null, ctx: RuleContext): PlayVerdict {
  const shape = playShape(cards);
  if (!shape) return { ok: false, error: 'Nur gleiche Karten (plus Narren) zusammen spielen.' };
  const rank = effectiveRank(shape, ctx);
  if (!trick) return { ok: true, shape, rank, bomb: false, snap: false };
  if (isBomb(shape, ctx)) return { ok: true, shape, rank, bomb: true, snap: false };
  if (shape.count !== trick.count) {
    return { ok: false, error: `Du musst genau ${trick.count} ${trick.count === 1 ? 'Karte' : 'Karten'} legen.` };
  }
  if (better(rank, trick.rank, ctx)) return { ok: true, shape, rank, bomb: false, snap: false };
  if (ctx.settings.snap && rank === trick.rank) return { ok: true, shape, rank, bomb: false, snap: true };
  return { ok: false, error: isReversed(ctx) ? 'Verkehrte Welt: Du brauchst eine höhere Zahl.' : 'Du brauchst eine kleinere Zahl.' };
}

/** Sort key for "best card first" (jesters first when taxable). */
function bestKey(card: number, ctx: RuleContext, jestersFirst: boolean): number {
  if (card === JESTER) return jestersFirst ? -100 : 100;
  return isReversed(ctx) ? -card : card;
}

/** The `count` best cards a servant must pay as tax. */
export function bestCards(hand: readonly number[], count: number, ctx: RuleContext): number[] {
  const sorted = [...hand].sort((x, y) => bestKey(x, ctx, ctx.settings.jestersTaxable) - bestKey(y, ctx, ctx.settings.jestersTaxable));
  const naturalsFirst = ctx.settings.jestersTaxable ? sorted : sorted.filter((c) => c !== JESTER).concat(sorted.filter((c) => c === JESTER));
  return naturalsFirst.slice(0, count);
}

/** The `count` worst cards (jesters are kept as long as possible). */
export function worstCards(hand: readonly number[], count: number, ctx: RuleContext): number[] {
  const naturals = hand.filter((c) => c !== JESTER).sort((x, y) => bestKey(y, ctx, false) - bestKey(x, ctx, false));
  const jesters = hand.filter((c) => c === JESTER);
  return [...naturals, ...jesters].slice(0, count);
}

/** Every distinct legal play from a hand onto a trick (jesters used as sparingly as listed). */
export function legalPlays(hand: readonly number[], trick: Trick | null, ctx: RuleContext): number[][] {
  const counts = countBy(hand);
  const jesters = counts.get(JESTER) ?? 0;
  const plays: number[][] = [];
  const seen = new Set<string>();
  const add = (cards: number[]) => {
    const key = [...cards].sort((a, b) => a - b).join(',');
    if (seen.has(key)) return;
    if (judgePlay(cards, trick, ctx).ok) {
      seen.add(key);
      plays.push(cards);
    }
  };
  const sizes = trick ? [trick.count] : Array.from({ length: hand.length }, (_, i) => i + 1);
  for (const [rank, n] of counts) {
    if (rank === JESTER) continue;
    for (let j = 0; j <= jesters; j++) {
      for (const size of new Set([...sizes, ...(ctx.settings.bomb ? [n + j] : [])])) {
        const naturals = size - j;
        if (naturals < 1 || naturals > n) continue;
        add([...Array(naturals).fill(rank), ...Array(j).fill(JESTER)]);
      }
    }
  }
  for (let j = 1; j <= jesters; j++) if (!trick || trick.count === j) add(Array(j).fill(JESTER));
  return plays;
}

/**
 * True if the trick can no longer be undercut: it is the best rank (the 1), or every card with a
 * better rank has already been played this round. Only public knowledge is used, so an instant win
 * never reveals anyone's hand. Under "Narrenfreiheit" an unplayed jester still threatens.
 */
export function isUnbeatable(trick: Trick, played: readonly number[], ctx: RuleContext): boolean {
  const unplayed = removeCards(fullDeck(ctx.decks ?? 1), played);
  const naturalThreat = unplayed.some((c) => c !== JESTER && better(c, trick.rank, ctx));
  if (naturalThreat) return false;
  const jesterLeft = unplayed.includes(JESTER);
  // A lone jester counts as 0 under jester freedom and as 13 (the best card) in the reversed world.
  if (jesterLeft && ctx.event === 'jesterFreedom' && trick.rank !== 0) return false;
  if (jesterLeft && isReversed(ctx) && trick.rank < JESTER) return false;
  return true;
}

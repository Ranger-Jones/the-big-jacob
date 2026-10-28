import { countBy, fullDeck, JESTER, playShape, removeCards, shuffle, type RandInt } from './cards';
import { better, effectiveRank, type RuleContext } from './rules';
import type { Trick } from './types';

/**
 * Look-ahead for the strongest bots (Monte Carlo over possible deals). The unseen cards are dealt
 * at random to the opponents (and the duel reserve) many times; for each deal every candidate move
 * is played out to the end of the round with a quick heuristic, and the move with the best average
 * result wins. The playouts use count arrays instead of the engine so a decision stays in the
 * millisecond range.
 */

export interface TableView {
  me: string;
  /** Players still holding cards, in turn order starting with me. */
  active: string[];
  counts: Record<string, number>;
  /** Players who passed on the current trick. */
  passed: string[];
  /** Players already out this round (they rank above everyone still playing). */
  finishedCount: number;
  /** Everyone who started the round (for the place score). */
  players: number;
  reserve: number;
  duelDraw: boolean;
}

type Hand = number[]; // counts per rank, index 1..13 (13 = jester)

interface FastTrick { rank: number; count: number; by: number }

const toCounts = (cards: readonly number[]): Hand => {
  const h = Array<number>(14).fill(0);
  for (const c of cards) h[c]++;
  return h;
};
const total = (h: Hand) => h.reduce((s, n) => s + n, 0);

/** A quick, decent move: lead the worst full set, follow with the cheapest set that beats. */
function quickMove(h: Hand, trick: FastTrick | null, ctx: RuleContext, fewest: number, rand: RandInt): { rank: number; naturals: number; jesters: number } | null {
  const J = h[JESTER];
  const reversed = ctx.event === 'reversed';
  const worseFirst = (a: number, b: number) => (reversed ? a - b : b - a);
  if (!trick) {
    const ranks = [];
    for (let r = 1; r <= 12; r++) if (h[r] > 0) ranks.push(r);
    if (ranks.length === 0) return { rank: JESTER, naturals: 0, jesters: J };
    // Against someone about to go out, lead a set bigger than their hand if possible.
    const wide = ranks.filter((r) => h[r] + J > fewest);
    const pool = fewest <= 2 && wide.length > 0 ? wide : ranks;
    pool.sort(worseFirst);
    const r = pool[0];
    const extra = fewest <= 2 && h[r] <= fewest ? Math.min(J, fewest + 1 - h[r]) : 0;
    return { rank: r, naturals: h[r], jesters: extra };
  }
  const c = trick.count;
  let best: { rank: number; naturals: number; jesters: number; cost: number } | null = null;
  for (let r = 1; r <= 12; r++) {
    if (h[r] === 0 || !better(r, trick.rank, ctx)) continue;
    const naturals = Math.min(h[r], c);
    const jesters = c - naturals;
    if (jesters > J) continue;
    // Cheapest: no jesters, no split set, the worst rank that still beats.
    const cost = jesters * 20 + (h[r] > naturals ? 6 : 0) + (reversed ? r : 13 - r);
    if (!best || cost < best.cost) best = { rank: r, naturals, jesters, cost };
  }
  if (!best && J >= c) {
    const lone = effectiveRank({ rank: JESTER, count: c, jesters: c }, ctx);
    if (better(lone, trick.rank, ctx)) best = { rank: JESTER, naturals: 0, jesters: c, cost: 40 };
  }
  if (!best) return null;
  const precious = best.jesters > 0 || better(best.rank, 4, ctx) || best.rank === 1;
  if (precious && total(h) > 6 && fewest > 2 && rand(2) === 0) return null;
  return best;
}

interface Playout {
  hands: Hand[];
  reserve: number[];
}

/** Plays a round to the end; returns my score (higher is better). Seat 0 is me. */
function playOut(start: Playout, first: number[] | null, trickIn: Trick | null, view: TableView, ctx: RuleContext, rand: RandInt): number {
  const n = view.active.length;
  const hands = start.hands.map((h) => [...h]);
  const reserve = [...start.reserve];
  const out: number[] = [];
  const isOut = (i: number) => out.includes(i);
  let trick: FastTrick | null = trickIn ? { rank: trickIn.rank, count: trickIn.count, by: view.active.indexOf(trickIn.by) } : null;
  const passed = new Set(view.passed.map((id) => view.active.indexOf(id)).filter((i) => i >= 0));
  let turn = 0;
  let firstMove = true;

  const nextFrom = (i: number, skipPassed: boolean) => {
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (!isOut(j) && !(skipPassed && passed.has(j))) return j;
    }
    return i;
  };

  for (let guard = 0; guard < 600 && out.length < n - 1; guard++) {
    const h = hands[turn];
    let move: { rank: number; naturals: number; jesters: number } | null;
    if (firstMove) {
      firstMove = false;
      if (first) {
        const shape = playShape(first)!;
        move = { rank: effectiveRank(shape, ctx), naturals: shape.count - shape.jesters, jesters: shape.jesters };
        if (shape.rank !== JESTER) move.rank = effectiveRank(shape, ctx);
      } else move = null;
    } else {
      let fewest = 99;
      for (let j = 0; j < n; j++) if (j !== turn && !isOut(j)) fewest = Math.min(fewest, total(hands[j]));
      move = quickMove(h, trick, ctx, fewest, rand);
    }
    if (move) {
      const naturalRank = move.naturals > 0 ? (move.rank === 0 ? JESTER : move.rank) : JESTER;
      if (move.naturals > 0) h[naturalRank] -= move.naturals;
      h[JESTER] -= move.jesters;
      trick = { rank: move.rank, count: move.naturals + move.jesters, by: turn };
      passed.clear();
      if (total(h) === 0) out.push(turn);
      if (out.length >= n - 1) break;
      turn = nextFrom(turn, true);
    } else {
      passed.add(turn);
      if (view.duelDraw && reserve.length > 0) h[reserve.pop()!]++;
      const others = [];
      for (let j = 0; j < n; j++) if (!isOut(j) && j !== trick?.by) others.push(j);
      if (others.every((j) => passed.has(j))) {
        // The trick's owner may already be out (by = -1 if they went out before this decision).
        const by = trick ? trick.by : turn;
        const leader = by >= 0 && !isOut(by) ? by : nextFrom(by >= 0 ? by : n - 1, false);
        trick = null;
        passed.clear();
        turn = leader;
      } else turn = nextFrom(turn, true);
    }
  }

  // Score: duel = card margin, otherwise the share of players I finish ahead of.
  const remaining = (i: number) => total(hands[i]) + hands[i][JESTER];
  if (view.players === 2 && view.finishedCount === 0 && n === 2) {
    return out[0] === 0 ? remaining(1) : -remaining(0);
  }
  const myPlace = out.includes(0) ? out.indexOf(0) : n - 1;
  return (n - 1 - myPlace) / Math.max(1, n - 1);
}

/** Cards nobody has seen yet, from my point of view. */
function unseenCards(hand: readonly number[], played: readonly number[], decks: number): number[] {
  return removeCards(removeCards(fullDeck(decks), played), hand);
}

/**
 * Best move by look-ahead among the given candidates (null = pass). `samples` deals are tried; the
 * same deals are used for every candidate so the comparison is fair.
 */
export function searchMove(
  hand: readonly number[], trick: Trick | null, candidates: (number[] | null)[], view: TableView, ctx: RuleContext,
  played: readonly number[], decks: number, samples: number, rand: RandInt,
): number[] | null {
  if (candidates.length === 1) return candidates[0];
  const unseen = unseenCards(hand, played, decks);
  const others = view.active.slice(1);
  const deals: Playout[] = [];
  for (let s = 0; s < samples; s++) {
    const pool = shuffle(unseen, rand);
    const hands: Hand[] = [toCounts(hand)];
    let at = 0;
    for (const id of others) {
      const k = Math.min(view.counts[id] ?? 0, pool.length - at);
      hands.push(toCounts(pool.slice(at, at + k)));
      at += k;
    }
    deals.push({ hands, reserve: view.duelDraw ? pool.slice(at, at + view.reserve) : [] });
  }
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const cand of candidates) {
    let sum = 0;
    for (let s = 0; s < deals.length; s++) {
      const seed = (s + 1) * 7919;
      let x = seed;
      const local: RandInt = (max) => {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        return x % max;
      };
      sum += playOut(deals[s], cand, trick, view, ctx, local);
    }
    if (sum > bestScore) {
      bestScore = sum;
      best = cand;
    }
  }
  return best;
}

export { countBy };

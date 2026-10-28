import { countBy, fullDeck, JESTER, playShape, removeCards, type RandInt } from './cards';
import type { BotStyle } from './personas';
import { searchMove, type TableView } from './search';
import { better, effectiveRank, legalPlays, type RuleContext } from './rules';
import type { Trick } from './types';

/**
 * The thinking of the persona bots. A hand is judged by how many leads it still needs to go out,
 * minus its "controls" – sets nobody can beat any more, which win the lead back. Skilful bots know
 * which cards are still out (everything not in their hand and not played), weaker ones go by rank.
 * Every candidate move (and passing) is scored one step ahead; the style tilts the scores.
 */

export interface BrainInfo {
  /** Cards played this round (public). */
  played: readonly number[];
  decks: number;
  /** Card counts of the opponents still in the round. */
  opponents: number[];
  /** "Duell": whoever passes draws a card from the reserve. */
  duelDraw: boolean;
  jesterBan: boolean;
  /** Seats and counts for the look-ahead of the strongest bots. */
  table?: TableView;
}

/** Deals a bot tries per decision when it looks ahead (0 = it does not). */
export function searchSamples(skill: number): number {
  return skill >= 0.75 ? Math.round(8 + (skill - 0.75) * 160) : 0;
}

/** Bonus for keeping (or winning) the lead. */
const TEMPO = 0.9;

interface Knowledge {
  /** Unseen naturals per rank and unseen jesters (null = the bot does not count cards). */
  unseen: Map<number, number> | null;
  jesters: number;
}

function knowledgeOf(hand: readonly number[], info: Pick<BrainInfo, 'played' | 'decks'>, skill: number): Knowledge {
  if (skill < 0.4) return { unseen: null, jesters: 2 * info.decks };
  const rest = removeCards(removeCards(fullDeck(info.decks), info.played), hand);
  const unseen = countBy(rest);
  return { unseen, jesters: unseen.get(JESTER) ?? 0 };
}

/** Can a set of `count` cards of `rank` still be beaten by cards somebody else may hold? */
export function threatened(rank: number, count: number, ctx: RuleContext, know: Knowledge): boolean {
  if (!know.unseen) return !better(rank, 3, ctx) && rank !== 1;
  for (let r = 1; r <= 12; r++) {
    if (!better(r, rank, ctx)) continue;
    if ((know.unseen.get(r) ?? 0) + know.jesters >= count) return true;
  }
  const loneJester = effectiveRank({ rank: JESTER, count, jesters: count }, ctx);
  return know.jesters >= count && better(loneJester, rank, ctx);
}

/** Lower is better: leads still needed, minus the sets that win the lead back, plus a little for weak cards. */
export function handValue(hand: readonly number[], ctx: RuleContext, know: Knowledge, skill: number): number {
  const counts = countBy(hand);
  const jesters = counts.get(JESTER) ?? 0;
  counts.delete(JESTER);
  if (counts.size === 0) return jesters > 0 ? 1 : 0;
  let controls = 0;
  let weakness = 0;
  for (const [rank, n] of counts) {
    if (!threatened(rank, n, ctx, know)) controls += 1;
    weakness += ctx.event === 'reversed' ? 13 - rank : rank;
  }
  const moves = counts.size;
  // Jesters turn a nearly safe set into a safe one.
  const control = Math.min(moves - 1, controls + jesters * 0.5);
  return moves - (0.4 + 0.4 * skill) * control + 0.012 * weakness;
}

/**
 * The persona's move: cards to play, or null to pass. Leading always returns a play.
 * Mirrors chooseBotPlay (bots.ts) in its contract.
 */
export function chooseBrainPlay(
  hand: readonly number[], trick: Trick | null, ctx: RuleContext, style: BotStyle, rand: RandInt, info: BrainInfo,
): number[] | null {
  const finishing = (cards: readonly number[]) => cards.length === hand.length;
  const banned = (cards: readonly number[]) => info.jesterBan && finishing(cards) && cards.includes(JESTER);
  const plays = legalPlays(hand, trick, ctx).filter((p) => !banned(p));
  if (plays.length === 0) return trick ? null : [hand.find((c) => c !== JESTER) ?? hand[0]];
  const out = plays.find(finishing);
  if (out) return out;

  const know = knowledgeOf(hand, info, style.skill);
  const fewest = info.opponents.length > 0 ? Math.min(...info.opponents) : 99;
  const danger = fewest <= 2;
  const big = hand.length > 6;

  const scored: { cards: number[] | null; score: number }[] = plays.map((cards) => {
    const shape = playShape(cards)!;
    const rest = removeCards(hand, cards);
    let score = handValue(rest, ctx, know, style.skill);
    const safe = !threatened(effectiveRank(shape, ctx), shape.count, ctx, know);
    if (safe) score -= trick ? TEMPO : TEMPO * 0.5;
    // An opponent with fewer cards than the set cannot follow it.
    if (!trick && shape.count > fewest) score -= 1.2;
    // Patience: keep jesters and the best sets for later while the hand is still big.
    const precious = shape.jesters > 0 || better(shape.rank, 4, ctx) || shape.rank === 1;
    if (precious && big && !danger) score += style.patience * 1.1 + shape.jesters * 0.5;
    // Splitting a set wastes a lead later.
    const naturals = shape.count - shape.jesters;
    if (shape.rank !== JESTER && (countBy(hand).get(shape.rank) ?? 0) > naturals) score += 0.6 * style.skill + 0.2;
    return { cards, score };
  });

  if (trick) {
    let pass = handValue(hand, ctx, know, style.skill) + 0.35 + style.aggression * 0.7 - style.patience * 0.25;
    if (info.duelDraw) pass += 0.75;
    if (danger) pass += 2.5;
    scored.push({ cards: null, score: pass });
  }

  scored.sort((a, b) => a.score - b.score);
  if (style.blunder > 0 && rand(1000) < style.blunder * 1000) {
    const pick = scored[rand(Math.min(scored.length, 4))];
    return pick.cards ?? (trick ? null : scored.find((s) => s.cards)!.cards);
  }
  const samples = searchSamples(style.skill);
  if (samples > 0 && info.table && info.table.active.length >= 2) {
    // Look ahead among the most promising moves (passing stays a candidate while following).
    const shortlist = scored.slice(0, 6).map((s) => s.cards);
    if (trick && !shortlist.includes(null)) shortlist.push(null);
    return searchMove(hand, trick, shortlist, info.table, ctx, info.played, info.decks, samples, rand);
  }
  return scored[0].cards;
}

/** Cards the Great Jakob hands back after the tax: the ones whose loss hurts the hand least. */
export function chooseBrainTaxReturn(hand: readonly number[], count: number, ctx: RuleContext, style: BotStyle, played: readonly number[], decks: number): number[] {
  const know = knowledgeOf(hand, { played, decks }, style.skill);
  let rest = [...hand];
  const give: number[] = [];
  for (let i = 0; i < count && rest.length > 0; i++) {
    let best = rest[0];
    let bestValue = Infinity;
    for (const card of new Set(rest)) {
      if (card === JESTER && rest.some((c) => c !== JESTER)) continue;
      const value = handValue(removeCards(rest, [card]), ctx, know, style.skill);
      if (value < bestValue) {
        bestValue = value;
        best = card;
      }
    }
    give.push(best);
    rest = removeCards(rest, [best]);
  }
  return give;
}

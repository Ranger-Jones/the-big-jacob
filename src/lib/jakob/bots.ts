import { countBy, JESTER, playShape, type RandInt } from './cards';
import { isReversed, legalPlays, worstCards, type RuleContext } from './rules';
import type { BotLevel, Trick } from './types';

export interface BotInfo {
  /** Card counts of the other players still in the round. */
  handCounts: number[];
  jesterBan: boolean;
}

/** How valuable a rank is this round (higher = better card to keep). */
function goodness(rank: number, ctx: RuleContext): number {
  if (rank === JESTER) return 14;
  return isReversed(ctx) ? rank : 13 - rank;
}

/** Bots in the lower half of the table gladly start a revolution. */
export function wantsRevolution(index: number, count: number): boolean {
  return index >= Math.floor(count / 2);
}

export function chooseBotTaxReturn(hand: readonly number[], count: number, ctx: RuleContext): number[] {
  return worstCards(hand, count, ctx);
}

/**
 * Picks a play for a bot, or null to pass. Leading always returns a play.
 * "easy" plays loosely and a bit randomly, "sly" saves strong cards and jesters for later.
 */
export function chooseBotPlay(
  hand: readonly number[], trick: Trick | null, ctx: RuleContext, level: BotLevel, rand: RandInt, info: BotInfo,
): number[] | null {
  const counts = countBy(hand);
  const finishing = (cards: number[]) => cards.length === hand.length;
  const banned = (cards: number[]) => info.jesterBan && finishing(cards) && cards.includes(JESTER);
  let plays = legalPlays(hand, trick, ctx).filter((p) => !banned(p));
  if (plays.length === 0) {
    if (trick) return null;
    // Leading with nothing but forbidden finishes: lay a single card anyway.
    return [worstCards(hand, 1, ctx)[0] ?? hand[0]];
  }

  const out = plays.find(finishing);
  if (out) return out;

  const danger = info.handCounts.some((n) => n <= 2);
  const cost = (cards: number[]) => {
    const shape = playShape(cards)!;
    const naturals = shape.count - shape.jesters;
    const split = shape.rank !== JESTER && (counts.get(shape.rank) ?? 0) > naturals ? 4 : 0;
    const bomb = trick && ctx.settings.bomb && shape.jesters === 0 && shape.count >= 4 && shape.count !== trick.count ? 6 : 0;
    return shape.jesters * 9 + split + goodness(shape.rank, ctx) + bomb - (trick ? 0 : shape.count * 1.5);
  };
  plays = [...plays].sort((a, b) => cost(a) - cost(b));

  if (!trick) {
    if (level === 'easy') return plays[rand(Math.min(3, plays.length))];
    // Lead the weakest complete group; keep jesters out unless they finish the hand.
    const pure = plays.filter((p) => !p.includes(JESTER));
    return (pure.length > 0 ? pure : plays)[0];
  }

  const best = plays[0];
  if (level === 'easy') {
    if (rand(100) < 20) return null;
    return plays[rand(Math.min(2, plays.length))];
  }
  const shape = playShape(best)!;
  const precious = shape.jesters > 0 || goodness(shape.rank, ctx) >= 11;
  if (precious && hand.length > 5 && !danger && rand(100) < 65) return null;
  return best;
}

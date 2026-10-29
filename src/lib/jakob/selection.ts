import { JESTER } from './cards';
import { better, type RuleContext } from './rules';
import type { Trick } from './types';

export type Selection = Record<number, number>;
export type HandMode = 'play' | 'tax' | 'view';

/**
 * What one tap on a stack of `count` cards of `rank` does to the selection (web and app share these rules):
 * - tax: cards are picked one by one;
 * - play: the first tap takes as many copies as the trick needs (jesters top up), further taps remove one.
 *   With "Bombe" a stack of four or more can be laid whole: the second tap takes all of them, and a rank
 *   that cannot beat the trick normally takes all of them on the first tap.
 */
export function tapSelection(
  selection: Selection, rank: number, count: number,
  opts: { mode: HandMode; trick: Trick | null | undefined; taxCount?: number; ctx?: RuleContext },
): Selection {
  const cur = selection[rank] ?? 0;
  const next: Selection = { ...selection };
  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  if (opts.mode === 'tax') {
    next[rank] = cur < count && total < (opts.taxCount ?? 0) ? cur + 1 : 0;
    return clean(next);
  }
  if (rank === JESTER) {
    next[rank] = cur >= count ? 0 : cur + 1;
    return clean(next);
  }
  // Only one natural rank per play: picking another rank replaces it, jesters stay.
  for (const key of Object.keys(next)) if (Number(key) !== JESTER && Number(key) !== rank) next[Number(key)] = 0;
  const trick = opts.trick;
  const bombable = !!trick && !!opts.ctx?.settings.bomb && count >= 4;
  const beats = !!trick && !!opts.ctx && better(rank, trick.rank, opts.ctx);
  const bomb = () => {
    // A bomb is jesters-free: the whole stack, nothing else.
    for (const key of Object.keys(next)) next[Number(key)] = 0;
    next[rank] = count;
    return clean(next);
  };
  if (cur === 0) {
    if (bombable && opts.ctx && !beats) return bomb();
    const jesters = next[JESTER] ?? 0;
    next[rank] = trick ? Math.min(count, Math.max(1, trick.count - jesters)) : count;
    return clean(next);
  }
  if (bombable && cur < count && cur === Math.min(count, Math.max(1, trick.count - (next[JESTER] ?? 0)))) return bomb();
  next[rank] = cur - 1;
  return clean(next);
}

function clean(sel: Selection): Selection {
  return Object.fromEntries(Object.entries(sel).filter(([, n]) => n > 0)) as Selection;
}

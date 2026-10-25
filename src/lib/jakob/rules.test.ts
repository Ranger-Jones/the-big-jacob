import { describe, expect, it } from 'vitest';
import { containsAll, fullDeck, JESTER, playShape, remainingDeck, removeCards } from './cards';
import { bestCards, judgePlay, legalPlays, worstCards, type RuleContext } from './rules';
import type { Trick } from './types';

const ctx = (over: Partial<RuleContext['settings']> = {}, event: RuleContext['event'] = null): RuleContext => ({
  settings: { snap: false, bomb: false, jestersTaxable: false, ...over },
  event,
});
const trick = (cards: number[], rank: number): Trick => ({ cards, rank, count: cards.length, by: 'x', seq: 1 });

describe('cards', () => {
  it('builds the 80-card deck', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(80);
    expect(deck.filter((c) => c === 12)).toHaveLength(12);
    expect(deck.filter((c) => c === 1)).toHaveLength(1);
    expect(deck.filter((c) => c === JESTER)).toHaveLength(2);
  });

  it('handles multisets', () => {
    expect(containsAll([3, 3, 5], [3, 3])).toBe(true);
    expect(containsAll([3, 5], [3, 3])).toBe(false);
    expect(removeCards([3, 3, 5], [3])).toEqual([3, 5]);
    expect(remainingDeck([1])).not.toContain(1);
  });

  it('recognises sets with jesters', () => {
    expect(playShape([7, 7, JESTER])).toEqual({ rank: 7, count: 3, jesters: 1 });
    expect(playShape([JESTER])).toEqual({ rank: 13, count: 1, jesters: 1 });
    expect(playShape([7, 8])).toBeNull();
    expect(playShape([])).toBeNull();
  });
});

describe('judgePlay', () => {
  it('allows any set when leading', () => {
    expect(judgePlay([12, 12, 12], null, ctx()).ok).toBe(true);
  });

  it('needs the same count and a lower rank', () => {
    const t = trick([9, 9], 9);
    expect(judgePlay([8, 8], t, ctx()).ok).toBe(true);
    expect(judgePlay([8], t, ctx()).ok).toBe(false);
    expect(judgePlay([9, 9], t, ctx()).ok).toBe(false);
    expect(judgePlay([10, 10], t, ctx()).ok).toBe(false);
    expect(judgePlay([5, JESTER], t, ctx()).ok).toBe(true);
  });

  it('a lone jester counts as 13', () => {
    expect(judgePlay([JESTER], trick([12], 12), ctx()).ok).toBe(false);
    expect(judgePlay([12], trick([JESTER], 13), ctx()).ok).toBe(true);
  });

  it('snap allows the same rank', () => {
    const verdict = judgePlay([9, 9], trick([9, 9], 9), ctx({ snap: true }));
    expect(verdict).toMatchObject({ ok: true, snap: true });
  });

  it('bombs beat anything', () => {
    const verdict = judgePlay([11, 11, 11, 11], trick([2], 2), ctx({ bomb: true }));
    expect(verdict).toMatchObject({ ok: true, bomb: true });
    expect(judgePlay([11, 11, 11, JESTER], trick([2], 2), ctx({ bomb: true })).ok).toBe(false);
  });

  it('reversed world flips the order', () => {
    expect(judgePlay([10], trick([9], 9), ctx({}, 'reversed')).ok).toBe(true);
    expect(judgePlay([8], trick([9], 9), ctx({}, 'reversed')).ok).toBe(false);
  });

  it('jester freedom lets a lone jester beat everything', () => {
    expect(judgePlay([JESTER], trick([1], 1), ctx({}, 'jesterFreedom')).ok).toBe(true);
  });
});

describe('tax helpers', () => {
  it('pays the best naturals and keeps jesters by default', () => {
    expect(bestCards([JESTER, 2, 5, 9], 2, ctx())).toEqual([2, 5]);
    expect(bestCards([JESTER, 2, 5, 9], 2, ctx({ jestersTaxable: true }))).toEqual([JESTER, 2]);
  });

  it('returns the worst cards', () => {
    expect(worstCards([JESTER, 2, 5, 9, 12], 2, ctx())).toEqual([12, 9]);
  });
});

describe('legalPlays', () => {
  it('lists the plays that beat a trick', () => {
    const plays = legalPlays([3, 3, 7, 7, 7, JESTER], trick([8, 8], 8), ctx());
    const keys = plays.map((p) => [...p].sort((a, b) => a - b).join(','));
    expect(keys).toContain('3,3');
    expect(keys).toContain('7,7');
    expect(keys).toContain('3,13');
    expect(keys).not.toContain('7');
  });
});

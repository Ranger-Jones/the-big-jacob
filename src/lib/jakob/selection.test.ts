import { describe, expect, it } from 'vitest';
import { JESTER } from './cards';
import type { RuleContext } from './rules';
import { tapSelection } from './selection';
import type { Trick } from './types';

const ctx = (bomb: boolean): RuleContext => ({ settings: { snap: false, bomb, jestersTaxable: false }, event: null });
const trick = (rank: number, count: number): Trick => ({ cards: Array(count).fill(rank), rank, count, by: 'x', seq: 1 });

describe('tapping cards', () => {
  it('takes as many as the trick needs and removes one per tap', () => {
    let sel = tapSelection({}, 5, 3, { mode: 'play', trick: trick(8, 2), ctx: ctx(false) });
    expect(sel).toEqual({ 5: 2 });
    sel = tapSelection(sel, 5, 3, { mode: 'play', trick: trick(8, 2), ctx: ctx(false) });
    expect(sel).toEqual({ 5: 1 });
  });

  it('lays a whole stack of four or more as a bomb on the second tap', () => {
    const opts = { mode: 'play' as const, trick: trick(8, 1), ctx: ctx(true) };
    let sel = tapSelection({}, 5, 4, opts);
    expect(sel).toEqual({ 5: 1 });
    sel = tapSelection(sel, 5, 4, opts);
    expect(sel).toEqual({ 5: 4 });
    sel = tapSelection(sel, 5, 4, opts);
    expect(sel).toEqual({ 5: 3 });
  });

  it('takes the whole stack at once when only a bomb can beat the trick', () => {
    const sel = tapSelection({ [JESTER]: 1 }, 10, 5, { mode: 'play', trick: trick(3, 2), ctx: ctx(true) });
    expect(sel).toEqual({ 10: 5 });
  });

  it('never offers a bomb without the rule or with fewer than four cards', () => {
    expect(tapSelection({ 5: 1 }, 5, 4, { mode: 'play', trick: trick(8, 1), ctx: ctx(false) })).toEqual({});
    expect(tapSelection({ 5: 1 }, 5, 3, { mode: 'play', trick: trick(8, 1), ctx: ctx(true) })).toEqual({});
  });
});

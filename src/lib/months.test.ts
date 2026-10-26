import { expect, test } from 'vitest';
import { monthOf, monthTitle, shiftMonth } from './months';

test('months follow the Berlin calendar', () => {
  expect(monthOf(new Date('2026-10-31T23:30:00Z'))).toEqual({ year: 2026, month: 11 });
  expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
});

test('titles use the genitive', () => {
  expect(monthTitle({ year: 2026, month: 10 })).toBe('König des Oktobers 2026');
  expect(monthTitle({ year: 2026, month: 3 })).toBe('König des März 2026');
});

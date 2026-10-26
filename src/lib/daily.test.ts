import { expect, test } from 'vitest';
import { berlinDay, daySeed } from './daily';

test('berlin day rolls over at local midnight', () => {
  expect(berlinDay(new Date('2026-10-26T22:30:00Z'))).toBe('2026-10-26');
  expect(berlinDay(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27');
});

test('seeds are stable and differ per day', () => {
  expect(daySeed('2026-10-27')).toBe(daySeed('2026-10-27'));
  expect(daySeed('2026-10-27')).not.toBe(daySeed('2026-10-28'));
});

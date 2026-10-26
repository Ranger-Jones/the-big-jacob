import { expect, test } from 'vitest';
import { seasonFor } from './season';

test.each([
  ['2026-10-27T12:00:00Z', 'halloween'],
  ['2026-12-10T12:00:00Z', 'christmas'],
  ['2027-01-15T12:00:00Z', 'winter'],
  ['2027-04-01T12:00:00Z', 'spring'],
  ['2027-07-01T12:00:00Z', 'summer'],
  ['2027-09-15T12:00:00Z', 'none'],
])('%s is %s', (iso, season) => {
  expect(seasonFor(new Date(iso))).toBe(season);
});

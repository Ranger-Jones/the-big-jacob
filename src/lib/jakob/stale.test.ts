import { describe, expect, it } from 'vitest';
import { isStale } from './stale';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

describe('isStale', () => {
  it('closes lobbies nobody started for more than 3 hours', () => {
    expect(isStale({ status: 'lobby', createdAt: hoursAgo(2), startedAt: null, waitSince: null }, NOW)).toBe(false);
    expect(isStale({ status: 'lobby', createdAt: hoursAgo(4), startedAt: null, waitSince: null }, NOW)).toBe(true);
  });

  it('closes running games after 12 hours without a move', () => {
    expect(isStale({ status: 'playing', createdAt: hoursAgo(30), startedAt: hoursAgo(29), waitSince: hoursAgo(1) }, NOW)).toBe(false);
    expect(isStale({ status: 'playing', createdAt: hoursAgo(30), startedAt: hoursAgo(29), waitSince: hoursAgo(13) }, NOW)).toBe(true);
    // Old games without a waitSince fall back to the start time.
    expect(isStale({ status: 'playing', createdAt: hoursAgo(20), startedAt: hoursAgo(14), waitSince: null }, NOW)).toBe(true);
  });

  it('never touches finished games', () => {
    expect(isStale({ status: 'finished', createdAt: hoursAgo(500), startedAt: hoursAgo(499), waitSince: null }, NOW)).toBe(false);
  });
});

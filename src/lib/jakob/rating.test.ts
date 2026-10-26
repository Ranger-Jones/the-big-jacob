import { describe, expect, it } from 'vitest';
import { eloDeltas, expectedScore, experienceFor, levelFromXp, levelProgress, tierFor, xpForLevel } from './rating';

const p = (id: string, rating: number, place: number, human = true, games = 50) => ({ id, rating, place, human, games });

describe('elo', () => {
  it('expected score is symmetric', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
    expect(expectedScore(1200, 1000) + expectedScore(1000, 1200)).toBeCloseTo(1);
  });

  it('winner gains what the loser loses between equals', () => {
    const d = eloDeltas([p('a', 1000, 1), p('b', 1000, 2)]);
    expect(d.a).toBe(10);
    expect(d.b).toBe(-10);
  });

  it('beating stronger players pays more', () => {
    const vsWeak = eloDeltas([p('a', 1000, 1), p('b', 800, 2)]).a;
    const vsStrong = eloDeltas([p('a', 1000, 1), p('b', 1300, 2)]).a;
    expect(vsStrong).toBeGreaterThan(vsWeak);
  });

  it('scales multi-player games so the middle place moves little', () => {
    const d = eloDeltas([p('a', 1000, 1), p('b', 1000, 2), p('c', 1000, 3), p('d', 1000, 4), p('e', 1000, 5)]);
    expect(d.c).toBe(0);
    expect(d.a).toBe(10);
    expect(d.e).toBe(-10);
    expect(d.a + d.b + d.c + d.d + d.e).toBe(0);
  });

  it('bots count as opponents but are not booked', () => {
    const d = eloDeltas([p('a', 1000, 1), p('bot', 1150, 2, false)]);
    expect(Object.keys(d)).toEqual(['a']);
    expect(d.a).toBeGreaterThan(10);
  });

  it('new players move faster', () => {
    expect(eloDeltas([p('a', 1000, 1, true, 0), p('b', 1000, 2)]).a).toBe(20);
  });
});

describe('experience and levels', () => {
  it('rewards placement, crowns, missions and human opponents', () => {
    const base = { place: 1, players: 4, left: false, crowns: 2, missions: 1, revolutions: 0, vsHumans: false };
    expect(experienceFor(base)).toBe(30 + 36 + 10 + 15 + 25);
    expect(experienceFor({ ...base, vsHumans: true })).toBe(Math.round(116 * 1.5));
    expect(experienceFor({ ...base, left: true })).toBe(0);
  });

  it('level curve and progress', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(599)).toBe(3);
    expect(levelFromXp(600)).toBe(4);
    expect(levelProgress(150)).toMatchObject({ level: 2, current: 50, needed: 200, fraction: 0.25 });
  });

  it('tiers', () => {
    expect(tierFor(1000).name).toBe('Bürger');
    expect(tierFor(1750).name).toBe('Großer Jakob');
    expect(tierFor(500).name).toBe('Knecht');
  });
});

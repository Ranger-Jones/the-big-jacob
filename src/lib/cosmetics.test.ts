import { expect, test } from 'vitest';
import { feltById, FELTS, FRAMES } from './cosmetics';

const fresh = { games_played: 0, wins: 0, crowns: 0, revolutions: 0, grand_revolutions: 0 };

test('a new player only has the defaults', () => {
  expect(FELTS.filter((f) => f.unlocked(fresh)).map((f) => f.id)).toEqual(['wein']);
  expect(FRAMES.filter((f) => f.unlocked(fresh)).map((f) => f.id)).toEqual(['none']);
});

test('wins unlock felts and frames', () => {
  const s = { ...fresh, games_played: 30, wins: 25, crowns: 12, revolutions: 1, grand_revolutions: 1 };
  expect(FELTS.every((f) => f.unlocked(s))).toBe(true);
  expect(FRAMES.every((f) => f.unlocked(s))).toBe(true);
});

test('unknown felts fall back to wine red', () => {
  expect(feltById('nope').id).toBe('wein');
});

import { describe, expect, test } from 'vitest';
import { createGateToken, isCorrectGateAnswer, verifyGateToken } from './gate';

describe('access question', () => {
  test.each(['Peschel', 'peschel', '  PESCHEL ', 'pEsChEl'])('accepts %j', (answer) => {
    expect(isCorrectGateAnswer(answer)).toBe(true);
  });
  test.each(['', 'Pesch', 'Peschels', 'Paul', 'peschel peschel', null, undefined, 42])('rejects %j', (answer) => {
    expect(isCorrectGateAnswer(answer)).toBe(false);
  });
});

describe('unlock cookie', () => {
  test('own token is valid', async () => {
    const token = await createGateToken('secret-1');
    expect(await verifyGateToken(token, 'secret-1')).toBe(true);
  });
  test('token with another key, tampered or empty is invalid', async () => {
    const token = await createGateToken('secret-1');
    expect(await verifyGateToken(token, 'secret-2')).toBe(false);
    expect(await verifyGateToken(`${token.slice(0, -1)}x`, 'secret-1')).toBe(false);
    expect(await verifyGateToken('', 'secret-1')).toBe(false);
    expect(await verifyGateToken(undefined, 'secret-1')).toBe(false);
  });
  test('nothing is valid without a key', async () => {
    const token = await createGateToken('secret-1');
    expect(await verifyGateToken(token, '')).toBe(false);
  });
});

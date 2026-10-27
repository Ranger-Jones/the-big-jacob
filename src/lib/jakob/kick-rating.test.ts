import { describe, expect, it } from 'vitest';
import { applyAction, createGameState, type GameAction, type GameState } from './engine';
import { seeded } from './test-utils';

function must(state: GameState, actor: string, action: GameAction): GameState {
  const res = applyAction(state, actor, action, seeded(5));
  if (!res.ok) throw new Error(`${action.type}: ${res.error}`);
  return res.state;
}

function running(): GameState {
  let s = createGameState('a');
  for (const id of ['b', 'c']) s = must(s, id, { type: 'join' });
  s = must(s, 'a', { type: 'start' });
  for (const id of ['a', 'b', 'c']) s = must(s, id, { type: 'draw' });
  return s;
}

describe('kicks and the rating', () => {
  it('a kicked human is remembered for the rating', () => {
    const s = must(running(), 'a', { type: 'removePlayer', playerId: 'b' });
    expect(s.kicked).toEqual(['b']);
    expect(s.players.find((p) => p.id === 'b')?.left).toBe(true);
  });
});

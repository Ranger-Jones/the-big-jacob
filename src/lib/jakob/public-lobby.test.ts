import { describe, expect, it } from 'vitest';
import { applyAction, createPublicLobbyState, type GameAction, type GameState } from './engine';
import { seeded } from './test-utils';
import { PUBLIC_FILL_TO, PUBLIC_MAX_HUMANS, PUBLIC_WAIT_SECONDS } from './types';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const LATER = NOW + PUBLIC_WAIT_SECONDS * 1000 + 1;

function must(state: GameState, actor: string, action: GameAction, now = NOW): GameState {
  const res = applyAction(state, actor, action, seeded(3), now);
  if (!res.ok) throw new Error(`${action.type}: ${res.error}`);
  return res.state;
}

function lobbyWith(count: number): GameState {
  let s = createPublicLobbyState('h0', NOW);
  for (let i = 1; i < count; i++) s = must(s, `h${i}`, { type: 'join' });
  return s;
}

describe('open online lobby', () => {
  it('is a public game with fixed rules and a start time', () => {
    const s = createPublicLobbyState('h0', NOW);
    expect(s.mode).toBe('public');
    expect(Date.parse(s.autoStartAt!)).toBe(NOW + PUBLIC_WAIT_SECONDS * 1000);
    expect(applyAction(s, 'h0', { type: 'updateSettings', settings: { rounds: 3 } }, seeded(1), NOW).ok).toBe(false);
    expect(applyAction(s, 'h0', { type: 'addBot', level: 'easy' }, seeded(1), NOW).ok).toBe(false);
    expect(applyAction(s, 'h0', { type: 'start' }, seeded(1), NOW).ok).toBe(false);
  });

  it('waits until the time is up', () => {
    const s = lobbyWith(2);
    expect(applyAction(s, 'h1', { type: 'autoStart' }, seeded(1), NOW + 60_000).ok).toBe(false);
  });

  it('fills up with bots when at most three people came', () => {
    const s = must(lobbyWith(3), 'h2', { type: 'autoStart' }, LATER);
    expect(s.status).toBe('playing');
    expect(s.players).toHaveLength(PUBLIC_FILL_TO);
    expect(s.players.filter((p) => p.bot)).toHaveLength(PUBLIC_FILL_TO - 3);
  });

  it('starts without bots when four or more came', () => {
    const s = must(lobbyWith(4), 'h1', { type: 'autoStart' }, LATER);
    expect(s.status).toBe('playing');
    expect(s.players.some((p) => p.bot)).toBe(false);
  });

  it('a full lobby starts right away and takes no one else', () => {
    const s = lobbyWith(PUBLIC_MAX_HUMANS);
    expect(applyAction(s, 'late', { type: 'join' }, seeded(1), NOW).ok).toBe(false);
    expect(must(s, 'h3', { type: 'autoStart' }, NOW + 1000).status).toBe('playing');
  });

  it('nobody can be thrown out of a public game', () => {
    const lobby = lobbyWith(2);
    expect(applyAction(lobby, 'h0', { type: 'removePlayer', playerId: 'h1' }, seeded(1), NOW).ok).toBe(false);
    const running = must(lobby, 'h1', { type: 'autoStart' }, LATER);
    expect(applyAction(running, running.hostId, { type: 'removePlayer', playerId: 'h1' }, seeded(1), LATER).ok).toBe(false);
  });

  it('a lone player gets a full table of bots', () => {
    const s = must(lobbyWith(1), 'h0', { type: 'autoStart' }, LATER);
    expect(s.players).toHaveLength(PUBLIC_FILL_TO);
  });
});

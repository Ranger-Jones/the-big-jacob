import { describe, expect, it } from 'vitest';
import { CAMPAIGN, stageSettings } from '../campaign';
import { DAILY_SETTINGS } from '../daily';
import { DECK_SIZE } from './cards';
import { DUEL_VARIANTS, duelSettings } from './duel';
import { placements, publicState, type GameState } from './engine';
import { PERSONA_IDS } from './personas';
import { simulateGame, type Seat } from './simulate';
import { MISSION_POINTS, type Settings } from './types';

/**
 * Plays complete games in every mode and rule combination and checks the engine's invariants after
 * every single move: no card is lost or created, hands are hidden from the public state, scores add
 * up with the round history, and every game ends with valid places.
 */

function checkStep(state: GameState, label: string) {
  const deck = DECK_SIZE * (state.settings.doubleDeck ? 2 : 1);
  if (state.status === 'playing' && state.phase && state.phase !== 'draw' && state.players.every((p) => !p.left)) {
    const inHands = Object.values(state.hands).reduce((n, h) => n + h.length, 0);
    const total = inHands + state.played.length + state.reserve.length;
    if (total !== deck) throw new Error(`${label}: ${total} cards instead of ${deck} in phase ${state.phase} round ${state.round}`);
  }
  if (state.status === 'playing' && state.phase === 'play' && state.turn) {
    const p = state.players.find((q) => q.id === state.turn);
    if (!p || p.left || state.finished.includes(p.id)) throw new Error(`${label}: turn of a player who cannot move`);
  }
  for (const [id, hand] of Object.entries(state.hands)) {
    if (hand.some((c) => !Number.isInteger(c) || c < 1 || c > 13)) throw new Error(`${label}: bad card in ${id}'s hand`);
  }
  if (!state.settings.duel && state.reserve.length > 0) throw new Error(`${label}: reserve outside a duel`);
}

function checkEnd(state: GameState, places: number[], label: string) {
  expect(state.status, label).toBe('finished');
  expect(state.history.length, label).toBeGreaterThan(0);
  expect(places.every((p) => p >= 1 && p <= state.players.length), label).toBe(true);
  expect(places, label).toContain(1);
  expect(Object.values(state.hands).every((h) => h.length === 0), label).toBe(true);
  // Points = sum of round points + mission bonuses.
  for (const p of state.players) {
    const rounds = state.history.reduce((sum, r) => sum + (r.points[p.id] ?? 0), 0);
    const missions = (state.stats[p.id]?.missions ?? 0) * MISSION_POINTS;
    expect(state.points[p.id], `${label}: points of ${p.id}`).toBe(rounds + missions);
  }
  const pub = publicState(state);
  expect(JSON.stringify(pub)).not.toContain('"reserve":[');
  expect(pub.replay === null || Array.isArray(pub.replay), label).toBe(true);
  // The goal or the round count ended the game (or the throne / a duel goal).
  const s = state.settings;
  const goalHit = s.goal !== null && Object.values(state.points).some((p) => p >= s.goal!);
  const roundsDone = s.goal === null && state.history.length === s.rounds;
  expect(goalHit || roundsDone || state.throneWinner !== null || state.history.length >= 30, `${label}: why did it end?`).toBe(true);
}

function run(label: string, seats: Seat[], settings: Partial<Settings>, seeds = [1, 2]) {
  for (const seed of seeds) {
    const tag = `${label} #${seed}`;
    const res = simulateGame(seats, settings, seed * 101 + seats.length, (s) => checkStep(s, tag));
    checkEnd(res.state, res.places, tag);
    expect(placements(res.state)).toBeTruthy();
  }
}

const BOOLEAN_OPTIONS = [
  'revolution', 'jestersTaxable', 'snap', 'bomb', 'kingFall', 'jesterBan', 'events', 'tracker', 'missions', 'throne',
  'mercy', 'abdicate', 'jesterCurse', 'courtSwap', 'blitz',
] as const;

describe('every mode plays through cleanly', { timeout: 120_000 }, () => {
  it('standard tables from 2 to 8 players', () => {
    for (let n = 2; n <= 8; n++) run(`${n} players`, ['sly', ...Array(n - 1).fill(n % 2 ? 'easy' : 'sly')], { rounds: 3 });
  });

  it('every single table option', () => {
    for (const option of BOOLEAN_OPTIONS) run(option, ['sly', 'easy', 'sly', 'easy'], { rounds: 3, [option]: true });
  });

  it('all options at once', () => {
    const all = Object.fromEntries(BOOLEAN_OPTIONS.map((o) => [o, true])) as Partial<Settings>;
    run('everything', ['sly', 'easy', 'sly', 'easy', 'sly'], { ...all, rounds: 5 }, [1, 2, 3]);
  });

  it('tax levels, point goals and round counts', () => {
    for (const tax of ['none', 'normal', 'high'] as const) run(`tax ${tax}`, ['sly', 'sly', 'easy', 'sly'], { tax, rounds: 3 });
    for (const goal of [20, 30] as const) run(`goal ${goal}`, ['sly', 'easy', 'sly'], { goal });
    for (const rounds of [3, 7] as const) run(`${rounds} rounds`, ['easy', 'sly', 'sly'], { rounds });
  });

  it('teams ("Adel gegen Volk") with 4 and 6 players', () => {
    run('teams 4', ['sly', 'easy', 'sly', 'easy'], { teams: true, rounds: 3 });
    run('teams 6', ['sly', 'easy', 'sly', 'easy', 'sly', 'easy'], { teams: true, rounds: 3, bomb: true });
  });

  it('double deck with 12 players', () => {
    run('double deck', ['sly', ...Array(11).fill('easy')], { doubleDeck: true, rounds: 3 }, [1]);
  });

  it('every duel variant', () => {
    for (const variant of DUEL_VARIANTS) run(`duel ${variant.id}`, ['sly', 'paul'], duelSettings(variant), [1, 2, 3]);
    run('duel + events + missions', ['charlotta', 'ali'], { ...duelSettings(DUEL_VARIANTS[0]), events: true, missions: true, jesterCurse: true });
  });

  it('the daily challenge rules', () => {
    run('daily', ['sly', 'sly', 'sly', 'sly'], DAILY_SETTINGS);
  });

  it('all 38 campaign stations', () => {
    for (const stage of CAMPAIGN) run(`campaign ${stage.level}`, ['sly', ...stage.bots], stageSettings(stage), [stage.level]);
  });

  it('every persona at a mixed table', () => {
    const ids = [...PERSONA_IDS];
    for (let i = 0; i < ids.length; i += 4) run(`personas ${i}`, ['sly', ...ids.slice(i, i + 4)], { rounds: 3, bomb: true, events: true });
  });
});

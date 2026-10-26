import { describe, expect, it } from 'vitest';
import { chooseBotPlay } from './bots';
import { JESTER } from './cards';
import {
  applyAction, createGameState, placements, privateHand, publicState, turnSecondsFor, waitingOn,
  type GameAction, type GameState,
} from './engine';
import { seeded } from './test-utils';
import { DEFAULT_SETTINGS, MISSION_POINTS, type Settings } from './types';

const NOW = Date.parse('2026-10-27T12:00:00Z');

function must(state: GameState, actor: string, action: GameAction, rand = seeded(1), now = NOW): GameState {
  const res = applyAction(state, actor, action, rand, now);
  if (!res.ok) throw new Error(`${action.type}: ${res.error}`);
  return res.state;
}

function lobby(ids: string[], settings: Partial<Settings> = {}): GameState {
  let s = createGameState(ids[0], { ...DEFAULT_SETTINGS, ...settings });
  for (const id of ids.slice(1)) s = must(s, id, { type: 'join' });
  return s;
}

function playing(hands: Record<string, number[]>, settings: Partial<Settings> = {}): GameState {
  const ids = Object.keys(hands);
  const s = lobby(ids, settings);
  return {
    ...s, status: 'playing', round: 1, phase: 'play', order: ids, hands: structuredClone(hands), turn: ids[0],
    points: Object.fromEntries(ids.map((id) => [id, 0])),
  };
}

/** Starts a game and brings it to the court phase (draws for everyone). */
function toCourt(ids: string[], settings: Partial<Settings> = {}) {
  let s = must(lobby(ids, settings), ids[0], { type: 'start' });
  for (const id of ids) if (s.phase === 'draw') s = must(s, id, { type: 'draw' }, seeded(id.length + 3));
  return s;
}

const total = (s: GameState) => Object.values(s.hands).reduce((n, h) => n + h.length, 0);

describe('missions', () => {
  it('assigns secret missions and pays out when fulfilled', () => {
    let s = playing({ a: [7, 7, 7, 7, 3], b: [9, 2], c: [8, 4] }, { missions: true });
    s = { ...s, missions: { a: { id: 'bigPlay', done: false }, b: { id: 'loneJester', done: false }, c: { id: 'climber', done: false } } };
    expect(publicState(s)).not.toHaveProperty('missions');
    expect(privateHand(s, 'a').mission).toEqual({ id: 'bigPlay', done: false });
    s = must(s, 'a', { type: 'play', cards: [7, 7, 7, 7] });
    expect(s.missions.a.done).toBe(true);
    expect(s.points.a).toBe(MISSION_POINTS);
    expect(s.log.some((e) => e.kind === 'mission' && e.by === 'a')).toBe(true);
  });

  it('reveals missions at the end of the game', () => {
    let s = playing({ a: [1], b: [2] }, { missions: true, rounds: 3 });
    s = { ...s, round: 3, missions: { a: { id: 'fiveTricks', done: false }, b: { id: 'revolutionary', done: false } } };
    s = must(s, 'a', { type: 'play', cards: [1] });
    expect(s.status).toBe('finished');
    expect(s.missionsRevealed?.b.id).toBe('revolutionary');
  });
});

describe('game end options', () => {
  it('point goal ends the game as soon as someone reaches it', () => {
    let s = playing({ a: [1], b: [2], c: [3] }, { goal: 20, rounds: 3 });
    s = { ...s, points: { a: 19, b: 0, c: 0 } };
    s = must(s, 'a', { type: 'play', cards: [1] });
    s = must(s, 'b', { type: 'play', cards: [2] });
    expect(s.status).toBe('finished');
    expect(s.points.a).toBe(21);
  });

  it('point goal ignores the round count until reached', () => {
    let s = playing({ a: [1], b: [2] }, { goal: 50, rounds: 3 });
    s = { ...s, round: 3 };
    s = must(s, 'a', { type: 'play', cards: [1] });
    expect(s.status).toBe('playing');
    expect(s.phase).toBe('roundEnd');
  });

  it('three crowns in a row win the throne', () => {
    let s = playing({ a: [1], b: [2], c: [3] }, { throne: true, rounds: 10 });
    s = { ...s, crownStreak: { id: 'a', count: 2 }, points: { a: 0, b: 30, c: 0 } };
    s = must(s, 'a', { type: 'play', cards: [1] });
    s = must(s, 'b', { type: 'play', cards: [2] });
    expect(s.status).toBe('finished');
    expect(s.throneWinner).toBe('a');
    expect(placements(s).a).toBe(1);
  });

  it('teams need an even count of at least four and win together', () => {
    expect(applyAction(lobby(['a', 'b', 'c'], { teams: true }), 'a', { type: 'start' }, seeded(1)).ok).toBe(false);
    let s = must(lobby(['a', 'b', 'c', 'd'], { teams: true }), 'a', { type: 'start' });
    expect(s.teams).toEqual({ a: 0, b: 1, c: 0, d: 1 });
    s = { ...s, status: 'finished', points: { a: 5, b: 9, c: 6, d: 0 } };
    expect(placements(s)).toEqual({ a: 1, b: 2, c: 1, d: 2 });
  });
});

describe('court options', () => {
  it('mercy cancels the great tax once per game', () => {
    let s = toCourt(['a', 'b', 'c', 'd'], { mercy: true, revolution: false });
    const servant = s.order.at(-1)!;
    expect(applyAction(s, s.order[0], { type: 'mercy' }, seeded(1)).ok).toBe(false);
    s = must(s, servant, { type: 'mercy' });
    for (const id of s.order) if (s.phase === 'court' && !s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    expect(s.tax.map((t) => t.count)).toEqual([1]);
    expect(s.mercyUsed).toEqual([servant]);
  });

  it('abdication swaps the Great Jakob with a citizen', () => {
    let s = toCourt(['a', 'b', 'c', 'd', 'e'], { abdicate: true });
    const [king] = s.order;
    s = must(s, king, { type: 'abdicate' });
    expect(s.order[0]).not.toBe(king);
    expect(s.order[2]).toBe(king);
  });
});

describe('round options', () => {
  it('jester curse costs a point per jester left in hand', () => {
    let s = playing({ a: [1], b: [JESTER, JESTER, 5] }, { jesterCurse: true, rounds: 3 });
    s = must(s, 'a', { type: 'play', cards: [1] });
    expect(s.points.b).toBe(-2);
    expect(s.history[0].points.b).toBe(-2);
  });

  it('court swap passes a card among citizens after taxes', () => {
    let s = toCourt(['a', 'b', 'c', 'd', 'e', 'f'], { courtSwap: true, tax: 'none', revolution: false });
    for (const id of s.order) if (s.phase === 'court' && !s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    expect(s.phase).toBe('play');
    const citizens = s.order.slice(2, 4);
    for (const id of citizens) expect(privateHand(s, id).swapGave).toHaveLength(1);
    expect(total(s)).toBe(80);
  });

  it('blitz shrinks the turn time every round', () => {
    const s = lobby(['a', 'b'], { blitz: true, turnSeconds: 30 });
    expect(turnSecondsFor({ ...s, round: 1 })).toBe(30);
    expect(turnSecondsFor({ ...s, round: 3 })).toBe(20);
    expect(turnSecondsFor({ ...s, round: 9 })).toBe(10);
  });

  it('double deck deals 160 cards and seats twelve', () => {
    let s = lobby(['a'], { doubleDeck: true });
    for (let i = 0; i < 11; i++) s = must(s, 'a', { type: 'addBot', level: 'easy' }, seeded(i + 2));
    expect(s.players).toHaveLength(12);
    expect(applyAction(s, 'a', { type: 'updateSettings', settings: { doubleDeck: false } }, seeded(1)).ok).toBe(false);
    s = must(s, 'a', { type: 'start' });
    s = must(s, 'a', { type: 'draw' });
    expect(total(s)).toBe(160);
  });
});

describe('court events', () => {
  function withEvent(event: GameState['event']) {
    let s = toCourt(['a', 'b', 'c', 'd'], { revolution: false });
    // Re-deal the round with the wanted event by setting it before the court finishes.
    s = { ...s, event };
    return s;
  }

  it('pest passes a card to the next player', () => {
    let s = withEvent('pest');
    for (const id of s.order) if (s.phase === 'court' && !s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    while (s.phase === 'tax') {
      const pair = s.tax.find((t) => !t.done)!;
      s = must(s, pair.to, { type: 'taxReturn', cards: s.hands[pair.to].slice(-pair.count) });
    }
    expect(s.log.some((e) => e.kind === 'pest')).toBe(true);
    expect(s.order.every((id) => privateHand(s, id).swapGot?.length === 1)).toBe(true);
  });

  it('charity gives the Great Jakob’s worst card to the Great Servant', () => {
    let s = withEvent('charity');
    const servant = s.order.at(-1)!;
    const before = s.hands[servant].length;
    for (const id of s.order) if (s.phase === 'court' && !s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    expect(s.log.some((e) => e.kind === 'charity' && e.to === servant)).toBe(true);
    // +1 gift, -2 tax
    expect(s.hands[servant].length).toBe(before + 1 - 2);
  });

  it('coronation doubles the first place', () => {
    let s = playing({ a: [1], b: [2], c: [3] }, { rounds: 3 });
    s = { ...s, event: 'coronation' };
    s = must(s, 'a', { type: 'play', cards: [1] });
    s = must(s, 'b', { type: 'play', cards: [2] });
    expect(s.history[0].points).toEqual({ a: 4, b: 1, c: 0 });
  });
});

describe('autopilot', () => {
  it('a bot takes over an idle player after the wait and stops when they return', () => {
    let s = playing({ a: [9, 5], b: [10, 4], c: [12, 3] });
    s = { ...s, waitSince: new Date(NOW).toISOString() };
    expect(applyAction(s, 'b', { type: 'takeover', playerId: 'a' }, seeded(1), NOW + 5_000).ok).toBe(false);
    s = must(s, 'b', { type: 'takeover', playerId: 'a' }, seeded(1), NOW + 31_000);
    expect(s.players.find((p) => p.id === 'a')?.autopilot).toBe(true);
    expect(s.trick?.by).toBe('a');
    s = must(s, 'a', { type: 'resume' });
    expect(s.players.find((p) => p.id === 'a')?.autopilot).toBe(false);
  });
});

describe('daily seed', () => {
  it('deals the same hands for the same seed', () => {
    const deal = () => {
      let s = lobby(['me']);
      s = must(s, 'me', { type: 'addBot', level: 'sly' }, seeded(5));
      s = must(s, 'me', { type: 'addBot', level: 'sly' }, seeded(6));
      s = { ...s, seed: 20261027 };
      s = must(s, 'me', { type: 'start' }, seeded(Math.floor(Math.random() * 1000)));
      return s.hands.me;
    };
    expect(deal()).toEqual(deal());
  });
});

describe('everything on', () => {
  it('plays complete games with all options', () => {
    for (const seed of [11, 12, 13]) {
      const rand = seeded(seed);
      let s = lobby(['h1', 'h2'], {
        rounds: 5, snap: true, bomb: true, events: true, kingFall: true, jesterBan: true, missions: true, throne: seed === 12,
        teams: true, mercy: true, abdicate: true, jesterCurse: true, courtSwap: true, blitz: true, turnSeconds: 30,
      });
      for (let i = 0; i < 4; i++) s = must(s, 'h1', { type: 'addBot', level: i % 2 ? 'easy' : 'sly' }, rand);
      s = must(s, 'h1', { type: 'start' }, rand);
      let guard = 0;
      while (s.status === 'playing' && guard++ < 6000) {
        if (s.phase === 'play') expect(total(s) + s.played.length).toBeLessThanOrEqual(80);
        const actor = waitingOn(publicState(s))[0];
        const p = s.players.find((x) => x.id === actor)!;
        if (p.bot) s = must(s, 'h1', { type: 'botMove' }, rand);
        else if (s.phase === 'draw') s = must(s, actor, { type: 'draw' }, rand);
        else if (s.phase === 'court' || s.phase === 'roundEnd') s = must(s, actor, { type: 'ready' }, rand);
        else if (s.phase === 'tax') {
          const pair = s.tax.find((t) => t.to === actor && !t.done)!;
          s = must(s, actor, { type: 'taxReturn', cards: s.hands[actor].slice(-pair.count) }, rand);
        } else {
          const play = chooseBotPlay(s.hands[actor], s.trick, { settings: s.settings, event: s.event }, 'sly', rand, { handCounts: [], jesterBan: true });
          const res = play ? applyAction(s, actor, { type: 'play', cards: play }, rand, NOW) : applyAction(s, actor, { type: 'pass' }, rand, NOW);
          s = res.ok ? res.state : must(s, actor, { type: 'pass' }, rand);
        }
      }
      expect(s.status).toBe('finished');
      expect(s.missionsRevealed).not.toBeNull();
      expect(Object.values(placements(s))).toContain(1);
    }
  });
});

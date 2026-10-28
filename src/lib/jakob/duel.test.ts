import { describe, expect, it } from 'vitest';
import { DECK_SIZE, JESTER, seededRand } from './cards';
import { DUEL_VARIANTS, duelSettings } from './duel';
import { applyAction, createGameState, privateHand, publicState, type GameAction, type GameState } from './engine';
import { PERSONAS } from './personas';
import { simulateGame } from './simulate';
import { DEFAULT_SETTINGS, DUEL_HAND, type Settings } from './types';

const NOW = Date.parse('2026-10-29T12:00:00Z');

function must(state: GameState, actor: string, action: GameAction, seed = 1): GameState {
  const res = applyAction(state, actor, action, seededRand(seed), NOW);
  if (!res.ok) throw new Error(`${action.type}: ${res.error}`);
  return res.state;
}

function duelLobby(settings: Partial<Settings> = {}) {
  let s = createGameState('a', { ...DEFAULT_SETTINGS, duel: true, ...settings });
  s = must(s, 'b', { type: 'join' });
  return s;
}

/** Starts a duel between two humans and brings it to the play phase. */
function duelInPlay(settings: Partial<Settings> = {}) {
  let s = must(duelLobby({ tax: 'none', revolution: false, ...settings }), 'a', { type: 'start' });
  for (const id of ['a', 'b']) if (s.phase === 'draw') s = must(s, id, { type: 'draw' }, id.length + 5);
  for (const id of ['a', 'b']) if (s.phase === 'court') s = must(s, id, { type: 'ready' });
  expect(s.phase).toBe('play');
  return s;
}

describe('duel rules', () => {
  it('deals 15 cards each and keeps the rest face down', () => {
    const s = duelInPlay();
    expect(s.hands.a).toHaveLength(DUEL_HAND);
    expect(s.hands.b).toHaveLength(DUEL_HAND);
    expect(s.reserve).toHaveLength(DECK_SIZE - 2 * DUEL_HAND);
    const pub = publicState(s);
    expect(pub.reserveCount).toBe(DECK_SIZE - 2 * DUEL_HAND);
    expect('reserve' in pub).toBe(false);
    expect(JSON.stringify(pub)).not.toContain('"hands"');
  });

  it('makes whoever passes draw a card from the reserve', () => {
    let s = duelInPlay();
    const lead = s.turn!;
    const other = lead === 'a' ? 'b' : 'a';
    s = must(s, lead, { type: 'play', cards: [s.hands[lead][s.hands[lead].length - 1]] });
    if (s.turn !== other) return; // the lead was unbeatable and cleared at once
    const before = s.hands[other].length;
    const reserve = s.reserve.length;
    s = must(s, other, { type: 'pass' });
    expect(s.hands[other]).toHaveLength(before + 1);
    expect(s.reserve).toHaveLength(reserve - 1);
    expect(s.log.at(-1)?.kind === 'duelDraw' || s.log.some((l) => l.kind === 'duelDraw')).toBe(true);
    expect(privateHand(s, other).drawn).toHaveLength(1);
    expect(s.turn).toBe(lead);
  });

  it('scores the cards the loser still holds, jesters twice', () => {
    let s = duelInPlay();
    s = { ...s, hands: { a: [5], b: [9, 9, 11, JESTER] }, turn: 'a', trick: null, passed: [] };
    s = must(s, 'a', { type: 'play', cards: [5] });
    expect(s.history.at(-1)?.points).toEqual({ a: 5, b: 0 });
    expect(s.points.a).toBe(5);
  });

  it('allows exactly two players', () => {
    const s = duelLobby();
    expect(applyAction(s, 'c', { type: 'join' }, seededRand(1), NOW).ok).toBe(false);
    expect(applyAction(s, 'a', { type: 'addBot', level: 'easy' }, seededRand(1), NOW).ok).toBe(false);
    let three = createGameState('a');
    three = must(three, 'b', { type: 'join' });
    three = must(three, 'c', { type: 'join' });
    expect(applyAction(three, 'a', { type: 'updateSettings', settings: { duel: true } }, seededRand(1), NOW).ok).toBe(false);
    const alone = createGameState('a', { ...DEFAULT_SETTINGS, duel: true });
    expect(applyAction(alone, 'a', { type: 'start' }, seededRand(1), NOW).ok).toBe(false);
    expect(applyAction(createGameState('a'), 'a', { type: 'updateSettings', settings: { duel: true, teams: true } }, seededRand(1), NOW).ok).toBe(false);
  });

  it('takes a smaller tax: one card', () => {
    let s = must(duelLobby({ tax: 'normal', revolution: false }), 'a', { type: 'start' });
    for (const id of ['a', 'b']) if (s.phase === 'draw') s = must(s, id, { type: 'draw' }, id.length + 5);
    for (const id of ['a', 'b']) if (s.phase === 'court') s = must(s, id, { type: 'ready' });
    const king = s.order[0];
    for (const pair of s.tax) s = must(s, pair.to, { type: 'taxReturn', cards: s.hands[pair.to].slice(-pair.count) });
    expect(s.phase).toBe('play');
    // Play the round out quickly by giving one player a single card.
    s = { ...s, hands: { ...s.hands, [king]: [s.hands[king][0]] }, turn: king, trick: null };
    s = must(s, s.turn!, { type: 'play', cards: s.hands[s.turn!] });
    for (const id of ['a', 'b']) if (s.phase === 'roundEnd') s = must(s, id, { type: 'ready' });
    for (const id of ['a', 'b']) if (s.phase === 'court') s = must(s, id, { type: 'ready' });
    expect(s.phase).toBe('tax');
    expect(s.tax).toEqual([expect.objectContaining({ count: 1 })]);
  });

  it('plays every duel variant to the end against every kind of bot', () => {
    for (const [i, variant] of DUEL_VARIANTS.entries()) {
      for (const bot of ['easy', 'sly', 'bernd', 'peschel']) {
        const res = simulateGame(['gisela', bot], duelSettings(variant), 300 + i * 10 + bot.length);
        expect(res.state.status).toBe('finished');
        expect(res.places).toContain(1);
      }
    }
  });
});

describe('persona bots', () => {
  it('seats each persona once and rejects unknown ones', () => {
    let s = createGameState('a');
    s = must(s, 'a', { type: 'addBot', persona: 'peschel' });
    expect(s.players[1].bot).toMatchObject({ name: 'König Peschel', persona: 'peschel' });
    expect(applyAction(s, 'a', { type: 'addBot', persona: 'peschel' }, seededRand(2), NOW).ok).toBe(false);
    expect(applyAction(s, 'a', { type: 'addBot', persona: 'kaiser' }, seededRand(2), NOW).ok).toBe(false);
    s = must(s, 'a', { type: 'addBot', level: 'sly' });
    expect(s.players[2].bot?.name).not.toBe('König Peschel');
  });

  it('greets the table and comments on the round', () => {
    const res = simulateGame(['sly', 'hugo'], duelSettings(DUEL_VARIANTS[0]), 41);
    const quips: string[] = [];
    let last = -1;
    simulateGame(['sly', 'hugo'], duelSettings(DUEL_VARIANTS[0]), 41, (s) => {
      if (s.quip && s.quip.seq !== last) {
        last = s.quip.seq;
        quips.push(s.quip.text);
      }
    });
    const hugo = PERSONAS.find((p) => p.id === 'hugo')!;
    expect(hugo.quips.greet).toContain(quips[0]);
    expect(quips.length).toBeGreaterThan(2);
    expect(res.state.quip).not.toBeNull();
  });

  it('ranks strength: the king beats the farmer and the plain sly bot', () => {
    const rate = (a: string, b: string, games: number) => {
      let won = 0;
      for (let i = 0; i < games; i++) {
        const swap = i % 2 === 1;
        const res = simulateGame(swap ? [b, a] : [a, b], duelSettings(DUEL_VARIANTS[0]), 9000 + i);
        if (res.places[swap ? 1 : 0] === 1) won++;
      }
      return won / games;
    };
    expect(rate('peschel', 'bernd', 60)).toBeGreaterThan(0.7);
    expect(rate('peschel', 'sly', 60)).toBeGreaterThan(0.65);
  }, 120_000);

  it('lists the personas from weakest to the king', () => {
    const sorted = [...PERSONAS].sort((a, b) => a.elo - b.elo);
    expect(sorted.at(-1)?.id).toBe('peschel');
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    for (const name of ['Gräfin Charlotta', 'Hofmeister Paul', 'Wissenschaftlerin Maxi', 'Leibwächter Ali']) {
      expect(PERSONAS.some((p) => p.name === name)).toBe(true);
    }
  });
});

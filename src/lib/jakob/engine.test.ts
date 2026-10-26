import { describe, expect, it } from 'vitest';
import { chooseBotPlay } from './bots';
import { JESTER } from './cards';
import {
  applyAction, createGameState, createRematchState, placements, privateHand, publicState, waitingOn,
  type GameAction, type GameState,
} from './engine';
import { seeded } from './test-utils';
import { DEFAULT_SETTINGS, type Settings } from './types';

const NOW = Date.parse('2026-10-25T12:00:00Z');

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

/** A state in the play phase with fixed hands, order = keys of `hands`. */
function playing(hands: Record<string, number[]>, settings: Partial<Settings> = {}): GameState {
  const ids = Object.keys(hands);
  const s = lobby(ids, settings);
  return {
    ...s,
    status: 'playing',
    round: 1,
    phase: 'play',
    order: ids,
    hands: structuredClone(hands),
    turn: ids[0],
    points: Object.fromEntries(ids.map((id) => [id, 0])),
  };
}

const total = (s: GameState) => Object.values(s.hands).reduce((n, h) => n + h.length, 0);

describe('lobby', () => {
  it('joins, adds bots and starts with a draw', () => {
    let s = lobby(['a', 'b']);
    s = must(s, 'a', { type: 'addBot', level: 'sly' });
    expect(s.players).toHaveLength(3);
    expect(s.players[2].bot?.name).toBeTruthy();
    s = must(s, 'a', { type: 'start' });
    expect(s.phase).toBe('draw');
    // The bot drew on its own.
    expect(Object.keys(s.draws)).toEqual([s.players[2].id]);
    expect(waitingOn(publicState(s))).toEqual(['a', 'b']);
  });

  it('only the host changes settings and they are validated', () => {
    const s = lobby(['a', 'b']);
    expect(applyAction(s, 'b', { type: 'updateSettings', settings: { rounds: 3 } }, seeded(1)).ok).toBe(false);
    expect(applyAction(s, 'a', { type: 'updateSettings', settings: { rounds: 4 as never } }, seeded(1)).ok).toBe(false);
    expect(must(s, 'a', { type: 'updateSettings', settings: { rounds: 3, bomb: true } }).settings).toMatchObject({ rounds: 3, bomb: true });
  });

  it('kicked players are banned; host passes on when leaving', () => {
    let s = lobby(['a', 'b', 'c']);
    s = must(s, 'a', { type: 'removePlayer', playerId: 'b' });
    expect(applyAction(s, 'b', { type: 'join' }, seeded(1)).ok).toBe(false);
    s = must(s, 'a', { type: 'leave' });
    expect(s.hostId).toBe('c');
  });

  it('a lobby with only bots dissolves', () => {
    let s = lobby(['a']);
    s = must(s, 'a', { type: 'addBot', level: 'easy' });
    s = must(s, 'a', { type: 'leave' });
    expect(s.players).toEqual([]);
  });
});

describe('draw and court', () => {
  it('orders players by drawn card and deals all 80 cards', () => {
    let s = must(lobby(['a', 'b', 'c', 'd']), 'a', { type: 'start' });
    for (const id of ['a', 'b', 'c', 'd']) s = must(s, id, { type: 'draw' }, seeded(id.charCodeAt(0)));
    expect(s.phase).toBe('court');
    expect(s.round).toBe(1);
    const sorted = [...s.order].sort((x, y) => s.draws[x] - s.draws[y] || s.drawOrder.indexOf(x) - s.drawOrder.indexOf(y));
    expect(s.order).toEqual(sorted);
    expect(total(s)).toBe(80);
    expect(s.hands[s.order[0]].length).toBe(20);
  });

  it('public state hides the hands', () => {
    let s = must(lobby(['a', 'b']), 'a', { type: 'start' });
    s = must(must(s, 'a', { type: 'draw' }), 'b', { type: 'draw' });
    const pub = publicState(s) as unknown as Record<string, unknown>;
    expect(pub.hands).toBeUndefined();
    expect(pub.notes).toBeUndefined();
    expect(pub.handCounts).toEqual({ a: 40, b: 40 });
    expect(privateHand(s, 'a').cards).toHaveLength(40);
  });

  function courtWithJesters(holderIndex: number) {
    let s = must(lobby(['a', 'b', 'c', 'd']), 'a', { type: 'start' });
    for (const id of ['a', 'b', 'c', 'd']) s = must(s, id, { type: 'draw' }, seeded(7));
    const holder = s.order[holderIndex];
    // Move both jesters to the holder (swap with two naturals).
    for (const id of s.order) {
      if (id === holder) continue;
      while (s.hands[id].includes(JESTER)) {
        const give = s.hands[holder].find((c) => c !== JESTER)!;
        s.hands[holder].splice(s.hands[holder].indexOf(give), 1, JESTER);
        s.hands[id].splice(s.hands[id].indexOf(JESTER), 1, give);
      }
    }
    return { s, holder };
  }

  it('revolution cancels taxes', () => {
    const { s: court, holder } = courtWithJesters(1);
    let s = must(court, holder, { type: 'revolution' });
    expect(s.revolution).toEqual({ by: holder, grand: false });
    for (const id of s.order) if (!s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    expect(s.phase).toBe('play');
    expect(s.tax).toEqual([]);
  });

  it('grand revolution flips the order', () => {
    const { s: court, holder } = courtWithJesters(3);
    const before = [...court.order];
    let s = must(court, holder, { type: 'revolution' });
    expect(s.revolution?.grand).toBe(true);
    expect(s.order).toEqual([...before].reverse());
    for (const id of s.order) if (!s.ready.includes(id)) s = must(s, id, { type: 'ready' });
    expect(s.turn).toBe(holder);
  });

  it('revolution needs both jesters', () => {
    const { s, holder } = courtWithJesters(0);
    const other = s.order.find((id) => id !== holder)!;
    expect(applyAction(s, other, { type: 'revolution' }, seeded(1)).ok).toBe(false);
  });

  it('taxes move best cards up and chosen cards down', () => {
    let s = must(lobby(['a', 'b', 'c', 'd']), 'a', { type: 'start' });
    for (const id of ['a', 'b', 'c', 'd']) s = must(s, id, { type: 'draw' }, seeded(3));
    // Make sure no revolution is possible: nobody holds both jesters? Just skip court.
    for (const id of s.order) s = must(s, id, { type: 'ready' });
    expect(s.phase).toBe('tax');
    const [great, lesser] = s.tax;
    expect(great).toMatchObject({ from: s.order[3], to: s.order[0], count: 2, done: false });
    expect(lesser).toMatchObject({ from: s.order[2], to: s.order[1], count: 1, done: false });
    expect(s.notes[great.to].received).toHaveLength(2);
    expect(s.hands[great.from]).toHaveLength(18);

    const worst = s.hands[great.to].slice(-2);
    s = must(s, great.to, { type: 'taxReturn', cards: worst });
    expect(applyAction(s, lesser.to, { type: 'taxReturn', cards: [1, 1] }, seeded(1)).ok).toBe(false);
    s = must(s, lesser.to, { type: 'taxReturn', cards: [s.hands[lesser.to].at(-1)!] });
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(s.order[0]);
    expect(total(s)).toBe(80);
  });
});

describe('playing tricks', () => {
  it('must follow with the same count and a better rank', () => {
    let s = playing({ a: [9, 9, 5], b: [8, 8, 4], c: [12, 12, 3] });
    s = must(s, 'a', { type: 'play', cards: [9, 9] });
    expect(s.turn).toBe('b');
    expect(applyAction(s, 'b', { type: 'play', cards: [4] }, seeded(1)).ok).toBe(false);
    expect(applyAction(s, 'c', { type: 'play', cards: [3] }, seeded(1)).ok).toBe(false);
    s = must(s, 'b', { type: 'play', cards: [8, 8] });
    expect(s.trick).toMatchObject({ rank: 8, count: 2, by: 'b' });
  });

  it('clears the trick when everyone else passed', () => {
    let s = playing({ a: [9, 5], b: [10, 4], c: [12, 3] });
    s = must(s, 'a', { type: 'play', cards: [9] });
    s = must(s, 'b', { type: 'pass' });
    s = must(s, 'c', { type: 'pass' });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('a');
    expect(applyAction(s, 'a', { type: 'pass' }, seeded(1)).ok).toBe(false);
  });

  it('whoever passed sits out the rest of the trick', () => {
    let s = playing({ a: [9, 3], b: [8, 2], c: [7, 4], d: [10, 5] });
    s = must(s, 'a', { type: 'play', cards: [9] });
    s = must(s, 'b', { type: 'pass' });
    s = must(s, 'c', { type: 'play', cards: [7] });
    expect(s.turn).toBe('d');
    s = must(s, 'd', { type: 'pass' });
    // b passed earlier and is skipped; a is next.
    expect(s.turn).toBe('a');
    expect(applyAction(s, 'b', { type: 'play', cards: [2] }, seeded(1)).ok).toBe(false);
    s = must(s, 'a', { type: 'pass' });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('c');
  });

  it('an unbeatable card wins the trick at once', () => {
    let s = playing({ a: [9, 3], b: [1, 2, 6], c: [7, 4] });
    s = must(s, 'a', { type: 'play', cards: [9] });
    s = must(s, 'b', { type: 'play', cards: [1] });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('b');
    expect(s.log.some((e) => e.kind === 'unbeatable' && e.by === 'b')).toBe(true);
  });

  it('a 2 is unbeatable once the 1 is gone, but not while it is unplayed', () => {
    let s = playing({ a: [2, 9], b: [3, 8], c: [4, 7] });
    s = must(s, 'a', { type: 'play', cards: [2] });
    expect(s.trick?.by).toBe('a');
    s = { ...s, trick: null, passed: [], turn: 'b', played: [...s.played, 1] };
    s = must(s, 'b', { type: 'play', cards: [8] });
    s = must(s, 'c', { type: 'play', cards: [7] });
    s = { ...s, turn: 'a', hands: { ...s.hands, a: [2, 9] } };
    s = must(s, 'a', { type: 'play', cards: [2] });
    expect(s.trick).toBeNull();
  });

  it('a trick is not cut short while lower cards are still unplayed', () => {
    // 3×4 with the 1 and both 2s unplayed: no lower triple is possible, but the rule only looks at ranks.
    let s = playing({ a: [4, 4, 4, 9], b: [1, 6], c: [2, 2, 7] });
    s = { ...s, played: [3, 3, 3] };
    s = must(s, 'a', { type: 'play', cards: [4, 4, 4] });
    expect(s.trick?.by).toBe('a');
    expect(s.turn).toBe('b');
  });

  it('a lone jester still threatens a 1 under jester freedom', () => {
    let s = playing({ a: [1, 5], b: [13, 6], c: [7, 4] });
    s = { ...s, event: 'jesterFreedom' };
    s = must(s, 'a', { type: 'play', cards: [1] });
    expect(s.trick?.by).toBe('a');
  });

  it('when the trick owner went out, the next player leads', () => {
    let s = playing({ a: [9], b: [10, 4], c: [12, 3], d: [11, 6] });
    s = must(s, 'a', { type: 'play', cards: [9] });
    expect(s.finished).toEqual(['a']);
    s = must(s, 'b', { type: 'pass' });
    s = must(s, 'c', { type: 'pass' });
    s = must(s, 'd', { type: 'pass' });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('b');
  });

  it('finishes the round, scores and starts round end', () => {
    let s = playing({ a: [1], b: [2], c: [3] }, { rounds: 3 });
    s = must(s, 'a', { type: 'play', cards: [1] });
    // The 1 is unbeatable and a is out, so b leads right away.
    expect(s.turn).toBe('b');
    s = must(s, 'b', { type: 'play', cards: [2] });
    expect(s.phase).toBe('roundEnd');
    expect(s.history[0].finish).toEqual(['a', 'b', 'c']);
    expect(s.points).toEqual({ a: 2, b: 1, c: 0 });
    expect(s.stats.a.crowns).toBe(1);
    expect(s.stats.c.servant).toBe(1);
    for (const id of ['a', 'b', 'c']) s = must(s, id, { type: 'ready' });
    expect(s.round).toBe(2);
    expect(s.order).toEqual(['a', 'b', 'c']);
  });

  it('snap skips the next player', () => {
    let s = playing({ a: [9, 1], b: [9, 2], c: [8, 3], d: [7, 4] }, { snap: true });
    s = must(s, 'a', { type: 'play', cards: [9] });
    s = must(s, 'b', { type: 'play', cards: [9] });
    expect(s.turn).toBe('d');
    expect(s.passed).toEqual(['c']);
  });

  it('a bomb wins the trick at once', () => {
    let s = playing({ a: [2, 12], b: [11, 11, 11, 11, 5], c: [3, 4] }, { bomb: true });
    s = must(s, 'a', { type: 'play', cards: [2] });
    s = must(s, 'b', { type: 'play', cards: [11, 11, 11, 11] });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('b');
    expect(s.stats.b.bombs).toBe(1);
  });

  it('jester ban puts a jester finisher last', () => {
    let s = playing({ a: [JESTER], b: [12, 12], c: [11, 11] }, { jesterBan: true, rounds: 3 });
    s = must(s, 'a', { type: 'play', cards: [JESTER] });
    expect(s.shamed).toEqual(['a']);
    s = must(s, 'b', { type: 'play', cards: [12] });
    s = must(s, 'c', { type: 'play', cards: [11] });
    s = must(s, 'b', { type: 'pass' });
    s = must(s, 'c', { type: 'play', cards: [11] });
    expect(s.history[0].finish).toEqual(['c', 'b', 'a']);
  });

  it('king fall drops the Great Jakob who did not win', () => {
    let s = playing({ a: [12, 12], b: [1], c: [11, 11] }, { kingFall: true, rounds: 3 });
    s = must(s, 'a', { type: 'play', cards: [12] });
    s = must(s, 'b', { type: 'play', cards: [1] });
    // b went out with the unbeatable 1; c leads.
    expect(s.turn).toBe('c');
    s = must(s, 'c', { type: 'play', cards: [11, 11] });
    expect(s.history[0].finish).toEqual(['b', 'c', 'a']);
  });

  it('timeouts only work after the deadline', () => {
    let s = playing({ a: [9, 5], b: [10, 4] }, { turnSeconds: 15 });
    s = { ...s, deadline: new Date(NOW + 15_000).toISOString() };
    expect(applyAction(s, 'b', { type: 'timeout' }, seeded(1), NOW).ok).toBe(false);
    s = must(s, 'b', { type: 'timeout' }, seeded(1), NOW + 16_000);
    // a led their worst single card.
    expect(s.trick).toMatchObject({ cards: [9], by: 'a' });
  });

  it('skip only works after the idle wait – and for any player, not just the host', () => {
    let s = playing({ a: [9, 5], b: [10, 4], c: [12, 3] });
    s = { ...s, waitSince: new Date(NOW).toISOString() };
    expect(applyAction(s, 'a', { type: 'skip' }, seeded(1), NOW + 5_000).ok).toBe(false);
    s = must(s, 'c', { type: 'skip' }, seeded(1), NOW + 31_000);
    expect(s.trick).toMatchObject({ cards: [9], by: 'a' });
    // The new turn starts a fresh wait.
    expect(applyAction(s, 'a', { type: 'skip' }, seeded(1), NOW + 32_000).ok).toBe(false);
  });

  it('leaving mid-trick moves the game on', () => {
    let s = playing({ a: [9, 5], b: [10, 4], c: [12, 3] });
    s = must(s, 'a', { type: 'play', cards: [9] });
    s = must(s, 'b', { type: 'leave' });
    expect(s.turn).toBe('c');
    s = must(s, 'c', { type: 'pass' });
    expect(s.trick).toBeNull();
    expect(s.turn).toBe('a');
  });
});

describe('full games', () => {
  it('bots and humans play complete games without losing cards', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const rand = seeded(seed);
      let s = lobby(['h1', 'h2'], { rounds: 3, snap: seed % 2 === 0, bomb: seed % 3 === 0, events: true, kingFall: seed === 5, jesterBan: seed === 4 });
      for (let i = 0; i < 4; i++) s = must(s, 'h1', { type: 'addBot', level: i % 2 ? 'easy' : 'sly' }, rand);
      s = must(s, 'h1', { type: 'start' }, rand);
      let guard = 0;
      while (s.status === 'playing' && guard++ < 5000) {
        const waiting = waitingOn(publicState(s));
        const actor = waiting[0];
        const p = s.players.find((x) => x.id === actor)!;
        if (s.phase === 'play' && s.round > 0) expect(total(s) + s.played.length).toBe(80);
        if (p.bot) {
          s = must(s, 'h1', { type: 'botMove' }, rand);
        } else if (s.phase === 'draw') s = must(s, actor, { type: 'draw' }, rand);
        else if (s.phase === 'court' || s.phase === 'roundEnd') s = must(s, actor, { type: 'ready' }, rand);
        else if (s.phase === 'tax') {
          const pair = s.tax.find((t) => t.to === actor && !t.done)!;
          s = must(s, actor, { type: 'taxReturn', cards: s.hands[actor].slice(-pair.count) }, rand);
        } else {
          const play = chooseBotPlay(s.hands[actor], s.trick, { settings: s.settings, event: s.event }, 'sly', rand, { handCounts: [], jesterBan: s.settings.jesterBan });
          const res = play ? applyAction(s, actor, { type: 'play', cards: play }, rand, NOW) : applyAction(s, actor, { type: 'pass' }, rand, NOW);
          s = res.ok ? res.state : must(s, actor, { type: 'pass' }, rand);
        }
      }
      expect(s.status).toBe('finished');
      expect(s.history).toHaveLength(3);
      const places = placements(s);
      expect(Object.values(places).sort()).toContain(1);
      const points = Object.values(s.points).reduce((a, b) => a + b, 0);
      const perRound = s.history.reduce((n, r) => n + Object.values(r.points).reduce((a, b) => a + b, 0), 0);
      expect(points).toBe(perRound);
    }
  });

  it('rematch keeps players, bots, decks and settings', () => {
    let s = lobby(['a', 'b'], { rounds: 7, bomb: true });
    s = must(s, 'a', { type: 'addBot', level: 'easy' });
    s = must(s, 'b', { type: 'setDeck', deckId: 'preset:tiere' });
    const r = createRematchState('b', s);
    expect(r.hostId).toBe('b');
    expect(r.players.map((p) => p.id)).toEqual(['b', 'a', s.players[2].id]);
    expect(r.players[0].deckId).toBe('preset:tiere');
    expect(r.settings).toMatchObject({ rounds: 7, bomb: true });
  });
});

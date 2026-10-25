import {
  containsAll, fullDeck, JESTER, remainingDeck, removeCards, shuffle, sortHand, type RandInt,
} from './cards';
import { chooseBotPlay, chooseBotTaxReturn, wantsRevolution } from './bots';
import { judgePlay, worstCards, bestCards, type RuleContext } from './rules';
import {
  BOT_LEVELS, COURT_EVENTS, DEFAULT_SETTINGS, EMPTY_STATS, MAX_PLAYERS, MIN_PLAYERS, ROUND_OPTIONS, TAX_OPTIONS,
  TURN_OPTIONS,
  type BotLevel, type GameAction, type GameState, type LogEntry, type LogKind, type Player, type PlayerStats,
  type PrivateHand, type PublicState, type RoundResult, type Settings,
} from './types';

export * from './types';

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };

const COURT_SECONDS = 20;
const DRAW_SECONDS = 30;
const ROUND_END_SECONDS = 20;
const LOG_LIMIT = 40;

const BOT_NAMES: { name: string; emoji: string }[] = [
  { name: 'Hofnarr Hugo', emoji: '🤹' },
  { name: 'Gräfin Gisela', emoji: '👸' },
  { name: 'Bauer Bernd', emoji: '👨‍🌾' },
  { name: 'Ritter Rüdiger', emoji: '🛡️' },
  { name: 'Köchin Klara', emoji: '👩‍🍳' },
  { name: 'Mönch Matthias', emoji: '🧙' },
  { name: 'Baronin Berta', emoji: '💎' },
  { name: 'Schäferin Sina', emoji: '🐑' },
];

// ---------------------------------------------------------------------------------------------
// Construction & helpers

export function createGameState(hostId: string, settings: Settings = DEFAULT_SETTINGS): GameState {
  return {
    status: 'lobby',
    hostId,
    players: [{ id: hostId, left: false, deckId: null }],
    banned: [],
    settings: { ...settings },
    round: 0,
    phase: null,
    order: [],
    draws: {},
    drawOrder: [],
    ready: [],
    revolution: null,
    event: null,
    tax: [],
    turn: null,
    trick: null,
    passed: [],
    finished: [],
    shamed: [],
    points: {},
    played: [],
    moveSeq: 0,
    deadline: null,
    log: [],
    history: [],
    stats: {},
    hands: {},
    notes: {},
  };
}

/** New lobby for a rematch: same humans and bots, same decks and settings. */
export function createRematchState(hostId: string, previous: GameState): GameState {
  const state = createGameState(hostId, getSettings(previous));
  const keep = previous.players.filter((p) => !p.left);
  const host = keep.find((p) => p.id === hostId);
  state.players = [
    { id: hostId, left: false, deckId: host?.deckId ?? null },
    ...keep.filter((p) => p.id !== hostId).map((p) => ({ ...p, left: false })),
  ];
  return state;
}

/** Older or partial settings objects are filled with defaults. */
export function getSettings(state: Pick<GameState, 'settings'>): Settings {
  return { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };
}

export const isBot = (p: Player | undefined) => !!p?.bot;
export const isBotId = (id: string) => id.startsWith('bot-');

export function humanPlayers(state: Pick<GameState, 'players'>): Player[] {
  return state.players.filter((p) => !p.bot);
}

function player(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function isPresent(state: GameState, id: string): boolean {
  const p = player(state, id);
  return !!p && !p.left;
}

/** Still holding cards in the current round. */
function isActive(state: GameState, id: string): boolean {
  return isPresent(state, id) && !state.finished.includes(id) && !state.shamed.includes(id);
}

function activeIds(state: GameState): string[] {
  return state.order.filter((id) => isActive(state, id));
}

function ruleCtx(state: GameState): RuleContext {
  return { settings: getSettings(state), event: state.event };
}

function deadlineIn(seconds: number | null, now: number): string | null {
  return seconds === null ? null : new Date(now + seconds * 1000).toISOString();
}

function log(state: GameState, kind: LogKind, extra: Omit<LogEntry, 'seq' | 'kind'> = {}) {
  state.log = [...state.log, { seq: state.moveSeq, kind, ...extra }].slice(-LOG_LIMIT);
}

function bumpStat(state: GameState, id: string, key: keyof PlayerStats, by = 1) {
  if (!state.stats[id]) state.stats[id] = { ...EMPTY_STATS };
  state.stats[id][key] += by;
}

function nextActiveAfter(state: GameState, id: string): string | null {
  const n = state.order.length;
  const start = state.order.indexOf(id);
  for (let k = 1; k <= n; k++) {
    const candidate = state.order[(start + k + n) % n];
    if (isActive(state, candidate)) return candidate;
  }
  return null;
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

/** Title of a seat in the rank order. */
export function rankTitle(index: number, count: number): string {
  if (index === 0) return 'Großer Jakob';
  if (index === count - 1) return 'Großer Knecht';
  if (count >= 4 && index === 1) return 'Kleiner Jakob';
  if (count >= 4 && index === count - 2) return 'Kleiner Knecht';
  return 'Bürger';
}

export function rankEmoji(index: number, count: number): string {
  if (index === 0) return '👑';
  if (index === count - 1) return '🧹';
  if (count >= 4 && index === 1) return '🎩';
  if (count >= 4 && index === count - 2) return '🪣';
  return '🧺';
}

// ---------------------------------------------------------------------------------------------
// Projections

export function publicState(state: GameState): PublicState {
  const { hands, notes: _notes, ...pub } = state;
  void _notes;
  const handCounts = Object.fromEntries(Object.entries(hands).map(([id, cards]) => [id, cards.length]));
  return structuredClone({ ...pub, handCounts });
}

export function privateHand(state: GameState, id: string): PrivateHand {
  return {
    cards: sortHand(state.hands[id] ?? []),
    received: [...(state.notes[id]?.received ?? [])],
    gave: [...(state.notes[id]?.gave ?? [])],
  };
}

export function fromParts(pub: PublicState, hands: Record<string, number[]>, notes: GameState['notes']): GameState {
  const { handCounts: _counts, ...rest } = structuredClone(pub);
  void _counts;
  return { ...rest, hands: structuredClone(hands), notes: structuredClone(notes) };
}

/** Final standings: points first, then the finishing order of the last round. */
export function placements(state: Pick<GameState, 'players' | 'points' | 'history'>): Record<string, number> {
  const last = state.history.at(-1)?.finish ?? [];
  const pos = (id: string) => {
    const i = last.indexOf(id);
    return i < 0 ? 99 : i;
  };
  const ranked = [...state.players].sort((a, b) =>
    Number(a.left) - Number(b.left)
    || (state.points[b.id] ?? 0) - (state.points[a.id] ?? 0)
    || pos(a.id) - pos(b.id));
  const places: Record<string, number> = {};
  ranked.forEach((p, i) => {
    const prev = ranked[i - 1];
    const tied = prev && !p.left && !prev.left
      && (state.points[prev.id] ?? 0) === (state.points[p.id] ?? 0) && pos(prev.id) === pos(p.id);
    places[p.id] = tied ? places[prev.id] : i + 1;
  });
  return places;
}

// ---------------------------------------------------------------------------------------------
// Round flow

function startDraw(state: GameState, rand: RandInt, now: number) {
  state.phase = 'draw';
  state.draws = {};
  state.drawOrder = [];
  for (const p of state.players) if (p.bot && !p.left) drawFor(state, p.id, rand);
  state.deadline = deadlineIn(DRAW_SECONDS, now);
  maybeFinishDraw(state, rand, now);
}

function drawFor(state: GameState, id: string, rand: RandInt) {
  const pool = remainingDeck(Object.values(state.draws));
  state.draws[id] = pool[rand(pool.length)];
  state.drawOrder.push(id);
}

function maybeFinishDraw(state: GameState, rand: RandInt, now: number) {
  const present = state.players.filter((p) => !p.left).map((p) => p.id);
  if (!present.every((id) => id in state.draws)) return;
  // Lower card ranks higher; ties go to whoever drew first.
  const order = [...present].sort((a, b) =>
    state.draws[a] - state.draws[b] || state.drawOrder.indexOf(a) - state.drawOrder.indexOf(b));
  beginRound(state, order, rand, now);
}

function beginRound(state: GameState, order: string[], rand: RandInt, now: number) {
  const settings = getSettings(state);
  state.round += 1;
  state.order = order;
  state.event = settings.events ? COURT_EVENTS[rand(COURT_EVENTS.length)] : null;
  state.revolution = null;
  state.tax = [];
  state.trick = null;
  state.passed = [];
  state.finished = [];
  state.shamed = [];
  state.played = [];
  state.turn = null;
  state.notes = {};
  state.hands = {};
  for (const id of state.players.map((p) => p.id)) state.hands[id] = [];
  const deck = shuffle(fullDeck(), rand);
  deck.forEach((card, i) => state.hands[order[i % order.length]].push(card));
  for (const id of order) state.hands[id] = sortHand(state.hands[id]);
  if (state.event) log(state, 'event');

  const needsCourt = state.round === 1 || settings.revolution || state.event !== null;
  if (!needsCourt) return startTax(state, now);

  state.phase = 'court';
  state.ready = order.filter((id) => isBot(player(state, id)));
  state.deadline = deadlineIn(COURT_SECONDS, now);
  if (settings.revolution) {
    for (const id of state.ready) {
      if (holdsBothJesters(state, id) && wantsRevolution(order.indexOf(id), order.length)) declareRevolution(state, id);
    }
  }
  maybeFinishCourt(state, rand, now);
}

function holdsBothJesters(state: GameState, id: string): boolean {
  return (state.hands[id] ?? []).filter((c) => c === JESTER).length >= 2;
}

function declareRevolution(state: GameState, id: string) {
  const grand = state.order.at(-1) === id && state.order.length > 1;
  state.revolution = { by: id, grand };
  bumpStat(state, id, grand ? 'grandRevolutions' : 'revolutions');
  log(state, grand ? 'grandRevolution' : 'revolution', { by: id });
  if (grand) state.order = [...state.order].reverse();
}

function maybeFinishCourt(state: GameState, rand: RandInt, now: number) {
  if (state.phase !== 'court') return;
  if (!state.order.filter((id) => isPresent(state, id)).every((id) => state.ready.includes(id))) return;
  startTax(state, now);
}

function taxCounts(state: GameState): [number, number] {
  const settings = getSettings(state);
  if (settings.tax === 'none' || state.revolution || state.event === 'holiday') return [0, 0];
  const hike = state.event === 'taxHike' ? 1 : 0;
  return settings.tax === 'high' ? [3 + hike, 2 + hike] : [2 + hike, 1 + hike];
}

function startTax(state: GameState, now: number) {
  state.ready = [];
  const present = state.order.filter((id) => isPresent(state, id));
  const n = present.length;
  const [great, lesser] = taxCounts(state);
  const pairs = [];
  if (great > 0 && n >= 2) pairs.push({ from: present[n - 1], to: present[0], count: great, done: false });
  if (lesser > 0 && n >= 4) pairs.push({ from: present[n - 2], to: present[1], count: lesser, done: false });
  if (pairs.length === 0) return startPlay(state, now);

  const ctx = ruleCtx(state);
  state.phase = 'tax';
  state.tax = pairs;
  for (const pair of pairs) {
    const paid = bestCards(state.hands[pair.from], pair.count, ctx);
    state.hands[pair.from] = removeCards(state.hands[pair.from], paid);
    state.hands[pair.to] = sortHand([...state.hands[pair.to], ...paid]);
    state.notes[pair.from] = { received: [], gave: paid };
    state.notes[pair.to] = { received: paid, gave: [] };
    log(state, 'tax', { by: pair.from, to: pair.to, count: pair.count });
  }
  const seconds = getSettings(state).turnSeconds;
  state.deadline = deadlineIn(seconds ? Math.max(seconds, 30) : 60, now);
  for (const pair of pairs) {
    if (isBot(player(state, pair.to))) returnTax(state, pair.to, chooseBotTaxReturn(state.hands[pair.to], pair.count, ctx));
  }
  maybeFinishTax(state, now);
}

function returnTax(state: GameState, id: string, cards: number[]) {
  const pair = state.tax.find((t) => t.to === id && !t.done);
  if (!pair) return;
  state.hands[id] = removeCards(state.hands[id], cards);
  state.hands[pair.from] = sortHand([...state.hands[pair.from], ...cards]);
  state.notes[id] = { ...(state.notes[id] ?? { received: [] }), gave: cards };
  state.notes[pair.from] = { ...(state.notes[pair.from] ?? { gave: [] }), received: cards };
  pair.done = true;
}

function maybeFinishTax(state: GameState, now: number) {
  if (state.phase !== 'tax' || !state.tax.every((t) => t.done)) return;
  startPlay(state, now);
}

function startPlay(state: GameState, now: number) {
  state.phase = 'play';
  state.trick = null;
  state.passed = [];
  state.turn = state.order.find((id) => isActive(state, id)) ?? null;
  setTurnDeadline(state, now);
}

function setTurnDeadline(state: GameState, now: number) {
  state.deadline = deadlineIn(getSettings(state).turnSeconds, now);
}

/** Clears the trick; the player who laid it leads, or the next one if they are out. */
function clearTrick(state: GameState, now: number) {
  const by = state.trick?.by;
  state.trick = null;
  state.passed = [];
  const leader = by && isActive(state, by) ? by : by ? nextActiveAfter(state, by) : activeIds(state)[0];
  state.turn = leader ?? null;
  log(state, 'clear', { by: leader ?? undefined });
  setTurnDeadline(state, now);
}

/** After a pass (or a removal): clear the trick if everybody else passed, otherwise move on. */
function advanceAfter(state: GameState, actor: string, now: number) {
  if (!state.trick) {
    state.turn = isActive(state, actor) ? actor : nextActiveAfter(state, actor);
    setTurnDeadline(state, now);
    return;
  }
  const others = activeIds(state).filter((id) => id !== state.trick!.by);
  if (others.every((id) => state.passed.includes(id))) return clearTrick(state, now);
  // Passing does not lock you out: the turn simply moves on to the next player holding cards.
  state.turn = nextActiveAfter(state, actor);
  setTurnDeadline(state, now);
}

function roundOver(state: GameState): boolean {
  return activeIds(state).length <= 1;
}

function finishRound(state: GameState, rand: RandInt, now: number) {
  const settings = getSettings(state);
  const start = [...state.order];
  const remaining = activeIds(state);
  let finish = [...state.finished, ...remaining, ...state.shamed].filter((id) => isPresent(state, id));
  for (const id of state.shamed) log(state, 'jesterOut', { by: id });

  const king = start.find((id) => isPresent(state, id));
  if (settings.kingFall && king && finish[0] !== king && finish.length > 1) {
    finish = [...finish.filter((id) => id !== king), king];
    log(state, 'kingFall', { by: king });
  }

  const n = finish.length;
  const factor = state.event === 'doublePoints' ? 2 : 1;
  const points: Record<string, number> = {};
  finish.forEach((id, i) => {
    points[id] = (n - 1 - i) * factor;
    state.points[id] = (state.points[id] ?? 0) + points[id];
  });
  if (n > 0) {
    bumpStat(state, finish[0], 'crowns');
    if (n > 1) bumpStat(state, finish[n - 1], 'servant');
    const lastServant = state.history.at(-1)?.finish.at(-1);
    if (lastServant && lastServant === finish[0] && n > 1) bumpStat(state, finish[0], 'rises');
  }
  const result: RoundResult = {
    round: state.round, start, finish, points, event: state.event,
    revolution: state.revolution ? (state.revolution.grand ? 'grand' : 'revolution') : 'none',
  };
  state.history = [...state.history, result];
  state.trick = null;
  state.turn = null;
  state.passed = [];

  const presentCount = state.players.filter((p) => !p.left).length;
  const humansLeft = state.players.some((p) => !p.left && !p.bot);
  if (state.round >= settings.rounds || presentCount < MIN_PLAYERS || !humansLeft) return finishGame(state);

  state.phase = 'roundEnd';
  state.ready = state.players.filter((p) => p.bot && !p.left).map((p) => p.id);
  state.deadline = deadlineIn(ROUND_END_SECONDS, now);
  maybeFinishRoundEnd(state, rand, now);
}

function maybeFinishRoundEnd(state: GameState, rand: RandInt, now: number) {
  if (state.phase !== 'roundEnd') return;
  const present = state.players.filter((p) => !p.left).map((p) => p.id);
  if (!present.every((id) => state.ready.includes(id))) return;
  const last = state.history.at(-1)?.finish ?? [];
  const order = [...last.filter((id) => present.includes(id)), ...present.filter((id) => !last.includes(id))];
  beginRound(state, order, rand, now);
}

function finishGame(state: GameState) {
  state.status = 'finished';
  state.phase = null;
  state.deadline = null;
  state.turn = null;
  state.trick = null;
  state.ready = [];
  state.tax = [];
  for (const id of Object.keys(state.hands)) state.hands[id] = [];
  state.notes = {};
}

// ---------------------------------------------------------------------------------------------
// Moves

function doPlay(state: GameState, actor: string, cards: number[], rand: RandInt, now: number): string | null {
  if (state.phase !== 'play') return 'Gerade wird nicht ausgespielt.';
  if (state.turn !== actor) return 'Du bist nicht dran.';
  if (!Array.isArray(cards) || cards.length === 0) return 'Wähle mindestens eine Karte.';
  if (!containsAll(state.hands[actor] ?? [], cards)) return 'Diese Karten hast du nicht.';
  const ctx = ruleCtx(state);
  const verdict = judgePlay(cards, state.trick, ctx);
  if (!verdict.ok) return verdict.error;

  state.moveSeq += 1;
  state.hands[actor] = removeCards(state.hands[actor], cards);
  state.played = [...state.played, ...cards];
  bumpStat(state, actor, 'cardsPlayed', cards.length);
  state.trick = { cards: sortHand(cards), rank: verdict.rank, count: cards.length, by: actor, seq: state.moveSeq };
  state.passed = [];
  log(state, verdict.bomb ? 'bomb' : 'play', { by: actor, cards: sortHand(cards) });
  if (verdict.bomb) bumpStat(state, actor, 'bombs');

  if (state.hands[actor].length === 0) {
    const jesterOut = getSettings(state).jesterBan && cards.includes(JESTER);
    if (jesterOut) state.shamed = [...state.shamed, actor];
    else state.finished = [...state.finished, actor];
    log(state, 'out', { by: actor });
  }
  if (roundOver(state)) {
    finishRound(state, rand, now);
    return null;
  }
  if (verdict.bomb) {
    clearTrick(state, now);
    return null;
  }
  if (verdict.snap) {
    const skipped = nextActiveAfter(state, actor);
    if (skipped && skipped !== actor) {
      state.passed = [skipped];
      log(state, 'snap', { by: actor, to: skipped });
      advanceAfter(state, skipped, now);
      return null;
    }
  }
  advanceAfter(state, actor, now);
  return null;
}

function doPass(state: GameState, actor: string, now: number, kind: LogKind = 'pass'): string | null {
  if (state.phase !== 'play') return 'Gerade wird nicht ausgespielt.';
  if (state.turn !== actor) return 'Du bist nicht dran.';
  if (!state.trick) return 'Du spielst aus – passen geht nicht.';
  state.moveSeq += 1;
  state.passed = [...new Set([...state.passed, actor])];
  log(state, kind, { by: actor });
  advanceAfter(state, actor, now);
  return null;
}

/** The fallback move when time runs out or the host skips: pass, or lead the worst single card. */
function forcedMove(state: GameState, actor: string, rand: RandInt, now: number) {
  if (state.trick) {
    doPass(state, actor, now, 'timeout');
    return;
  }
  const [card] = worstCards(state.hands[actor] ?? [], 1, ruleCtx(state));
  log(state, 'timeout', { by: actor });
  if (card !== undefined) doPlay(state, actor, [card], rand, now);
}

/** Resolves whatever the game is waiting for (deadline passed or host skip). */
function resolveWaiting(state: GameState, rand: RandInt, now: number) {
  switch (state.phase) {
    case 'draw':
      for (const p of state.players) if (!p.left && !(p.id in state.draws)) drawFor(state, p.id, rand);
      state.moveSeq += 1;
      maybeFinishDraw(state, rand, now);
      return;
    case 'court':
      state.ready = state.order.filter((id) => isPresent(state, id));
      state.moveSeq += 1;
      maybeFinishCourt(state, rand, now);
      return;
    case 'tax': {
      const ctx = ruleCtx(state);
      for (const pair of state.tax.filter((t) => !t.done)) {
        returnTax(state, pair.to, worstCards(state.hands[pair.to], pair.count, ctx));
      }
      state.moveSeq += 1;
      maybeFinishTax(state, now);
      return;
    }
    case 'play':
      if (state.turn) forcedMove(state, state.turn, rand, now);
      return;
    case 'roundEnd':
      state.ready = state.players.filter((p) => !p.left).map((p) => p.id);
      state.moveSeq += 1;
      maybeFinishRoundEnd(state, rand, now);
      return;
  }
}

/** Removes a player from a running game: hand is discarded, the game moves on without them. */
function dropPlayer(state: GameState, id: string, rand: RandInt, now: number) {
  const p = player(state, id);
  if (!p || p.left) return;
  const wasTurn = state.turn === id;
  if (state.phase === 'tax') {
    const pending = state.tax.find((t) => t.to === id && !t.done);
    if (pending) returnTax(state, id, worstCards(state.hands[id], pending.count, ruleCtx(state)));
  }
  p.left = true;
  state.hands[id] = [];
  state.moveSeq += 1;
  log(state, 'left', { by: id });

  if (state.hostId === id) {
    const nextHost = state.players.find((q) => !q.left && !q.bot);
    if (nextHost) state.hostId = nextHost.id;
  }
  const present = state.players.filter((q) => !q.left);
  if (present.length < MIN_PLAYERS || !present.some((q) => !q.bot)) {
    if (state.phase === 'play' || state.phase === 'roundEnd' || state.phase === 'tax' || state.phase === 'court') {
      if (state.round > 0 && state.phase === 'play') finishRound(state, rand, now);
    }
    if (state.status !== 'finished') finishGame(state);
    return;
  }
  switch (state.phase) {
    case 'draw': return maybeFinishDraw(state, rand, now);
    case 'court': return maybeFinishCourt(state, rand, now);
    case 'tax': return maybeFinishTax(state, now);
    case 'roundEnd': return maybeFinishRoundEnd(state, rand, now);
    case 'play': {
      if (roundOver(state)) return finishRound(state, rand, now);
      const trick = state.trick;
      if (trick && activeIds(state).filter((o) => o !== trick.by).every((o) => state.passed.includes(o))) {
        return clearTrick(state, now);
      }
      if (wasTurn) {
        state.turn = nextActiveAfter(state, id);
        setTurnDeadline(state, now);
      }
    }
  }
}

function nextBotIdentity(state: GameState): { name: string; emoji: string } {
  const used = new Set(state.players.map((p) => p.bot?.name));
  return BOT_NAMES.find((b) => !used.has(b.name)) ?? { name: `Höfling ${state.players.length}`, emoji: '🎭' };
}

function validSettingsPatch(patch: Partial<Settings>): boolean {
  const bools: (keyof Settings)[] = ['revolution', 'jestersTaxable', 'chat', 'snap', 'bomb', 'kingFall', 'jesterBan', 'events', 'tracker'];
  for (const [key, value] of Object.entries(patch)) {
    if (bools.includes(key as keyof Settings)) {
      if (typeof value !== 'boolean') return false;
    } else if (key === 'rounds') {
      if (!(ROUND_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else if (key === 'turnSeconds') {
      if (!(TURN_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else if (key === 'tax') {
      if (!(TAX_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Entry point

export function applyAction(
  input: GameState, actor: string, action: GameAction, rand: RandInt, now: number = Date.now(),
): ActionResult {
  const state = clone(input);
  const fail = (error: string): ActionResult => ({ ok: false, error });
  const done = (): ActionResult => ({ ok: true, state });
  const me = player(state, actor);
  const isHost = state.hostId === actor;

  switch (action.type) {
    case 'join': {
      if (me && !me.left) return { ok: true, state: input };
      if (state.banned.includes(actor)) return fail('Du wurdest aus diesem Raum entfernt.');
      if (state.status !== 'lobby') return fail('Das Spiel läuft schon.');
      if (state.players.length >= MAX_PLAYERS) return fail('Der Tisch ist voll (8 Plätze).');
      state.players.push({ id: actor, left: false, deckId: null });
      return done();
    }

    case 'leave': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.status === 'lobby') {
        state.players = state.players.filter((p) => p.id !== actor);
        if (isHost) {
          const nextHost = state.players.find((p) => !p.bot);
          // Without humans the lobby dissolves (bots alone cannot keep it alive).
          if (!nextHost) state.players = [];
          else state.hostId = nextHost.id;
        }
        return done();
      }
      if (state.status === 'finished') return { ok: true, state: input };
      dropPlayer(state, actor, rand, now);
      return done();
    }

    case 'start': {
      if (!isHost) return fail('Nur der Host kann starten.');
      if (state.status !== 'lobby') return fail('Das Spiel läuft schon.');
      if (state.players.length < MIN_PLAYERS) return fail('Ihr braucht mindestens 2 Spieler – lade Freunde ein oder hol dir einen Bot.');
      state.status = 'playing';
      state.points = Object.fromEntries(state.players.map((p) => [p.id, 0]));
      state.stats = Object.fromEntries(state.players.map((p) => [p.id, { ...EMPTY_STATS }]));
      state.moveSeq += 1;
      startDraw(state, rand, now);
      return done();
    }

    case 'updateSettings': {
      if (!isHost) return fail('Nur der Host kann Einstellungen ändern.');
      if (state.status !== 'lobby') return fail('Einstellungen gehen nur in der Lobby.');
      if (!action.settings || !validSettingsPatch(action.settings)) return fail('Ungültige Einstellung.');
      state.settings = { ...getSettings(state), ...action.settings };
      return done();
    }

    case 'addBot': {
      if (!isHost) return fail('Nur der Host kann Bots holen.');
      if (state.status !== 'lobby') return fail('Bots gehen nur in der Lobby.');
      if (!(BOT_LEVELS as readonly string[]).includes(action.level)) return fail('Unbekannte Bot-Stufe.');
      if (state.players.length >= MAX_PLAYERS) return fail('Der Tisch ist voll (8 Plätze).');
      const identity = nextBotIdentity(state);
      const id = `bot-${rand(2 ** 30).toString(36)}${rand(2 ** 30).toString(36)}`;
      state.players.push({ id, left: false, deckId: null, bot: { ...identity, level: action.level as BotLevel } });
      return done();
    }

    case 'removePlayer': {
      if (!isHost) return fail('Nur der Host kann Spieler entfernen.');
      if (action.playerId === actor) return fail('Du kannst dich nicht selbst entfernen.');
      const target = player(state, action.playerId);
      if (!target || target.left) return fail('Spieler nicht gefunden.');
      if (state.status === 'lobby') {
        state.players = state.players.filter((p) => p.id !== target.id);
        if (!target.bot) state.banned = [...state.banned, target.id];
        return done();
      }
      if (state.status !== 'playing') return fail('Das Spiel ist schon vorbei.');
      dropPlayer(state, target.id, rand, now);
      return done();
    }

    case 'setDeck': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (action.deckId !== null && (typeof action.deckId !== 'string' || action.deckId.length > 64)) return fail('Ungültiges Deck.');
      if (me.deckId === action.deckId) return { ok: true, state: input };
      me.deckId = action.deckId;
      return done();
    }

    case 'draw': {
      if (state.phase !== 'draw') return fail('Gerade wird nicht gezogen.');
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (actor in state.draws) return { ok: true, state: input };
      state.moveSeq += 1;
      drawFor(state, actor, rand);
      maybeFinishDraw(state, rand, now);
      return done();
    }

    case 'ready': {
      if (state.phase !== 'court' && state.phase !== 'roundEnd') return fail('Gerade gibt es nichts zu bestätigen.');
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.ready.includes(actor)) return { ok: true, state: input };
      state.moveSeq += 1;
      state.ready = [...state.ready, actor];
      if (state.phase === 'court') maybeFinishCourt(state, rand, now);
      else maybeFinishRoundEnd(state, rand, now);
      return done();
    }

    case 'revolution': {
      if (state.phase !== 'court') return fail('Eine Revolution geht nur vor den Steuern.');
      if (!getSettings(state).revolution) return fail('Revolutionen sind in diesem Spiel aus.');
      if (state.revolution) return fail('Die Revolution wurde schon ausgerufen.');
      if (!holdsBothJesters(state, actor)) return fail('Für eine Revolution brauchst du beide Narren.');
      state.moveSeq += 1;
      declareRevolution(state, actor);
      state.ready = [...new Set([...state.ready, actor])];
      maybeFinishCourt(state, rand, now);
      return done();
    }

    case 'taxReturn': {
      if (state.phase !== 'tax') return fail('Gerade werden keine Steuern gezahlt.');
      const pair = state.tax.find((t) => t.to === actor && !t.done);
      if (!pair) return fail('Du musst nichts zurückgeben.');
      if (!Array.isArray(action.cards) || action.cards.length !== pair.count) {
        return fail(`Gib genau ${pair.count} ${pair.count === 1 ? 'Karte' : 'Karten'} zurück.`);
      }
      if (!containsAll(state.hands[actor], action.cards)) return fail('Diese Karten hast du nicht.');
      state.moveSeq += 1;
      returnTax(state, actor, action.cards);
      maybeFinishTax(state, now);
      return done();
    }

    case 'play': {
      const error = doPlay(state, actor, action.cards, rand, now);
      return error ? fail(error) : done();
    }

    case 'pass': {
      const error = doPass(state, actor, now);
      return error ? fail(error) : done();
    }

    case 'timeout': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.status !== 'playing' || !state.deadline) return fail('Hier läuft keine Zeit ab.');
      if (now < Date.parse(state.deadline)) return fail('Die Zeit ist noch nicht abgelaufen.');
      resolveWaiting(state, rand, now);
      return done();
    }

    case 'skip': {
      if (!isHost) return fail('Nur der Host kann überspringen.');
      if (state.status !== 'playing') return fail('Das Spiel läuft nicht.');
      resolveWaiting(state, rand, now);
      return done();
    }

    case 'botMove': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.phase !== 'play' || !state.turn) return fail('Kein Bot ist dran.');
      const bot = player(state, state.turn);
      if (!bot?.bot) return fail('Kein Bot ist dran.');
      const choice = chooseBotPlay(state.hands[bot.id], state.trick, ruleCtx(state), bot.bot.level, rand, {
        handCounts: activeIds(state).filter((id) => id !== bot.id).map((id) => state.hands[id].length),
        jesterBan: getSettings(state).jesterBan,
      });
      const error = choice ? doPlay(state, bot.id, choice, rand, now) : doPass(state, bot.id, now);
      if (error) forcedMove(state, bot.id, rand, now);
      return done();
    }
  }
}

/** Which bot (if any) the clients should nudge the server for. */
export function botToMove(state: Pick<PublicState, 'phase' | 'turn' | 'players' | 'status'>): string | null {
  if (state.status !== 'playing' || state.phase !== 'play' || !state.turn) return null;
  return state.players.find((p) => p.id === state.turn)?.bot ? state.turn : null;
}

/** Players the game is currently waiting on (for timers and "waiting for" labels). */
export function waitingOn(state: PublicState): string[] {
  const present = state.players.filter((p) => !p.left).map((p) => p.id);
  switch (state.phase) {
    case 'draw': return present.filter((id) => !(id in state.draws));
    case 'court':
    case 'roundEnd': return present.filter((id) => !state.ready.includes(id));
    case 'tax': return state.tax.filter((t) => !t.done).map((t) => t.to);
    case 'play': return state.turn ? [state.turn] : [];
    default: return [];
  }
}

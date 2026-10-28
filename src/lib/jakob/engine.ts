import {
  containsAll, fullDeck, JESTER, remainingDeck, removeCards, seededRand, shuffle, sortHand, type RandInt,
} from './cards';
import { chooseBotPlay, chooseBotTaxReturn, wantsRevolution } from './bots';
import { chooseBrainPlay, chooseBrainTaxReturn } from './brain';
import { PERSONA_BY_ID, type Persona, type QuipMoment } from './personas';
import type { TableView } from './search';
import { bestCards, isUnbeatable, judgePlay, worstCards, type RuleContext } from './rules';
import {
  BOT_LEVELS, COURT_EVENTS, DEFAULT_SETTINGS, DUEL_HAND, EMPTY_STATS, GOAL_OPTIONS, MAX_PLAYERS, PUBLIC_FILL_THRESHOLD, PUBLIC_FILL_TO, PUBLIC_MAX_HUMANS, PUBLIC_WAIT_SECONDS, MAX_PLAYERS_DOUBLE, MIN_PLAYERS,
  MISSION_POINTS, MISSIONS, ROUND_OPTIONS, TAX_OPTIONS, TURN_OPTIONS,
  type BotLevel, type GameAction, type GameState, type LogEntry, type LogKind, type MissionId, type Player,
  type PlayerStats, type PrivateHand, type PublicState, type RoundResult, type Settings,
} from './types';

export * from './types';

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };

const COURT_SECONDS = 20;
const DRAW_SECONDS = 30;
const ROUND_END_SECONDS = 20;
const LOG_LIMIT = 40;
/** With a point goal the game still ends after this many rounds at the latest. */
const GOAL_ROUND_CAP = 30;

const BOT_NAMES: { name: string; emoji: string }[] = [
  { name: 'Hofnarr Hugo', emoji: '🤹' },
  { name: 'Gräfin Gisela', emoji: '👸' },
  { name: 'Bauer Bernd', emoji: '👨‍🌾' },
  { name: 'Ritter Rüdiger', emoji: '🛡️' },
  { name: 'Köchin Klara', emoji: '👩‍🍳' },
  { name: 'Mönch Matthias', emoji: '🧙' },
  { name: 'Baronin Berta', emoji: '💎' },
  { name: 'Schäferin Sina', emoji: '🐑' },
  { name: 'Steinmetz Stefan', emoji: '⛏️' },
  { name: 'Näherin Nora', emoji: '🧵' },
  { name: 'Erzbischof Egon', emoji: '⛪' },
  { name: 'Marschall Max', emoji: '🎖️' },
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
    waitSince: null,
    log: [],
    history: [],
    stats: {},
    teams: null,
    mercyUsed: [],
    mercyRound: false,
    abdicated: false,
    crownStreak: null,
    throneWinner: null,
    audit: null,
    missionsRevealed: null,
    mode: 'normal',
    modeRef: null,
    autoStartAt: null,
    kicked: [],
    replay: null,
    quip: null,
    hands: {},
    reserve: [],
    notes: {},
    missions: {},
    seed: null,
    replayLog: [],
  };
}

/** New lobby for a rematch: same humans and bots, same decks and settings. */
export function createRematchState(hostId: string, previous: GameState): GameState {
  const state = createGameState(hostId, getSettings(previous));
  const keep = previous.players.filter((p) => !p.left);
  const host = keep.find((p) => p.id === hostId);
  state.players = [
    { id: hostId, left: false, deckId: host?.deckId ?? null },
    ...keep.filter((p) => p.id !== hostId).map((p) => ({ ...p, left: false, autopilot: false })),
  ];
  return state;
}

/** Fixed rules of the open online lobby: quick turns so strangers keep the table moving. */
export const PUBLIC_SETTINGS: Settings = { ...DEFAULT_SETTINGS, rounds: 5, turnSeconds: 30, chat: true, tracker: true };

/** A new open online lobby that starts by itself after PUBLIC_WAIT_SECONDS. */
export function createPublicLobbyState(hostId: string, now: number = Date.now()): GameState {
  const state = createGameState(hostId, PUBLIC_SETTINGS);
  state.mode = 'public';
  state.autoStartAt = new Date(now + PUBLIC_WAIT_SECONDS * 1000).toISOString();
  return state;
}

/** Older or partial settings objects are filled with defaults. */
export function getSettings(state: Pick<GameState, 'settings'>): Settings {
  return { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };
}

/** Older stored states lack newer fields: fill them so the engine can rely on them. */
export function normalizeState(state: GameState): GameState {
  const base = createGameState(state.hostId);
  const filled = { ...base, ...state, settings: getSettings(state) } as GameState;
  for (const id of Object.keys(filled.stats ?? {})) filled.stats[id] = { ...EMPTY_STATS, ...filled.stats[id] };
  return filled;
}

export function maxPlayers(state: Pick<GameState, 'settings'> & { mode?: GameState['mode'] }): number {
  if (state.mode === 'public') return PUBLIC_MAX_HUMANS;
  if (getSettings(state).duel) return 2;
  return getSettings(state).doubleDeck ? MAX_PLAYERS_DOUBLE : MAX_PLAYERS;
}

export const isBot = (p: Player | undefined) => !!p?.bot;
/** Bots and humans on autopilot are played by the server. */
export const isAutomated = (p: Player | undefined) => !!p?.bot || !!p?.autopilot;
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

function presentOrder(state: GameState): string[] {
  return state.order.filter((id) => isPresent(state, id));
}

function decks(state: Pick<GameState, 'settings'>): number {
  return getSettings(state).doubleDeck ? 2 : 1;
}

function ruleCtx(state: GameState): RuleContext {
  return { settings: getSettings(state), event: state.event, decks: decks(state) };
}

/** Turn time of the current round – "Blitzrunde" shrinks it by 5 s per round. */
export function turnSecondsFor(state: Pick<GameState, 'settings' | 'round'>): number | null {
  const settings = getSettings(state);
  if (!settings.blitz) return settings.turnSeconds;
  const start = settings.turnSeconds ?? 30;
  return Math.max(10, start - 5 * Math.max(0, state.round - 1));
}

export function taxSecondsFor(state: Pick<GameState, 'settings' | 'round'>): number {
  const seconds = turnSecondsFor(state);
  return seconds ? Math.max(seconds, 30) : 60;
}

function deadlineIn(seconds: number | null, now: number): string | null {
  return seconds === null ? null : new Date(now + seconds * 1000).toISOString();
}

/** Starts a new wait: optional deadline plus the moment from which "skip" becomes available. */
function setWait(state: GameState, seconds: number | null, now: number) {
  state.deadline = deadlineIn(seconds, now);
  state.waitSince = new Date(now).toISOString();
}

/** Seconds anyone at the table has to wait before they may skip an idle player. */
export const SKIP_AFTER_SECONDS = 30;

function log(state: GameState, kind: LogKind, extra: Omit<LogEntry, 'seq' | 'kind'> = {}) {
  state.log = [...state.log, { seq: state.moveSeq, kind, ...extra }].slice(-LOG_LIMIT);
}

function stats(state: GameState, id: string): PlayerStats {
  if (!state.stats[id]) state.stats[id] = { ...EMPTY_STATS, byRank: Array(13).fill(0) };
  if (!state.stats[id].byRank) state.stats[id].byRank = Array(13).fill(0);
  return state.stats[id];
}

function bumpStat(state: GameState, id: string, key: Exclude<keyof PlayerStats, 'byRank'>, by = 1) {
  const s = stats(state, id);
  s[key] = (s[key] ?? 0) + by;
}

function addPoints(state: GameState, id: string, points: number) {
  state.points[id] = (state.points[id] ?? 0) + points;
}

/** Next player who still holds cards and has not passed on the current trick. */
function nextToAct(state: GameState, id: string): string | null {
  let next = nextActiveAfter(state, id);
  for (let guard = 0; next && state.passed.includes(next) && guard < state.order.length; guard++) {
    next = nextActiveAfter(state, next);
  }
  return next && !state.passed.includes(next) ? next : null;
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
// Missions

function completeMission(state: GameState, id: string, mission: MissionId) {
  const m = state.missions[id];
  if (!getSettings(state).missions || !m || m.id !== mission || m.done || !isPresent(state, id)) return;
  m.done = true;
  addPoints(state, id, MISSION_POINTS);
  bumpStat(state, id, 'missions');
  log(state, 'mission', { by: id, mission });
}

function assignMissions(state: GameState, rand: RandInt) {
  const pool = shuffle(MISSIONS, rand);
  state.players.forEach((p, i) => {
    state.missions[p.id] = { id: pool[i % pool.length], done: false };
  });
}

// ---------------------------------------------------------------------------------------------
// Projections

export function publicState(state: GameState): PublicState {
  const { hands, reserve, notes: _notes, missions: _missions, seed: _seed, replayLog: _replay, ...pub } = state;
  void _notes;
  void _missions;
  void _seed;
  void _replay;
  const handCounts = Object.fromEntries(Object.entries(hands).map(([id, cards]) => [id, cards.length]));
  return structuredClone({ ...pub, handCounts, reserveCount: reserve?.length ?? 0 });
}

export function privateHand(state: GameState, id: string): PrivateHand {
  const notes = state.notes[id];
  return {
    cards: sortHand(state.hands[id] ?? []),
    received: [...(notes?.received ?? [])],
    gave: [...(notes?.gave ?? [])],
    swapGave: notes?.swapGave ? [...notes.swapGave] : undefined,
    swapGot: notes?.swapGot ? [...notes.swapGot] : undefined,
    drawn: notes?.drawn ? [...notes.drawn] : undefined,
    mission: state.missions?.[id] ? { ...state.missions[id] } : null,
  };
}

export interface Secrets {
  hands: GameState['hands'];
  notes: GameState['notes'];
  missions: GameState['missions'];
  seed: number | null;
  replayLog: GameState['replayLog'];
  reserve: number[];
}

export function secretsOf(state: GameState): Secrets {
  return { hands: state.hands, notes: state.notes, missions: state.missions, seed: state.seed, replayLog: state.replayLog, reserve: state.reserve };
}

export function fromParts(pub: PublicState, secret: Partial<Secrets>): GameState {
  const { handCounts: _counts, reserveCount: _reserve, ...rest } = structuredClone(pub);
  void _counts;
  void _reserve;
  return normalizeState({
    ...rest,
    hands: structuredClone(secret.hands ?? {}),
    notes: structuredClone(secret.notes ?? {}),
    missions: structuredClone(secret.missions ?? {}),
    seed: secret.seed ?? null,
    replayLog: structuredClone(secret.replayLog ?? []),
    reserve: structuredClone(secret.reserve ?? []),
  } as GameState);
}

type PlacementInput = Pick<GameState, 'players' | 'points' | 'history'> & Partial<Pick<GameState, 'teams' | 'throneWinner'>>;

/** Sum of points per team (team mode). */
export function teamPoints(state: Pick<GameState, 'players' | 'points'> & Partial<Pick<GameState, 'teams'>>): [number, number] {
  const totals: [number, number] = [0, 0];
  if (!state.teams) return totals;
  for (const p of state.players) {
    const team = state.teams[p.id];
    if (team !== undefined && !p.left) totals[team] += state.points[p.id] ?? 0;
  }
  return totals;
}

/**
 * Final standings. Normal games: points, then the last round's finishing order.
 * "Thronfolge" puts the throne winner first; team games place the whole winning team first.
 */
export function placements(state: PlacementInput): Record<string, number> {
  const last = state.history.at(-1)?.finish ?? [];
  const pos = (id: string) => {
    const i = last.indexOf(id);
    return i < 0 ? 99 : i;
  };
  if (state.teams) {
    const [a, b] = teamPoints(state);
    const winners: (0 | 1)[] = a === b ? [0, 1] : a > b ? [0] : [1];
    return Object.fromEntries(state.players.map((p) => {
      const team = state.teams![p.id];
      if (p.left || team === undefined) return [p.id, 3];
      return [p.id, winners.includes(team) ? 1 : 2];
    }));
  }
  const throne = state.throneWinner ?? null;
  const ranked = [...state.players].sort((a, b) =>
    Number(a.left) - Number(b.left)
    || Number(b.id === throne) - Number(a.id === throne)
    || (state.points[b.id] ?? 0) - (state.points[a.id] ?? 0)
    || pos(a.id) - pos(b.id));
  const places: Record<string, number> = {};
  ranked.forEach((p, i) => {
    const prev = ranked[i - 1];
    const tied = prev && !p.left && !prev.left && prev.id !== throne
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
  setWait(state, DRAW_SECONDS, now);
  maybeFinishDraw(state, rand, now);
}

function drawFor(state: GameState, id: string, rand: RandInt) {
  const pool = remainingDeck(Object.values(state.draws), decks(state));
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
  // A fixed seed (daily challenge) makes the deal identical for everyone.
  const dealRand = state.seed !== null ? seededRand(state.seed * 101 + state.round + 1) : rand;
  state.round += 1;
  state.order = order;
  state.event = settings.events ? COURT_EVENTS[dealRand(COURT_EVENTS.length)] : null;
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
  state.mercyRound = false;
  state.abdicated = false;
  state.audit = null;
  for (const id of state.players.map((p) => p.id)) state.hands[id] = [];
  const deck = shuffle(fullDeck(decks(state)), dealRand);
  // Duel: 15 cards each, the rest stays face down as the reserve.
  const dealt = isDuel(state) ? DUEL_HAND * order.length : deck.length;
  state.reserve = deck.slice(dealt);
  deck.slice(0, dealt).forEach((card, i) => state.hands[order[i % order.length]].push(card));
  for (const id of order) state.hands[id] = sortHand(state.hands[id]);
  if (state.event) log(state, 'event');
  if (state.event === 'audit' && order.length > 0) {
    const hand = state.hands[order[0]];
    state.audit = { by: order[0], card: hand[rand(hand.length)] };
    log(state, 'audit', { by: order[0], cards: [state.audit.card] });
  }

  const needsCourt = state.round === 1 || settings.revolution || settings.mercy || settings.abdicate || state.event !== null;
  if (!needsCourt) return startTax(state, rand, now);

  state.phase = 'court';
  state.ready = order.filter((id) => isAutomated(player(state, id)));
  setWait(state, COURT_SECONDS, now);
  for (const id of state.ready) automateCourt(state, id);
  maybeFinishCourt(state, rand, now);
}

/** Decisions bots (and autopiloted players) take in the court ceremony. */
function automateCourt(state: GameState, id: string) {
  const settings = getSettings(state);
  const order = state.order;
  if (settings.revolution && !state.revolution && holdsBothJesters(state, id) && wantsRevolution(order.indexOf(id), order.length)) {
    declareRevolution(state, id);
  }
  const present = presentOrder(state);
  if (settings.mercy && !state.revolution && !state.mercyRound && present.at(-1) === id && !state.mercyUsed.includes(id) && state.round > 1) {
    grantMercy(state, id);
  }
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
  completeMission(state, id, 'revolutionary');
  say(state, id, 'revolution');
}

function grantMercy(state: GameState, id: string) {
  state.mercyRound = true;
  state.mercyUsed = [...state.mercyUsed, id];
  log(state, 'mercy', { by: id });
}

function maybeFinishCourt(state: GameState, rand: RandInt, now: number) {
  if (state.phase !== 'court') return;
  if (!presentOrder(state).every((id) => state.ready.includes(id))) return;
  startTax(state, rand, now);
}

function taxCounts(state: GameState): [number, number] {
  const settings = getSettings(state);
  if (settings.tax === 'none' || state.revolution || state.event === 'holiday') return [0, 0];
  const hike = state.event === 'taxHike' ? 1 : 0;
  // Smaller duel hands pay a smaller tax.
  const base = isDuel(state) ? [1, 0] : [2, 1];
  const [great, lesser] = settings.tax === 'high' ? [base[0] + 1 + hike, base[1] + 1 + hike] : [base[0] + hike, base[1] + hike];
  return [state.mercyRound ? 0 : great, lesser];
}

function startTax(state: GameState, rand: RandInt, now: number) {
  state.ready = [];
  const present = presentOrder(state);
  const n = present.length;
  const ctx = ruleCtx(state);

  // "Mildtätigkeit": the Great Jakob hands his worst card to the Great Servant.
  if (state.event === 'charity' && !state.revolution && n >= 2) {
    const [gift] = worstCards(state.hands[present[0]], 1, ctx);
    if (gift !== undefined) {
      state.hands[present[0]] = removeCards(state.hands[present[0]], [gift]);
      state.hands[present[n - 1]] = sortHand([...state.hands[present[n - 1]], gift]);
      log(state, 'charity', { by: present[0], to: present[n - 1], cards: [gift] });
    }
  }

  const [great, lesser] = taxCounts(state);
  const pairs = [];
  if (great > 0 && n >= 2) pairs.push({ from: present[n - 1], to: present[0], count: great, done: false });
  if (lesser > 0 && n >= 4) pairs.push({ from: present[n - 2], to: present[1], count: lesser, done: false });
  if (pairs.length === 0) return startPlay(state, rand, now);

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
  setWait(state, taxSecondsFor(state), now);
  for (const pair of pairs) {
    if (isAutomated(player(state, pair.to))) returnTax(state, pair.to, automatedTaxReturn(state, pair.to, pair.count));
  }
  maybeFinishTax(state, rand, now);
}

function returnTax(state: GameState, id: string, cards: number[]) {
  const pair = state.tax.find((t) => t.to === id && !t.done);
  if (!pair) return;
  state.hands[id] = removeCards(state.hands[id], cards);
  // Cards returned to a servant who already left are discarded with the rest of their hand.
  if (isPresent(state, pair.from)) state.hands[pair.from] = sortHand([...state.hands[pair.from], ...cards]);
  state.notes[id] = { ...(state.notes[id] ?? { received: [] }), gave: cards };
  state.notes[pair.from] = { ...(state.notes[pair.from] ?? { gave: [] }), received: cards };
  pair.done = true;
}

function maybeFinishTax(state: GameState, rand: RandInt, now: number) {
  if (state.phase !== 'tax' || !state.tax.every((t) => t.done)) return;
  startPlay(state, rand, now);
}

/** Every player in `ring` gives one random card to the next one (all at once). */
function passAround(state: GameState, ring: string[], rand: RandInt) {
  if (ring.length < 2) return;
  const gifts = ring.map((id) => {
    const hand = state.hands[id];
    return hand.length > 0 ? hand[rand(hand.length)] : undefined;
  });
  ring.forEach((id, i) => {
    const gift = gifts[i];
    if (gift === undefined) return;
    const to = ring[(i + 1) % ring.length];
    state.hands[id] = removeCards(state.hands[id], [gift]);
    state.hands[to] = sortHand([...state.hands[to], gift]);
    const giver = state.notes[id] ?? { received: [], gave: [] };
    const taker = state.notes[to] ?? { received: [], gave: [] };
    state.notes[id] = { ...giver, swapGave: [...(giver.swapGave ?? []), gift] };
    state.notes[to] = { ...taker, swapGot: [...(taker.swapGot ?? []), gift] };
  });
}

function startPlay(state: GameState, rand: RandInt, now: number) {
  const present = presentOrder(state);
  // "Hoftausch": citizens pass a random card along.
  if (getSettings(state).courtSwap) {
    const citizens = present.filter((_, i) => rankTitle(i, present.length) === 'Bürger');
    if (citizens.length >= 2) {
      passAround(state, citizens, rand);
      log(state, 'courtSwap', { count: citizens.length });
    }
  }
  // "Pest": everyone passes a random card to the next player.
  if (state.event === 'pest' && present.length >= 2) {
    passAround(state, present, rand);
    log(state, 'pest');
  }
  state.phase = 'play';
  state.trick = null;
  state.passed = [];
  state.turn = state.order.find((id) => isActive(state, id)) ?? null;
  state.replayLog = [...state.replayLog, {
    round: state.round, order: [...state.order], hands: structuredClone(state.hands), event: state.event, moves: [],
  }];
  setTurnDeadline(state, now);
}

function record(state: GameState, move: GameState['replayLog'][number]['moves'][number]) {
  state.replayLog.at(-1)?.moves.push(move);
}

function setTurnDeadline(state: GameState, now: number) {
  setWait(state, turnSecondsFor(state), now);
}

/** Clears the trick; the player who laid it wins it and leads, or the next one if they are out. */
function clearTrick(state: GameState, now: number) {
  const trick = state.trick;
  const by = trick?.by;
  if (trick && by) {
    bumpStat(state, by, 'tricks');
    if (trick.rank === 12) completeMission(state, by, 'twelveTrick');
    if (stats(state, by).tricks >= 5) completeMission(state, by, 'fiveTricks');
  }
  state.trick = null;
  state.passed = [];
  const leader = by && isActive(state, by) ? by : by ? nextActiveAfter(state, by) : activeIds(state)[0];
  state.turn = leader ?? null;
  record(state, { k: 'c', by: leader ?? null });
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
  // Whoever passed sits out the rest of this trick.
  state.turn = nextToAct(state, actor);
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
    const coronation = state.event === 'coronation' && i === 0 ? 2 : 1;
    points[id] = (n - 1 - i) * factor * coronation;
  });
  // Duel: the winner scores every card the loser still holds (jesters twice).
  if (isDuel(state) && n === 2) {
    const left = state.hands[finish[1]] ?? [];
    const margin = Math.max(1, left.length + left.filter((c) => c === JESTER).length);
    points[finish[0]] = margin * factor * (state.event === 'coronation' ? 2 : 1);
  }
  // "Narrenfluch": jesters still in hand cost a point each.
  if (settings.jesterCurse) {
    for (const id of finish) {
      const jesters = (state.hands[id] ?? []).filter((c) => c === JESTER).length;
      if (jesters > 0) {
        points[id] -= jesters;
        log(state, 'jesterCurse', { by: id, count: jesters });
      }
    }
  }
  for (const id of finish) addPoints(state, id, points[id]);
  if (n > 1) {
    say(state, finish[n - 1], 'servant');
    say(state, finish[0], 'crown');
  }

  if (n > 0) {
    bumpStat(state, finish[0], 'crowns');
    if (n > 1) bumpStat(state, finish[n - 1], 'servant');
    const lastServant = state.history.at(-1)?.finish.at(-1);
    if (lastServant && lastServant === finish[0] && n > 1) bumpStat(state, finish[0], 'rises');
    if (stats(state, finish[0]).crowns >= 2) completeMission(state, finish[0], 'crownTwice');
    const startPresent = start.filter((id) => isPresent(state, id));
    for (const id of finish) {
      if (startPresent.indexOf(id) - finish.indexOf(id) >= 2) completeMission(state, id, 'climber');
    }
    state.crownStreak = state.crownStreak?.id === finish[0]
      ? { id: finish[0], count: state.crownStreak.count + 1 }
      : { id: finish[0], count: 1 };
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
  if (settings.throne && state.crownStreak && state.crownStreak.count >= 3) {
    state.throneWinner = state.crownStreak.id;
    log(state, 'throne', { by: state.crownStreak.id });
    return finishGame(state);
  }
  const goalReached = settings.goal !== null && Object.values(state.points).some((p) => p >= settings.goal!);
  const lastRound = settings.goal !== null ? GOAL_ROUND_CAP : settings.rounds;
  if (goalReached || state.round >= lastRound || presentCount < MIN_PLAYERS || !humansLeft) return finishGame(state);

  state.phase = 'roundEnd';
  state.ready = state.players.filter((p) => isAutomated(p) && !p.left).map((p) => p.id);
  setWait(state, ROUND_END_SECONDS, now);
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
  const places = placements(state);
  for (const p of state.players) if (p.bot?.persona && !p.left && state.history.length > 0) say(state, p.id, places[p.id] === 1 ? 'win' : 'lose');
  for (const p of state.players) {
    if (!p.left && state.history.length >= 2 && stats(state, p.id).servant === 0) completeMission(state, p.id, 'neverServant');
  }
  state.status = 'finished';
  state.phase = null;
  state.deadline = null;
  state.waitSince = null;
  state.turn = null;
  state.trick = null;
  state.ready = [];
  state.tax = [];
  for (const id of Object.keys(state.hands)) state.hands[id] = [];
  state.notes = {};
  if (getSettings(state).missions) state.missionsRevealed = structuredClone(state.missions);
  // A daily challenge deal must stay secret for everyone who has not played yet.
  state.replay = state.mode === 'daily' ? null : structuredClone(state.replayLog);
  if (state.mode === 'daily') {
    // Finished games are readable by everyone: do not leak played cards of today's deal.
    state.log = [];
    state.played = [];
  }
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
  const byRank = stats(state, actor).byRank;
  for (const c of cards) byRank[c - 1] = (byRank[c - 1] ?? 0) + 1;
  state.trick = { cards: sortHand(cards), rank: verdict.rank, count: cards.length, by: actor, seq: state.moveSeq };
  record(state, { k: 'p', by: actor, c: sortHand(cards) });
  log(state, verdict.bomb ? 'bomb' : 'play', { by: actor, cards: sortHand(cards) });
  if (verdict.bomb) {
    bumpStat(state, actor, 'bombs');
    say(state, actor, 'bomb');
  }
  if (cards.length >= 4) completeMission(state, actor, 'bigPlay');
  if (cards.length === 1 && cards[0] === JESTER) completeMission(state, actor, 'loneJester');

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
  // Nobody can go lower (the 1, or all lower ranks are gone): the trick is won at once.
  if (isUnbeatable(state.trick, state.played, ctx)) {
    log(state, 'unbeatable', { by: actor });
    clearTrick(state, now);
    return null;
  }
  if (verdict.snap) {
    const skipped = nextToAct(state, actor);
    if (skipped && skipped !== actor) {
      state.passed = [...state.passed, skipped];
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
  record(state, { k: 'x', by: actor });
  log(state, kind, { by: actor });
  // Duel: passing costs a card from the reserve.
  if (isDuel(state) && state.reserve.length > 0) {
    const [card, ...rest] = state.reserve;
    state.reserve = rest;
    state.hands[actor] = sortHand([...state.hands[actor], card]);
    const notes = state.notes[actor] ?? { received: [], gave: [] };
    state.notes[actor] = { ...notes, drawn: [...(notes.drawn ?? []), card] };
    record(state, { k: 'd', by: actor, c: [card] });
    log(state, 'duelDraw', { by: actor });
  }
  advanceAfter(state, actor, now);
  return null;
}

/** The fallback move when time runs out or someone skips: pass, or lead the worst single card. */
function forcedMove(state: GameState, actor: string, rand: RandInt, now: number) {
  if (state.trick) {
    doPass(state, actor, now, 'timeout');
    return;
  }
  const [card] = worstCards(state.hands[actor] ?? [], 1, ruleCtx(state));
  log(state, 'timeout', { by: actor });
  if (card !== undefined) doPlay(state, actor, [card], rand, now);
}

/** A bot-quality move for the player on turn (bots and autopilot). */
function automatedPlay(state: GameState, id: string, rand: RandInt, now: number) {
  const p = player(state, id);
  const level: BotLevel = p?.bot?.level ?? 'sly';
  const persona = personaOf(p);
  const opponents = activeIds(state).filter((o) => o !== id).map((o) => state.hands[o].length);
  const jesterBan = getSettings(state).jesterBan;
  const choice = persona
    ? chooseBrainPlay(state.hands[id], state.trick, ruleCtx(state), persona.style, rand, {
      played: state.played, decks: decks(state), opponents, duelDraw: isDuel(state) && state.reserve.length > 0, jesterBan,
      table: tableView(state, id),
    })
    : chooseBotPlay(state.hands[id], state.trick, ruleCtx(state), level, rand, { handCounts: opponents, jesterBan });
  const error = choice ? doPlay(state, id, choice, rand, now) : doPass(state, id, now);
  if (error) forcedMove(state, id, rand, now);
}

/**
 * Once every player still holding cards is a bot (or on autopilot), nobody needs to watch the rest
 * of the round: the server plays it out at once and the table jumps straight to the round end.
 */
function fastForwardBotsOnly(state: GameState, rand: RandInt, now: number) {
  if (state.status !== 'playing' || state.phase !== 'play') return;
  const active = activeIds(state);
  if (active.length < 2 || !active.every((id) => isAutomated(player(state, id)))) return;
  log(state, 'fastForward');
  for (let guard = 0; guard < 2000 && state.phase === 'play' && state.turn; guard++) {
    automatedPlay(state, state.turn, rand, now);
  }
}

/** Resolves whatever the game is waiting for (deadline passed or skip). */
function resolveWaiting(state: GameState, rand: RandInt, now: number) {
  switch (state.phase) {
    case 'draw':
      for (const p of state.players) if (!p.left && !(p.id in state.draws)) drawFor(state, p.id, rand);
      state.moveSeq += 1;
      maybeFinishDraw(state, rand, now);
      return;
    case 'court':
      state.ready = presentOrder(state);
      state.moveSeq += 1;
      maybeFinishCourt(state, rand, now);
      return;
    case 'tax': {
      const ctx = ruleCtx(state);
      for (const pair of state.tax.filter((t) => !t.done)) {
        returnTax(state, pair.to, worstCards(state.hands[pair.to], pair.count, ctx));
      }
      state.moveSeq += 1;
      maybeFinishTax(state, rand, now);
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

/** Lets the server act for a player that just went on autopilot. */
function actFor(state: GameState, id: string, rand: RandInt, now: number) {
  switch (state.phase) {
    case 'draw':
      if (!(id in state.draws)) drawFor(state, id, rand);
      return maybeFinishDraw(state, rand, now);
    case 'court':
      automateCourt(state, id);
      state.ready = [...new Set([...state.ready, id])];
      return maybeFinishCourt(state, rand, now);
    case 'tax': {
      const pair = state.tax.find((t) => t.to === id && !t.done);
      if (pair) returnTax(state, id, automatedTaxReturn(state, id, pair.count));
      return maybeFinishTax(state, rand, now);
    }
    case 'roundEnd':
      state.ready = [...new Set([...state.ready, id])];
      return maybeFinishRoundEnd(state, rand, now);
    case 'play':
      if (state.turn === id) automatedPlay(state, id, rand, now);
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
    if (state.round > 0 && state.phase === 'play') finishRound(state, rand, now);
    if (state.status !== 'finished') finishGame(state);
    return;
  }
  switch (state.phase) {
    case 'draw': return maybeFinishDraw(state, rand, now);
    case 'court': return maybeFinishCourt(state, rand, now);
    case 'tax': return maybeFinishTax(state, rand, now);
    case 'roundEnd': return maybeFinishRoundEnd(state, rand, now);
    case 'play': {
      if (roundOver(state)) return finishRound(state, rand, now);
      const trick = state.trick;
      if (trick && activeIds(state).filter((o) => o !== trick.by).every((o) => state.passed.includes(o))) {
        return clearTrick(state, now);
      }
      if (wasTurn) {
        state.turn = nextToAct(state, id);
        setTurnDeadline(state, now);
      }
    }
  }
}

const isDuel = (state: Pick<GameState, 'settings'>) => getSettings(state).duel;

/** What a bot may know about the table: seats in turn order from its own, card counts, passes. */
export function tableView(state: GameState, id: string): TableView {
  const active = activeIds(state);
  const at = Math.max(0, active.indexOf(id));
  const order = [...active.slice(at), ...active.slice(0, at)];
  return {
    me: id,
    active: order,
    counts: Object.fromEntries(order.map((o) => [o, state.hands[o]?.length ?? 0])),
    passed: [...state.passed],
    finishedCount: state.finished.length + state.shamed.length,
    players: presentOrder(state).length,
    reserve: state.reserve.length,
    duelDraw: isDuel(state) && state.reserve.length > 0,
  };
}

function personaOf(p: Player | undefined): Persona | null {
  return p?.bot?.persona ? PERSONA_BY_ID[p.bot.persona] ?? null : null;
}

function automatedTaxReturn(state: GameState, id: string, count: number): number[] {
  const persona = personaOf(player(state, id));
  const ctx = ruleCtx(state);
  return persona
    ? chooseBrainTaxReturn(state.hands[id], count, ctx, persona.style, state.played, decks(state))
    : chooseBotTaxReturn(state.hands[id], count, ctx);
}

/** A persona bot says something fitting; the line is picked from the move counter (no randomness needed). */
function say(state: GameState, id: string, moment: QuipMoment) {
  const persona = personaOf(player(state, id));
  const lines = persona?.quips[moment];
  if (!lines?.length) return;
  state.quip = { by: id, text: lines[(state.moveSeq + state.round) % lines.length], seq: state.moveSeq };
}

function nextBotIdentity(state: GameState): { name: string; emoji: string } {
  const used = new Set(state.players.map((p) => p.bot?.name));
  return BOT_NAMES.find((b) => !used.has(b.name)) ?? { name: `Höfling ${state.players.length}`, emoji: '🎭' };
}

const BOOLEAN_SETTINGS: (keyof Settings)[] = [
  'revolution', 'jestersTaxable', 'chat', 'snap', 'bomb', 'kingFall', 'jesterBan', 'events', 'tracker',
  'missions', 'throne', 'teams', 'mercy', 'abdicate', 'jesterCurse', 'courtSwap', 'blitz', 'doubleDeck', 'duel',
];

function validSettingsPatch(patch: Partial<Settings>): boolean {
  for (const [key, value] of Object.entries(patch)) {
    if (BOOLEAN_SETTINGS.includes(key as keyof Settings)) {
      if (typeof value !== 'boolean') return false;
    } else if (key === 'rounds') {
      if (!(ROUND_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else if (key === 'goal') {
      if (!(GOAL_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else if (key === 'turnSeconds') {
      if (!(TURN_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else if (key === 'tax') {
      if (!(TAX_OPTIONS as readonly unknown[]).includes(value)) return false;
    } else return false;
  }
  return true;
}

/** Deals the first round: shared by the host's start and the open lobby's auto start. */
function beginGame(state: GameState, rand: RandInt, now: number) {
  const settings = getSettings(state);
  state.status = 'playing';
  state.points = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  state.stats = Object.fromEntries(state.players.map((p) => [p.id, { ...EMPTY_STATS, byRank: Array(13).fill(0) }]));
  state.teams = settings.teams ? Object.fromEntries(state.players.map((p, i) => [p.id, (i % 2) as 0 | 1])) : null;
  if (settings.missions) assignMissions(state, rand);
  state.moveSeq += 1;
  const talkers = state.players.filter((p) => p.bot?.persona);
  if (talkers.length > 0) say(state, talkers[rand(talkers.length)].id, 'greet');
  // The daily challenge skips the draw so that everybody gets the same seat and deal.
  if (state.seed !== null) {
    state.phase = 'draw';
    beginRound(state, state.players.map((p) => p.id), rand, now);
  } else startDraw(state, rand, now);
}

// ---------------------------------------------------------------------------------------------
// Entry point

export function applyAction(
  stored: GameState, actor: string, action: GameAction, rand: RandInt, now: number = Date.now(),
): ActionResult {
  const res = applyActionInner(stored, actor, action, rand, now);
  if (!res.ok) return res;
  const state = res.state === stored ? clone(stored) : res.state;
  const before = state.moveSeq;
  fastForwardBotsOnly(state, rand, now);
  return state.moveSeq === before && res.state === stored ? res : { ok: true, state };
}

function applyActionInner(
  stored: GameState, actor: string, action: GameAction, rand: RandInt, now: number,
): ActionResult {
  const input = stored;
  const state = normalizeState(clone(stored));
  const fail = (error: string): ActionResult => ({ ok: false, error });
  const done = (): ActionResult => ({ ok: true, state });
  const me = player(state, actor);
  const isHost = state.hostId === actor;
  const full = () => `Der Tisch ist voll (${maxPlayers(state)} Plätze).`;

  switch (action.type) {
    case 'join': {
      if (me && !me.left) return { ok: true, state: input };
      if (state.banned.includes(actor)) return fail('Du wurdest aus diesem Raum entfernt.');
      if (state.status !== 'lobby') return fail('Das Spiel läuft schon.');
      if (state.players.length >= maxPlayers(state)) return fail(full());
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
      if (state.mode === 'public') return fail('Die offene Lobby startet von selbst.');
      if (!isHost) return fail('Nur der Host kann starten.');
      if (state.status !== 'lobby') return fail('Das Spiel läuft schon.');
      if (state.players.length < MIN_PLAYERS) return fail('Ihr braucht mindestens 2 Spieler – lade Freunde ein oder hol dir einen Bot.');
      const settings = getSettings(state);
      if (settings.teams && (state.players.length < 4 || state.players.length % 2 !== 0)) {
        return fail('Für Adel gegen Volk braucht ihr eine gerade Spielerzahl ab 4.');
      }
      if (settings.duel && state.players.length !== 2) return fail('Ein Duell spielt man zu zweit.');
      beginGame(state, rand, now);
      return done();
    }

    case 'autoStart': {
      if (state.mode !== 'public') return fail('Nur die offene Lobby startet automatisch.');
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.status !== 'lobby') return { ok: true, state: input };
      const humans = state.players.filter((p) => !p.bot).length;
      const due = !!state.autoStartAt && now >= Date.parse(state.autoStartAt);
      if (!due && humans < PUBLIC_MAX_HUMANS) return fail('Die Lobby wartet noch auf Mitspieler.');
      // Few people came: bots take the empty seats. Otherwise the table starts as it is.
      if (humans <= PUBLIC_FILL_THRESHOLD) {
        while (state.players.length < PUBLIC_FILL_TO) {
          const identity = nextBotIdentity(state);
          const level: BotLevel = state.players.length % 2 === 0 ? 'easy' : 'sly';
          state.players.push({ id: `bot-${rand(2 ** 30).toString(36)}${rand(2 ** 30).toString(36)}`, left: false, deckId: null, bot: { ...identity, level } });
        }
      }
      beginGame(state, rand, now);
      return done();
    }

    case 'updateSettings': {
      if (state.mode === 'public') return fail('In der offenen Lobby gelten feste Regeln.');
      if (!isHost) return fail('Nur der Host kann Einstellungen ändern.');
      if (state.status !== 'lobby') return fail('Einstellungen gehen nur in der Lobby.');
      if (!action.settings || !validSettingsPatch(action.settings)) return fail('Ungültige Einstellung.');
      if (action.settings.doubleDeck === false && state.players.length > MAX_PLAYERS) {
        return fail(`Ohne Doppeldeck passen nur ${MAX_PLAYERS} an den Tisch.`);
      }
      if (action.settings.duel === true && state.players.length > 2) return fail('Ein Duell spielt man zu zweit.');
      const next = { ...getSettings(state), ...action.settings };
      if (next.duel && (next.teams || next.doubleDeck)) return fail('Das Duell geht nicht zusammen mit Teams oder Doppeldeck.');
      state.settings = { ...getSettings(state), ...action.settings };
      return done();
    }

    case 'addBot': {
      if (state.mode === 'public') return fail('Bots kommen in der offenen Lobby automatisch dazu.');
      if (!isHost) return fail('Nur der Host kann Bots holen.');
      if (state.status !== 'lobby') return fail('Bots gehen nur in der Lobby.');
      if (state.players.length >= maxPlayers(state)) return fail(full());
      const id = `bot-${rand(2 ** 30).toString(36)}${rand(2 ** 30).toString(36)}`;
      if (action.persona !== undefined) {
        const persona = typeof action.persona === 'string' && Object.hasOwn(PERSONA_BY_ID, action.persona) ? PERSONA_BY_ID[action.persona] : null;
        if (!persona) return fail('Diesen Bot gibt es nicht.');
        if (state.players.some((p) => p.bot?.persona === persona.id)) return fail(`${persona.name} sitzt schon am Tisch.`);
        state.players.push({ id, left: false, deckId: null, bot: { name: persona.name, emoji: persona.emoji, level: 'sly', persona: persona.id } });
        return done();
      }
      if (!(BOT_LEVELS as readonly string[]).includes(action.level ?? '')) return fail('Unbekannte Bot-Stufe.');
      const identity = nextBotIdentity(state);
      state.players.push({ id, left: false, deckId: null, bot: { ...identity, level: action.level as BotLevel } });
      return done();
    }

    case 'removePlayer': {
      // Nobody owns the open lobby: the random host must not be able to throw strangers out (and cost them Elo).
      if (state.mode === 'public') return fail('In der offenen Lobby kann niemand entfernt werden.');
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
      // Kicked players are rated by their points at this moment: no leaver penalty from a hostile host,
      // and no escape from a lost game by having a friend kick you.
      if (!target.bot) state.kicked = [...state.kicked, target.id];
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

    case 'mercy': {
      if (state.phase !== 'court') return fail('Gnade gibt es nur vor den Steuern.');
      if (!getSettings(state).mercy) return fail('Das Gnadenrecht ist in diesem Spiel aus.');
      if (presentOrder(state).at(-1) !== actor) return fail('Nur der Große Knecht kann um Gnade bitten.');
      if (state.mercyUsed.includes(actor)) return fail('Du hast dein Gnadenrecht schon genutzt.');
      if (state.mercyRound || state.revolution) return fail('Diese Runde zahlt ohnehin niemand die große Steuer.');
      state.moveSeq += 1;
      grantMercy(state, actor);
      state.ready = [...new Set([...state.ready, actor])];
      maybeFinishCourt(state, rand, now);
      return done();
    }

    case 'abdicate': {
      if (state.phase !== 'court') return fail('Abdanken geht nur vor den Steuern.');
      if (!getSettings(state).abdicate) return fail('Abdanken ist in diesem Spiel aus.');
      const present = presentOrder(state);
      if (present[0] !== actor) return fail('Nur der Große Jakob kann abdanken.');
      if (present.length < 3) return fail('Zum Abdanken braucht es mindestens einen Bürger.');
      if (state.abdicated || state.revolution) return fail('Diese Runde geht das nicht mehr.');
      const citizen = present[Math.floor((present.length - 1) / 2)];
      const order = [...state.order];
      const a = order.indexOf(actor);
      const b = order.indexOf(citizen);
      [order[a], order[b]] = [order[b], order[a]];
      state.order = order;
      state.abdicated = true;
      state.moveSeq += 1;
      log(state, 'abdicate', { by: actor, to: citizen });
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
      maybeFinishTax(state, rand, now);
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
      if (!me || me.left || me.bot) return fail('Du bist nicht in diesem Spiel.');
      if (state.status !== 'playing') return fail('Das Spiel läuft nicht.');
      if (!canSkip(state, now)) return fail(`Überspringen geht erst nach ${SKIP_AFTER_SECONDS} Sekunden Wartezeit.`);
      resolveWaiting(state, rand, now);
      return done();
    }

    case 'takeover': {
      if (!me || me.left || me.bot) return fail('Du bist nicht in diesem Spiel.');
      if (state.status !== 'playing') return fail('Das Spiel läuft nicht.');
      const target = player(state, action.playerId);
      if (!target || target.left || target.bot || target.autopilot) return fail('Diesen Spieler kann kein Bot übernehmen.');
      if (target.id === actor) return fail('Du kannst dich nicht selbst vertreten lassen.');
      if (!waitingOn(publicState(state)).includes(target.id)) return fail('Auf diesen Spieler wird gerade nicht gewartet.');
      if (!canSkip(state, now)) return fail(`Ein Bot übernimmt erst nach ${SKIP_AFTER_SECONDS} Sekunden Wartezeit.`);
      target.autopilot = true;
      state.moveSeq += 1;
      log(state, 'autopilot', { by: target.id });
      actFor(state, target.id, rand, now);
      return done();
    }

    case 'resume': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (!me.autopilot) return { ok: true, state: input };
      me.autopilot = false;
      log(state, 'resume', { by: actor });
      return done();
    }

    case 'botMove': {
      if (!me || me.left) return fail('Du bist nicht in diesem Spiel.');
      if (state.phase !== 'play' || !state.turn) return fail('Kein Bot ist dran.');
      if (!isAutomated(player(state, state.turn))) return fail('Kein Bot ist dran.');
      automatedPlay(state, state.turn, rand, now);
      return done();
    }
  }
}

/** Which bot or autopiloted player (if any) the clients should nudge the server for. */
export function botToMove(state: Pick<PublicState, 'phase' | 'turn' | 'players' | 'status'>): string | null {
  if (state.status !== 'playing' || state.phase !== 'play' || !state.turn) return null;
  return isAutomated(state.players.find((p) => p.id === state.turn)) ? state.turn : null;
}

/** True once the current wait has lasted long enough for anyone to skip it. */
export function canSkip(state: Pick<PublicState, 'status' | 'waitSince'>, now: number): boolean {
  if (state.status !== 'playing' || !state.waitSince) return false;
  return now >= Date.parse(state.waitSince) + SKIP_AFTER_SECONDS * 1000;
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

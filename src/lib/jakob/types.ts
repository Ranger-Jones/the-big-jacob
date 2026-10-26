export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
/** With "Doppeldeck" (two 80-card decks) up to 12 players fit at the table. */
export const MAX_PLAYERS_DOUBLE = 12;

export type Phase = 'draw' | 'court' | 'tax' | 'play' | 'roundEnd';
export type Status = 'lobby' | 'playing' | 'finished';

export const ROUND_OPTIONS = [3, 5, 7, 10] as const;
export type RoundCount = (typeof ROUND_OPTIONS)[number];

/** "Punkteziel": play until someone reaches this many points (overrides the round count). */
export const GOAL_OPTIONS = [null, 20, 30, 50] as const;
export type PointGoal = (typeof GOAL_OPTIONS)[number];

export const TURN_OPTIONS = [null, 15, 30, 45, 60] as const;
export type TurnSeconds = (typeof TURN_OPTIONS)[number];

export const TAX_OPTIONS = ['none', 'normal', 'high'] as const;
export type TaxLevel = (typeof TAX_OPTIONS)[number];

export const BOT_LEVELS = ['easy', 'sly'] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export const COURT_EVENTS = [
  'holiday', 'taxHike', 'reversed', 'doublePoints', 'jesterFreedom', 'pest', 'audit', 'coronation', 'charity',
] as const;
export type CourtEvent = (typeof COURT_EVENTS)[number];

export const MISSIONS = [
  'twelveTrick', 'bigPlay', 'loneJester', 'crownTwice', 'neverServant', 'fiveTricks', 'revolutionary', 'climber',
] as const;
export type MissionId = (typeof MISSIONS)[number];
export const MISSION_POINTS = 3;

export interface Settings {
  rounds: RoundCount;
  goal: PointGoal;
  turnSeconds: TurnSeconds;
  tax: TaxLevel;
  revolution: boolean;
  /** Jesters count as the best cards when paying taxes. */
  jestersTaxable: boolean;
  chat: boolean;
  /** "Schnapp!": the same rank may be played; the next player is skipped. */
  snap: boolean;
  /** Four or more identical naturals beat any trick and win it immediately. */
  bomb: boolean;
  /** "Königssturz": a Great Jakob who does not finish first drops to last place. */
  kingFall: boolean;
  /** "Narrenverbot": going out with a jester puts you last. */
  jesterBan: boolean;
  /** "Hofgeflüster": a random court event every round. */
  events: boolean;
  /** "Kartengedächtnis": show which cards were played this round. */
  tracker: boolean;
  /** Secret missions worth bonus points. */
  missions: boolean;
  /** "Thronfolge": three crowns in a row win the game at once. */
  throne: boolean;
  /** "Adel gegen Volk": two teams, points are summed per team. */
  teams: boolean;
  /** "Gnadenrecht": once per game the Great Servant may refuse to pay taxes. */
  mercy: boolean;
  /** "Abdankung": the Great Jakob may step down and swap places with a citizen. */
  abdicate: boolean;
  /** "Narrenfluch": jesters left in hand at the end of a round cost a point each. */
  jesterCurse: boolean;
  /** "Hoftausch": after taxes the citizens pass one random card to the next citizen. */
  courtSwap: boolean;
  /** "Blitzrunde": the turn time shrinks by 5 s every round (minimum 10 s). */
  blitz: boolean;
  /** "Doppeldeck": two 80-card decks for up to 12 players. */
  doubleDeck: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  rounds: 5,
  goal: null,
  turnSeconds: null,
  tax: 'normal',
  revolution: true,
  jestersTaxable: false,
  chat: true,
  snap: false,
  bomb: false,
  kingFall: false,
  jesterBan: false,
  events: false,
  tracker: true,
  missions: false,
  throne: false,
  teams: false,
  mercy: false,
  abdicate: false,
  jesterCurse: false,
  courtSwap: false,
  blitz: false,
  doubleDeck: false,
};

export interface BotInfo { name: string; emoji: string; level: BotLevel }

export interface Player {
  id: string;
  left: boolean;
  /** Deck chosen by the player (uuid of a custom deck or "preset:<id>"); null = default. */
  deckId: string | null;
  bot?: BotInfo;
  /** "Bot übernimmt": a human who dropped out is played by a bot until they return. */
  autopilot?: boolean;
}

export interface Trick {
  cards: number[];
  rank: number;
  count: number;
  by: string;
  /** moveSeq at which the trick was laid; used as animation key. */
  seq: number;
}

export type LogKind =
  | 'play' | 'pass' | 'clear' | 'out' | 'revolution' | 'grandRevolution' | 'tax'
  | 'bomb' | 'snap' | 'timeout' | 'event' | 'left' | 'jesterOut' | 'kingFall' | 'unbeatable'
  | 'mission' | 'mercy' | 'abdicate' | 'jesterCurse' | 'courtSwap' | 'pest' | 'audit' | 'charity'
  | 'autopilot' | 'resume' | 'throne';

export interface LogEntry {
  seq: number;
  kind: LogKind;
  by?: string;
  to?: string;
  cards?: number[];
  count?: number;
  mission?: MissionId;
}

export interface TaxPair {
  /** Servant who pays their best cards. */
  from: string;
  /** Jakob who receives them and returns cards of his choice. */
  to: string;
  count: number;
  done: boolean;
}

export interface RoundResult {
  round: number;
  /** Rank order at the start of the round. */
  start: string[];
  /** Finishing order (players who left are not included). */
  finish: string[];
  points: Record<string, number>;
  event: CourtEvent | null;
  revolution: 'none' | 'revolution' | 'grand';
}

export interface PlayerStats {
  crowns: number;
  servant: number;
  revolutions: number;
  grandRevolutions: number;
  bombs: number;
  rises: number;
  cardsPlayed: number;
  tricks: number;
  missions: number;
  /** Cards played per rank (index 0 = rank 1 … index 12 = jester). */
  byRank: number[];
}

export const EMPTY_STATS: PlayerStats = {
  crowns: 0, servant: 0, revolutions: 0, grandRevolutions: 0, bombs: 0, rises: 0, cardsPlayed: 0,
  tricks: 0, missions: 0, byRank: Array(13).fill(0),
};

export interface Mission { id: MissionId; done: boolean }

/** Replay data: p = play, x = pass, c = trick cleared (by = who leads next). */
export type ReplayMove = { k: 'p'; by: string; c: number[] } | { k: 'x'; by: string } | { k: 'c'; by: string | null };
export interface ReplayRound {
  round: number;
  order: string[];
  /** Hands at the moment play starts (after taxes and swaps). */
  hands: Record<string, number[]>;
  event: CourtEvent | null;
  moves: ReplayMove[];
}

export type GameMode = 'normal' | 'campaign' | 'daily';

/** Everything every member of the game may see. */
export interface PublicState {
  status: Status;
  hostId: string;
  players: Player[];
  banned: string[];
  settings: Settings;
  round: number;
  phase: Phase | null;
  /** Rank order of the current round, index 0 = Great Jakob. Also the turn order. */
  order: string[];
  handCounts: Record<string, number>;
  /** Draw phase: card each player drew for the first seating. */
  draws: Record<string, number>;
  drawOrder: string[];
  /** Court / round end: players who confirmed. */
  ready: string[];
  revolution: { by: string; grand: boolean } | null;
  event: CourtEvent | null;
  tax: TaxPair[];
  turn: string | null;
  trick: Trick | null;
  /** Players who passed on the current trick – they sit it out until the next trick. */
  passed: string[];
  finished: string[];
  /** Players who went out with a jester while "Narrenverbot" is active. */
  shamed: string[];
  points: Record<string, number>;
  played: number[];
  moveSeq: number;
  deadline: string | null;
  /** When the current wait (turn or phase) began. */
  waitSince: string | null;
  log: LogEntry[];
  history: RoundResult[];
  stats: Record<string, PlayerStats>;
  /** Team mode: 0 = Adel, 1 = Volk. */
  teams: Record<string, 0 | 1> | null;
  /** Players who already used their "Gnadenrecht". */
  mercyUsed: string[];
  /** This round's servant asked for mercy: no great tax. */
  mercyRound: boolean;
  abdicated: boolean;
  /** Consecutive crowns of the current Great Jakob ("Thronfolge"). */
  crownStreak: { id: string; count: number } | null;
  throneWinner: string | null;
  /** "Steuerprüfung": one card of the Great Jakob shown to everyone. */
  audit: { by: string; card: number } | null;
  /** Missions become public once the game is over. */
  missionsRevealed: Record<string, Mission> | null;
  /** Solo modes: campaign level ("1".."8") or daily challenge date. */
  mode: GameMode;
  modeRef: string | null;
  /** Full replay, revealed when the game is over. */
  replay: ReplayRound[] | null;
}

export interface PrivateNotes { received: number[]; gave: number[]; swapGave?: number[]; swapGot?: number[] }

/** Full server-side state: public part plus everyone's hands. */
export interface GameState extends Omit<PublicState, 'handCounts'> {
  hands: Record<string, number[]>;
  notes: Record<string, PrivateNotes>;
  /** Secret missions (only the owner sees theirs until the game ends). */
  missions: Record<string, Mission>;
  /** Fixed seed for reproducible deals (daily challenge); null = random. */
  seed: number | null;
  /** Replay being recorded (secret until the end). */
  replayLog: ReplayRound[];
}

/** What one player privately sees in addition to the public state. */
export interface PrivateHand {
  cards: number[];
  received: number[];
  gave: number[];
  swapGave?: number[];
  swapGot?: number[];
  mission?: Mission | null;
}

export type GameAction =
  | { type: 'join' }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'addBot'; level: BotLevel }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'setDeck'; deckId: string | null }
  | { type: 'draw' }
  | { type: 'ready' }
  | { type: 'revolution' }
  | { type: 'mercy' }
  | { type: 'abdicate' }
  | { type: 'taxReturn'; cards: number[] }
  | { type: 'play'; cards: number[] }
  | { type: 'pass' }
  | { type: 'timeout' }
  | { type: 'skip' }
  | { type: 'takeover'; playerId: string }
  | { type: 'resume' }
  | { type: 'botMove' };

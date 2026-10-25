export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export type Phase = 'draw' | 'court' | 'tax' | 'play' | 'roundEnd';
export type Status = 'lobby' | 'playing' | 'finished';

export const ROUND_OPTIONS = [3, 5, 7, 10] as const;
export type RoundCount = (typeof ROUND_OPTIONS)[number];

export const TURN_OPTIONS = [null, 15, 30, 45, 60] as const;
export type TurnSeconds = (typeof TURN_OPTIONS)[number];

export const TAX_OPTIONS = ['none', 'normal', 'high'] as const;
export type TaxLevel = (typeof TAX_OPTIONS)[number];

export const BOT_LEVELS = ['easy', 'sly'] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export const COURT_EVENTS = ['holiday', 'taxHike', 'reversed', 'doublePoints', 'jesterFreedom'] as const;
export type CourtEvent = (typeof COURT_EVENTS)[number];

export interface Settings {
  rounds: RoundCount;
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
}

export const DEFAULT_SETTINGS: Settings = {
  rounds: 5,
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
};

export interface BotInfo { name: string; emoji: string; level: BotLevel }

export interface Player {
  id: string;
  left: boolean;
  /** Deck chosen by the player (uuid of a custom deck or "preset:<id>"); null = default. */
  deckId: string | null;
  bot?: BotInfo;
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
  | 'bomb' | 'snap' | 'timeout' | 'event' | 'left' | 'jesterOut' | 'kingFall';

export interface LogEntry { seq: number; kind: LogKind; by?: string; to?: string; cards?: number[]; count?: number }

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
}

export const EMPTY_STATS: PlayerStats = {
  crowns: 0, servant: 0, revolutions: 0, grandRevolutions: 0, bombs: 0, rises: 0, cardsPlayed: 0,
};

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
  /** Players who passed since the last card was laid on the current trick. */
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
}

export interface PrivateNotes { received: number[]; gave: number[] }

/** Full server-side state: public part plus everyone's hands. */
export interface GameState extends Omit<PublicState, 'handCounts'> {
  hands: Record<string, number[]>;
  notes: Record<string, PrivateNotes>;
}

/** What one player privately sees in addition to the public state. */
export interface PrivateHand { cards: number[]; received: number[]; gave: number[] }

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
  | { type: 'taxReturn'; cards: number[] }
  | { type: 'play'; cards: number[] }
  | { type: 'pass' }
  | { type: 'timeout' }
  | { type: 'skip' }
  | { type: 'botMove' };

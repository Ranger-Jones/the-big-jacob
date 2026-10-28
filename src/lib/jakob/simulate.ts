import { chooseBotPlay, chooseBotTaxReturn } from './bots';
import { chooseBrainPlay, chooseBrainTaxReturn } from './brain';
import { seededRand, type RandInt } from './cards';
import { applyAction, createGameState, placements, tableView, type GameState } from './engine';
import { PERSONA_BY_ID } from './personas';
import type { RuleContext } from './rules';
import type { BotLevel, Settings } from './types';

/**
 * Plays whole games without a server, for tests and the bot calibration. The host seat stands in for a
 * human (so the engine keeps the game going) but is steered by a bot brain like everyone else.
 */

export const SIM_HOST = 'host';

/** A plain bot level or a persona id. */
export type Seat = BotLevel | string;

const isLevel = (seat: Seat): seat is BotLevel => seat === 'easy' || seat === 'sly';

function ctxOf(state: GameState): RuleContext {
  return { settings: state.settings, event: state.event, decks: state.settings.doubleDeck ? 2 : 1 };
}

function hostPlay(state: GameState, seat: Seat, rand: RandInt): number[] | null {
  const hand = state.hands[SIM_HOST];
  const opponents = state.players
    .filter((p) => p.id !== SIM_HOST && !p.left && !state.finished.includes(p.id) && !state.shamed.includes(p.id))
    .map((p) => state.hands[p.id].length);
  if (isLevel(seat)) {
    return chooseBotPlay(hand, state.trick, ctxOf(state), seat, rand, { handCounts: opponents, jesterBan: state.settings.jesterBan });
  }
  return chooseBrainPlay(hand, state.trick, ctxOf(state), PERSONA_BY_ID[seat].style, rand, {
    played: state.played, decks: state.settings.doubleDeck ? 2 : 1, opponents,
    duelDraw: state.settings.duel && state.reserve.length > 0, jesterBan: state.settings.jesterBan,
    table: tableView(state, SIM_HOST),
  });
}

function hostTaxReturn(state: GameState, seat: Seat, count: number): number[] {
  const hand = state.hands[SIM_HOST];
  return isLevel(seat)
    ? chooseBotTaxReturn(hand, count, ctxOf(state))
    : chooseBrainTaxReturn(hand, count, ctxOf(state), PERSONA_BY_ID[seat].style, state.played, state.settings.doubleDeck ? 2 : 1);
}

export interface SimResult {
  state: GameState;
  /** Place per seat index (seat 0 = host). */
  places: number[];
  actions: number;
}

/** Runs a full game from the lobby to the end. Throws if the engine rejects a move or the game hangs. */
export function simulateGame(seats: Seat[], settings: Partial<Settings>, seed: number, onStep?: (state: GameState) => void): SimResult {
  const rand = seededRand(seed);
  let state = createGameState(SIM_HOST, { ...createGameState(SIM_HOST).settings, ...settings });
  const act = (action: Parameters<typeof applyAction>[2], actor = SIM_HOST) => {
    const res = applyAction(state, actor, action, rand, 0);
    if (!res.ok) throw new Error(`${action.type}: ${res.error}`);
    state = res.state;
    onStep?.(state);
  };
  for (const seat of seats.slice(1)) act(isLevel(seat) ? { type: 'addBot', level: seat } : { type: 'addBot', persona: seat });
  act({ type: 'start' });

  let actions = 0;
  for (; state.status === 'playing'; actions++) {
    if (actions > 20000) throw new Error('game does not end');
    switch (state.phase) {
      case 'draw': act({ type: 'draw' }); break;
      case 'court':
      case 'roundEnd': act({ type: 'ready' }); break;
      case 'tax': {
        const pair = state.tax.find((t) => t.to === SIM_HOST && !t.done);
        if (!pair) throw new Error('tax phase waits for nobody');
        act({ type: 'taxReturn', cards: hostTaxReturn(state, seats[0], pair.count) });
        break;
      }
      case 'play': {
        if (state.turn !== SIM_HOST) {
          act({ type: 'botMove' });
          break;
        }
        const cards = hostPlay(state, seats[0], rand);
        act(cards ? { type: 'play', cards } : { type: 'pass' });
        break;
      }
      default: throw new Error(`unexpected phase ${state.phase}`);
    }
  }
  const byId = placements(state);
  return { state, places: state.players.map((p) => byId[p.id]), actions };
}

/** Tables nobody touches any more are closed automatically. */
export const LOBBY_IDLE_HOURS = 3;
export const GAME_IDLE_HOURS = 12;

export interface ActivityInfo {
  status: string;
  createdAt: string;
  startedAt: string | null;
  /** When the current turn or phase began (public state `waitSince`). */
  waitSince: string | null;
}

const HOUR = 60 * 60 * 1000;

/** Last moment we know something happened at the table. */
export function lastActivity(g: ActivityInfo): number {
  return Math.max(...[g.createdAt, g.startedAt, g.waitSince].filter((t): t is string => !!t).map((t) => Date.parse(t)).filter(Number.isFinite));
}

/** A lobby nobody started within 3 hours, or a running game where nobody moved for 12 hours. */
export function isStale(g: ActivityInfo, now: number): boolean {
  if (g.status === 'lobby') return now - lastActivity(g) > LOBBY_IDLE_HOURS * HOUR;
  if (g.status === 'playing') return now - lastActivity(g) > GAME_IDLE_HOURS * HOUR;
  return false;
}

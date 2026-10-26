/**
 * Elo rating for multi-player games, experience points and levels.
 *
 * Elo: every player is compared pairwise with every other participant (bots included, at a fixed
 * rating). Finishing ahead of someone counts as a win, behind as a loss, the same place as a draw.
 * The sum of those pairwise results is scaled by K / (n − 1), so a 6-player game moves a rating about
 * as much as a single duel would.
 */

export const START_RATING = 1000;
export const MIN_RATING = 100;

/** Fixed strength of the bots, so games filled up with bots still count. */
export const BOT_RATING = { easy: 850, sly: 1150 } as const;

export interface RatedParticipant {
  id: string;
  rating: number;
  /** 1 = best. Players who left are placed after everyone else. */
  place: number;
  /** Bots and players who left are not booked, but still count as opponents. */
  human: boolean;
  /** Rated games so far – new players move faster. */
  games: number;
}

export function kFactor(games: number): number {
  if (games < 10) return 40;
  if (games < 30) return 28;
  return 20;
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** Rating change for every human participant (rounded). */
export function eloDeltas(participants: readonly RatedParticipant[]): Record<string, number> {
  const n = participants.length;
  const deltas: Record<string, number> = {};
  if (n < 2) return deltas;
  for (const p of participants) {
    if (!p.human) continue;
    let sum = 0;
    for (const o of participants) {
      if (o.id === p.id) continue;
      const actual = p.place < o.place ? 1 : p.place > o.place ? 0 : 0.5;
      sum += actual - expectedScore(p.rating, o.rating);
    }
    deltas[p.id] = Math.round((kFactor(p.games) / (n - 1)) * sum);
  }
  return deltas;
}

/** Experience for one finished game. */
export function experienceFor(input: {
  place: number;
  players: number;
  left: boolean;
  crowns: number;
  missions: number;
  revolutions: number;
  /** Games against other people give a bonus. */
  vsHumans: boolean;
}): number {
  if (input.left) return 0;
  const beaten = Math.max(0, input.players - input.place);
  let xp = 30 + beaten * 12 + input.crowns * 5 + input.missions * 15 + input.revolutions * 10;
  if (input.place === 1) xp += 25;
  if (input.vsHumans) xp = Math.round(xp * 1.5);
  return xp;
}

/** Total experience needed to reach a level: 0, 100, 300, 600, 1000, … (grows by 100 each level). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  // Inverse of 50·L·(L−1) ≤ xp.
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * Math.max(0, xp)) / 50)) / 2));
}

export interface LevelProgress { level: number; current: number; needed: number; fraction: number }

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = xp - base;
  const needed = next - base;
  return { level, current, needed, fraction: needed > 0 ? current / needed : 0 };
}

/** Courtly title that goes with a level (every 5 levels). */
export function levelTitle(level: number): string {
  const titles = ['Stallbursche', 'Knappe', 'Hofschreiber', 'Ritter', 'Burgvogt', 'Baron', 'Graf', 'Herzog', 'Kurfürst', 'Großer Jakob'];
  return titles[Math.min(titles.length - 1, Math.floor((level - 1) / 5))];
}

export interface RatingTier { name: string; emoji: string; min: number; color: string }

/** Elo tiers from the bottom to the top. */
export const TIERS: RatingTier[] = [
  { name: 'Knecht', emoji: '🧹', min: 0, color: '#8a7a6a' },
  { name: 'Bürger', emoji: '🧺', min: 900, color: '#a8662a' },
  { name: 'Ritter', emoji: '🛡️', min: 1100, color: '#9aa3ad' },
  { name: 'Baron', emoji: '💎', min: 1250, color: '#3a6fd8' },
  { name: 'Graf', emoji: '🎖️', min: 1400, color: '#8b4fc7' },
  { name: 'Herzog', emoji: '⚜️', min: 1550, color: '#e09b1a' },
  { name: 'Großer Jakob', emoji: '👑', min: 1700, color: '#f4b73a' },
];

export function tierFor(rating: number): RatingTier {
  return [...TIERS].reverse().find((t) => rating >= t.min) ?? TIERS[0];
}

/** New players show a provisional rating until they finished a few rated games. */
export const PROVISIONAL_GAMES = 5;

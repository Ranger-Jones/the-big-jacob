/** Heraldic tinctures for seats, readable on parchment and on the velvet table. */
export const PLAYER_COLORS = ['#c8323c', '#3a6fd8', '#2f9e62', '#e09b1a', '#8b4fc7', '#e46aa0', '#1f9bb0', '#a8662a'];

export function seatColor(seat: number): string {
  return PLAYER_COLORS[((seat % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

/** Stable colour for people outside a game (friends, leaderboard). */
export function nameColor(name: string): string {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return seatColor(h);
}

/** Unlockable table felts and avatar frames. Requirements are checked against the player's stats. */
export interface CosmeticStats {
  games_played: number;
  wins: number;
  crowns: number;
  revolutions: number;
  grand_revolutions: number;
  missions?: number;
}

export interface Felt { id: string; name: string; hint: string; colors: [string, string, string]; unlocked: (s: CosmeticStats) => boolean }

export const FELTS: Felt[] = [
  { id: 'wein', name: 'Weinrot', hint: 'Von Anfang an', colors: ['#8e2a3d', '#6b1e2e', '#3d0e19'], unlocked: () => true },
  { id: 'smaragd', name: 'Smaragd', hint: 'Gewinne 1 Spiel', colors: ['#2f8a5c', '#1e6b45', '#0e3a24'], unlocked: (s) => s.wins >= 1 },
  { id: 'saphir', name: 'Saphir', hint: 'Gewinne 5 Spiele', colors: ['#3a6fd8', '#22468f', '#101f4a'], unlocked: (s) => s.wins >= 5 },
  { id: 'nacht', name: 'Mitternacht', hint: 'Rufe eine Revolution aus', colors: ['#3b2a5e', '#231740', '#0d0820'], unlocked: (s) => s.revolutions + s.grand_revolutions >= 1 },
  { id: 'gold', name: 'Blattgold', hint: '10 Runden als Großer Jakob', colors: ['#d9a32e', '#a8741a', '#5c3c08'], unlocked: (s) => s.crowns >= 10 },
  { id: 'koenig', name: 'Königspurpur', hint: 'Gewinne 25 Spiele', colors: ['#9b3fc7', '#6c2a8e', '#2e0f42'], unlocked: (s) => s.wins >= 25 },
];

export interface Frame { id: string; name: string; hint: string; unlocked: (s: CosmeticStats) => boolean }

export const FRAMES: Frame[] = [
  { id: 'none', name: 'Ohne Rahmen', hint: 'Von Anfang an', unlocked: () => true },
  { id: 'silber', name: 'Silberring', hint: 'Spiele 5 Spiele', unlocked: (s) => s.games_played >= 5 },
  { id: 'gold', name: 'Goldring', hint: 'Gewinne 10 Spiele', unlocked: (s) => s.wins >= 10 },
  { id: 'krone', name: 'Krone', hint: '10 Runden als Großer Jakob', unlocked: (s) => s.crowns >= 10 },
  { id: 'flamme', name: 'Flammen', hint: 'Rufe eine Große Revolution aus', unlocked: (s) => s.grand_revolutions >= 1 },
  { id: 'lorbeer', name: 'Lorbeer', hint: 'Gewinne 25 Spiele', unlocked: (s) => s.wins >= 25 },
];

export function feltById(id: string | null | undefined): Felt {
  return FELTS.find((f) => f.id === id) ?? FELTS[0];
}

export function isFrameId(id: string | null | undefined): boolean {
  return !!id && FRAMES.some((f) => f.id === id);
}

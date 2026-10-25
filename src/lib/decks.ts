import { z } from 'zod';

export const DECK_FONTS = ['gotisch', 'klassisch', 'verspielt'] as const;
export type DeckFont = (typeof DECK_FONTS)[number];

export const BACK_PATTERNS = ['rauten', 'streifen', 'punkte', 'wellen', 'sterne', 'schach'] as const;
export type BackPattern = (typeof BACK_PATTERNS)[number];

export const FONT_LABELS: Record<DeckFont, string> = { gotisch: 'Gotisch', klassisch: 'Klassisch', verspielt: 'Verspielt' };
export const PATTERN_LABELS: Record<BackPattern, string> = {
  rauten: 'Rauten', streifen: 'Streifen', punkte: 'Punkte', wellen: 'Wellen', sterne: 'Sterne', schach: 'Schach',
};

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** A short symbol: one emoji or up to three characters. */
const symbol = z.string().trim().min(1).max(8);

export const cardDesignSchema = z.object({
  name: z.string().trim().min(1).max(24),
  emoji: symbol,
  image: z.string().url().max(500).nullable(),
});

export const deckDesignSchema = z.object({
  v: z.literal(1),
  frame: hex,
  accent: hex,
  paper: hex,
  ink: hex,
  font: z.enum(DECK_FONTS),
  back: z.object({ pattern: z.enum(BACK_PATTERNS), a: hex, b: hex, emblem: symbol }),
  /** Index 0 = rank 1 … index 12 = jester. */
  cards: z.array(cardDesignSchema).length(13),
});

export type CardDesign = z.infer<typeof cardDesignSchema>;
export type DeckDesign = z.infer<typeof deckDesignSchema>;

export interface DeckEntry { id: string; name: string; ownerId: string | null; design: DeckDesign }

const cards = (list: [string, string][]): CardDesign[] => list.map(([name, emoji]) => ({ name, emoji, image: null }));

export const PRESETS: DeckEntry[] = [
  {
    id: 'preset:hofstaat',
    name: 'Hofstaat',
    ownerId: null,
    design: {
      v: 1, frame: '#6b1e2e', accent: '#b07a12', paper: '#fbf0d9', ink: '#2b1a12', font: 'gotisch',
      back: { pattern: 'rauten', a: '#6b1e2e', b: '#8e2f40', emblem: '👑' },
      cards: cards([
        ['Der Große Jakob', '👑'], ['Erzbischof', '⛪'], ['Hofmarschall', '🎖️'], ['Baronin', '💎'],
        ['Äbtissin', '📿'], ['Ritter', '🛡️'], ['Näherin', '🧵'], ['Maurer', '🧱'], ['Köchin', '🍲'],
        ['Schäferin', '🐑'], ['Steinmetz', '⛏️'], ['Bauer', '🌾'], ['Narr', '🃏'],
      ]),
    },
  },
  {
    id: 'preset:rettungswache',
    name: 'Rettungswache',
    ownerId: null,
    design: {
      v: 1, frame: '#c8323c', accent: '#1f4fb4', paper: '#fdfdf7', ink: '#1d2433', font: 'klassisch',
      back: { pattern: 'streifen', a: '#c8323c', b: '#f2f2ea', emblem: '🚑' },
      cards: cards([
        ['Peschel', '🦸'], ['Leitender Notarzt', '🩺'], ['Notärztin', '👩‍⚕️'], ['Wachleiter', '📋'],
        ['Praxisanleiterin', '🎓'], ['Notfallsanitäter', '🚑'], ['Rettungssanitäterin', '💉'], ['Rettungshelfer', '🩹'],
        ['Disponentin', '📞'], ['Desinfektor', '🧴'], ['Azubi', '📚'], ['Praktikant', '☕'], ['Blaulicht', '🚨'],
      ]),
    },
  },
  {
    id: 'preset:tierreich',
    name: 'Tierreich',
    ownerId: null,
    design: {
      v: 1, frame: '#2f7a4f', accent: '#c98a1b', paper: '#f4f1df', ink: '#22301f', font: 'verspielt',
      back: { pattern: 'punkte', a: '#2f7a4f', b: '#4e9a6a', emblem: '🦁' },
      cards: cards([
        ['Löwe', '🦁'], ['Adler', '🦅'], ['Bär', '🐻'], ['Wolf', '🐺'], ['Fuchs', '🦊'], ['Hirsch', '🦌'],
        ['Eule', '🦉'], ['Biber', '🦫'], ['Igel', '🦔'], ['Schaf', '🐑'], ['Maus', '🐭'], ['Schnecke', '🐌'], ['Affe', '🐒'],
      ]),
    },
  },
  {
    id: 'preset:piraten',
    name: 'Piraten',
    ownerId: null,
    design: {
      v: 1, frame: '#1e2a3a', accent: '#d9a441', paper: '#efe2c4', ink: '#1b1712', font: 'verspielt',
      back: { pattern: 'wellen', a: '#1e2a3a', b: '#2f4560', emblem: '🏴‍☠️' },
      cards: cards([
        ['Kapitänin', '🏴‍☠️'], ['Steuermann', '☸️'], ['Quartiermeister', '🗺️'], ['Navigatorin', '🧭'],
        ['Kanonier', '💣'], ['Bootsmann', '⚓'], ['Schiffsärztin', '🩹'], ['Smutje', '🍖'], ['Ausguck', '🔭'],
        ['Matrosin', '🪢'], ['Schiffsjunge', '🧽'], ['Ratte', '🐀'], ['Papagei', '🦜'],
      ]),
    },
  },
];

export const DEFAULT_DECK = PRESETS[0];

export function isPresetId(id: string): boolean {
  return PRESETS.some((p) => p.id === id);
}

export function presetById(id: string | null | undefined): DeckEntry | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Resolves a deck id against presets and loaded custom decks; falls back to the classic deck. */
export function resolveDeck(id: string | null | undefined, custom: Record<string, DeckEntry>): DeckEntry {
  if (!id) return DEFAULT_DECK;
  return presetById(id) ?? custom[id] ?? DEFAULT_DECK;
}

export function cardDesign(deck: DeckEntry, rank: number): CardDesign {
  return deck.design.cards[Math.min(Math.max(rank, 1), 13) - 1];
}

export function parseDesign(value: unknown): DeckDesign | null {
  const res = deckDesignSchema.safeParse(value);
  return res.success ? res.data : null;
}

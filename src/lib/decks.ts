import { z } from 'zod';

export const DECK_FONTS = ['gotisch', 'klassisch', 'verspielt'] as const;
export type DeckFont = (typeof DECK_FONTS)[number];

export const BACK_PATTERNS = ['rauten', 'streifen', 'punkte', 'wellen', 'sterne', 'schach'] as const;
export type BackPattern = (typeof BACK_PATTERNS)[number];

export const PHOTO_FITS = ['medaillon', 'vollbild'] as const;
export type PhotoFit = (typeof PHOTO_FITS)[number];
export const PHOTO_FIT_LABELS: Record<PhotoFit, string> = { medaillon: 'Im Medaillon', vollbild: 'Ganze Karte' };

export const FONT_LABELS: Record<DeckFont, string> = { gotisch: 'Gotisch', klassisch: 'Klassisch', verspielt: 'Verspielt' };
export const PATTERN_LABELS: Record<BackPattern, string> = {
  rauten: 'Rauten', streifen: 'Streifen', punkte: 'Punkte', wellen: 'Wellen', sterne: 'Sterne', schach: 'Schach',
};

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** A short symbol: one emoji or up to three characters. */
const symbol = z.string().trim().min(1).max(8);

const artId = z.string().regex(/^[a-z0-9-]{1,32}$/);

// Free card layout (card editor) -----------------------------------------------------------------
// Positions are percentages of the card (x of the width, y of the height), sizes percentages of the width.

export const PICTURE_SHAPES = ['kreis', 'abgerundet', 'frei'] as const;
export const NUMBER_STYLES = ['ecken', 'gross', 'aus'] as const;
export const NAME_STYLES = ['band', 'schlicht', 'aus'] as const;
export const STICKER_KINDS = ['emoji', 'text'] as const;
export type PictureShape = (typeof PICTURE_SHAPES)[number];
export type NumberStyle = (typeof NUMBER_STYLES)[number];
export type NameStyle = (typeof NAME_STYLES)[number];

export const PICTURE_SHAPE_LABELS: Record<PictureShape, string> = { kreis: 'Kreis', abgerundet: 'Abgerundet', frei: 'Frei' };
export const NUMBER_STYLE_LABELS: Record<NumberStyle, string> = { ecken: 'In den Ecken', gross: 'Groß', aus: 'Aus' };
export const NAME_STYLE_LABELS: Record<NameStyle, string> = { band: 'Band', schlicht: 'Schlicht', aus: 'Aus' };

const coord = z.number().min(-60).max(160);
const angle = z.number().min(-180).max(180);

export const stickerSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,12}$/),
  kind: z.enum(STICKER_KINDS),
  value: z.string().trim().min(1).max(24),
  x: coord,
  y: coord,
  size: z.number().min(3).max(90),
  rotate: angle,
  color: hex,
});

export const cardLayoutSchema = z.object({
  /** Card background; null = the deck's paper colour. */
  background: hex.nullable(),
  /** Decorative inner frame with corner diamonds. */
  frame: z.boolean(),
  picture: z.object({
    visible: z.boolean(),
    /** Covers the whole card (x, y, size and shape are then ignored). */
    fill: z.boolean(),
    shape: z.enum(PICTURE_SHAPES),
    x: coord,
    y: coord,
    size: z.number().min(5).max(250),
    rotate: angle,
    /** Zoom and offset of the image inside its frame (crop). */
    zoom: z.number().min(1).max(5),
    panX: z.number().min(-100).max(100),
    panY: z.number().min(-100).max(100),
  }),
  number: z.object({
    style: z.enum(NUMBER_STYLES),
    x: coord,
    y: coord,
    size: z.number().min(4).max(90),
    /** null = the deck's number colour. */
    color: hex.nullable(),
  }),
  name: z.object({
    style: z.enum(NAME_STYLES),
    x: coord,
    y: coord,
    size: z.number().min(3).max(25),
    width: z.number().min(20).max(100),
  }),
  stickers: z.array(stickerSchema).max(12),
});

export type Sticker = z.output<typeof stickerSchema>;
export type CardLayout = z.output<typeof cardLayoutSchema>;

export const cardDesignSchema = z.object({
  name: z.string().trim().min(1).max(24),
  emoji: symbol,
  /** Built-in SVG illustration (see components/deck/art); shown instead of the emoji. */
  art: artId.nullable().default(null),
  image: z.string().url().max(500).nullable(),
  /** Free layout from the card editor; null/absent = the deck's standard layout. */
  layout: cardLayoutSchema.nullable().optional(),
});

export const deckDesignSchema = z.object({
  v: z.literal(1),
  frame: hex,
  accent: hex,
  paper: hex,
  ink: hex,
  font: z.enum(DECK_FONTS),
  /** How card photos sit on the front: in the round medallion or filling the whole card. */
  photoFit: z.enum(PHOTO_FITS).default('medaillon'),
  back: z.object({
    pattern: z.enum(BACK_PATTERNS), a: hex, b: hex, emblem: symbol,
    /** Built-in SVG illustration shown instead of the emblem. */
    art: artId.nullable().default(null),
    /** Optional photo covering the entire back (replaces pattern and emblem). */
    image: z.string().url().max(500).nullable().default(null),
    /** Crop of the back photo. */
    zoom: z.number().min(1).max(5).optional(),
    panX: z.number().min(-100).max(100).optional(),
    panY: z.number().min(-100).max(100).optional(),
  }),
  /** Index 0 = rank 1 … index 12 = jester. */
  cards: z.array(cardDesignSchema).length(13),
});

export type CardDesign = z.output<typeof cardDesignSchema>;
export type DeckDesign = z.output<typeof deckDesignSchema>;

export interface DeckEntry { id: string; name: string; ownerId: string | null; design: DeckDesign }

const cards = (list: [string, string][]): CardDesign[] => list.map(([name, emoji]) => ({ name, emoji, art: null, image: null }));
/** Cards drawn with built-in SVG art: [name, fallback emoji, art id]. */
const artCards = (list: [string, string, string][]): CardDesign[] =>
  list.map(([name, emoji, art]) => ({ name, emoji, art, image: null }));

export const PRESETS: DeckEntry[] = [
  {
    id: 'preset:hofstaat',
    name: 'Hofstaat',
    ownerId: null,
    design: {
      v: 1, frame: '#6b1e2e', accent: '#b07a12', paper: '#fbf0d9', ink: '#2b1a12', font: 'gotisch', photoFit: 'vollbild',
      back: { pattern: 'rauten', a: '#6b1e2e', b: '#8e2f40', emblem: '👑', art: 'p-wappen', image: null },
      cards: artCards([
        ['Der Große Jakob', '👑', 'p-jakob'], ['Erzbischof', '⛪', 'p-erzbischof'], ['Hofmarschall', '🎖️', 'p-marschall'],
        ['Baronin', '💎', 'p-baronin'], ['Äbtissin', '📿', 'p-aebtissin'], ['Ritter', '🛡️', 'p-ritter'],
        ['Näherin', '🧵', 'p-naeherin'], ['Maurer', '🧱', 'p-maurer'], ['Köchin', '🍲', 'p-koechin'],
        ['Schäferin', '🐑', 'p-schaeferin'], ['Steinmetz', '⛏️', 'p-steinmetz'], ['Bauer', '🌾', 'p-bauer'],
        ['Narr', '🃏', 'p-narr'],
      ]),
    },
  },
  {
    id: 'preset:rettungswache',
    name: 'Rettungswache',
    ownerId: null,
    design: {
      v: 1, frame: '#c8323c', accent: '#1f4fb4', paper: '#fdfdf7', ink: '#1d2433', font: 'klassisch', photoFit: 'vollbild',
      back: { pattern: 'streifen', a: '#c8323c', b: '#f2f2ea', emblem: '🚑', art: 'r-star', image: null },
      cards: artCards([
        ['Peschel', '🦸', 'r-peschel'], ['Leitender Notarzt', '🩺', 'r-lna'], ['Notärztin', '👩‍⚕️', 'r-notaerztin'],
        ['Wachleiter', '📋', 'r-wachleiter'], ['Praxisanleiterin', '🎓', 'r-praxisanleiterin'], ['Notfallsanitäter', '🚑', 'r-notsan'],
        ['Rettungssanitäterin', '💉', 'r-rettsan'], ['Rettungshelfer', '🩹', 'r-retthelfer'], ['Disponentin', '📞', 'r-disponentin'],
        ['Desinfektor', '🧴', 'r-desinfektor'], ['Azubi', '📚', 'r-azubi'], ['Praktikant', '☕', 'r-praktikant'],
        ['Blaulicht', '🚨', 'r-blaulicht'],
      ]),
    },
  },
  {
    id: 'preset:tierreich',
    name: 'Tierreich',
    ownerId: null,
    design: {
      v: 1, frame: '#2f7a4f', accent: '#c98a1b', paper: '#f4f1df', ink: '#22301f', font: 'verspielt', photoFit: 'medaillon',
      back: { pattern: 'punkte', a: '#2f7a4f', b: '#4e9a6a', emblem: '🦁', art: null, image: null },
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
      v: 1, frame: '#1e2a3a', accent: '#d9a441', paper: '#efe2c4', ink: '#1b1712', font: 'verspielt', photoFit: 'medaillon',
      back: { pattern: 'wellen', a: '#1e2a3a', b: '#2f4560', emblem: '🏴‍☠️', art: null, image: null },
      cards: cards([
        ['Kapitänin', '🏴‍☠️'], ['Steuermann', '☸️'], ['Quartiermeister', '🗺️'], ['Navigatorin', '🧭'],
        ['Kanonier', '💣'], ['Bootsmann', '⚓'], ['Schiffsärztin', '🩹'], ['Smutje', '🍖'], ['Ausguck', '🔭'],
        ['Matrosin', '🪢'], ['Schiffsjunge', '🧽'], ['Ratte', '🐀'], ['Papagei', '🦜'],
      ]),
    },
  },
  {
    id: 'preset:heraldik',
    name: 'Heraldik',
    ownerId: null,
    design: {
      v: 1, frame: '#2a2230', accent: '#b07a12', paper: '#f6efdc', ink: '#2a1a10', font: 'gotisch', photoFit: 'vollbild',
      back: { pattern: 'schach', a: '#2a2230', b: '#3b3146', emblem: '🛡️', art: 'h-crown', image: null },
      cards: artCards([
        ['Krone', '👑', 'h-crown'], ['Mitra', '⛪', 'h-mitre'], ['Schwerter', '⚔️', 'h-swords'], ['Rose', '🌹', 'h-rose'],
        ['Kelch', '🏆', 'h-chalice'], ['Kreuz', '✚', 'h-cross'], ['Stern', '⭐', 'h-star'], ['Turm', '🏰', 'h-tower'],
        ['Kessel', '🍲', 'h-cauldron'], ['Halbmond', '🌙', 'h-crescent'], ['Hammer', '🔨', 'h-hammer'], ['Rad', '☸️', 'h-wheel'],
        ['Narrenkappe', '🃏', 'h-jester'],
      ]),
    },
  },
  {
    id: 'preset:kosmos',
    name: 'Kosmos',
    ownerId: null,
    design: {
      v: 1, frame: '#17143a', accent: '#e8b33a', paper: '#eef0fb', ink: '#17143a', font: 'klassisch', photoFit: 'vollbild',
      back: { pattern: 'sterne', a: '#17143a', b: '#2f2a6b', emblem: '🪐', art: 'k-saturn', image: null },
      cards: artCards([
        ['Sonne', '☀️', 'k-sun'], ['Vollmond', '🌕', 'k-fullmoon'], ['Saturn', '🪐', 'k-saturn'], ['Komet', '☄️', 'k-comet'],
        ['Sternbild', '✨', 'k-constellation'], ['Mondsichel', '🌙', 'k-crescent'], ['Erde', '🌍', 'k-earth'],
        ['Polarstern', '⭐', 'k-northstar'], ['Galaxie', '🌌', 'k-galaxy'], ['Meteore', '🌠', 'k-meteors'],
        ['Asteroid', '🪨', 'k-asteroid'], ['Sternschnuppe', '🌠', 'k-shootingstar'], ['Ufo', '🛸', 'k-ufo'],
      ]),
    },
  },
  {
    id: 'preset:schatzkammer',
    name: 'Schatzkammer',
    ownerId: null,
    design: {
      v: 1, frame: '#5a3418', accent: '#b07a12', paper: '#fbf3e1', ink: '#2b1b10', font: 'klassisch', photoFit: 'vollbild',
      back: { pattern: 'rauten', a: '#5a3418', b: '#7a4a24', emblem: '💎', art: 'g-diamond', image: null },
      cards: artCards([
        ['Diamant', '💎', 'g-diamond'], ['Rubin', '❤️', 'g-ruby'], ['Saphir', '🔵', 'g-sapphire'], ['Smaragd', '💚', 'g-emerald'],
        ['Amethyst', '💜', 'g-amethyst'], ['Topas', '🧡', 'g-topaz'], ['Aquamarin', '🩵', 'g-aquamarine'], ['Granat', '🔺', 'g-garnet'],
        ['Peridot', '💚', 'g-peridot'], ['Citrin', '💛', 'g-citrine'], ['Opal', '🤍', 'g-opal'], ['Bergkristall', '🔷', 'g-quartz'],
        ['Kieselstein', '🪨', 'g-pebble'],
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

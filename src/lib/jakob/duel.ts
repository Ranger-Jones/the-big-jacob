import { DEFAULT_SETTINGS, DUEL_GOAL, type Settings } from './types';

/**
 * Ready-made rule sets for a duel against a bot: the duel rules (see Settings.duel) plus a few of
 * the table options that play especially well with two.
 */
export interface DuelVariant {
  id: string;
  name: string;
  description: string;
  settings: Partial<Settings>;
}

export const DUEL_VARIANTS: DuelVariant[] = [
  {
    id: 'klassisch', name: 'Klassisch',
    description: 'Je 15 Karten, wer passt, zieht nach. Bis 30 Punkte, Bomben erlaubt.',
    settings: { goal: DUEL_GOAL, bomb: true },
  },
  {
    id: 'hofgefluester', name: 'Hofgeflüster',
    description: 'Jede Runde ein Ereignis: Pest, Krönungsfest, Verkehrte Welt … Bis 30 Punkte.',
    settings: { goal: DUEL_GOAL, bomb: true, events: true },
  },
  {
    id: 'thronkampf', name: 'Thronkampf',
    description: 'Bis 50 Punkte – oder wer dreimal in Folge die Krone holt, gewinnt sofort.',
    settings: { goal: 50, bomb: true, throne: true },
  },
  {
    id: 'schnapp', name: 'Schnapp-Duell',
    description: 'Gleiche Zahl darf gelegt werden und gewinnt den Stich. Schnell und gemein. Bis 20 Punkte.',
    settings: { goal: 20, snap: true, bomb: true },
  },
];

export const DUEL_VARIANT_BY_ID: Record<string, DuelVariant> = Object.fromEntries(DUEL_VARIANTS.map((v) => [v.id, v]));

export function duelSettings(variant: DuelVariant): Settings {
  return { ...DEFAULT_SETTINGS, tracker: true, ...variant.settings, duel: true, teams: false, doubleDeck: false };
}

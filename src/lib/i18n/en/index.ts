import { APP } from './app';
import { DECKS } from './decks';
import { GAME } from './game';
import { MODES } from './modes';
import { PAGES } from './pages';
import { RULES } from './rules';

/** English dictionary: German source text → English. Split by area to keep files manageable. */
export const EN: Record<string, string> = {
  ...APP,
  ...PAGES,
  ...RULES,
  ...GAME,
  ...DECKS,
  ...MODES,
};

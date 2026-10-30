import { APP } from './app';
import { BOTS_EN } from './bots';
import { MOBILE_EN } from './mobile';
import { MOBILE_A_EN } from './mobile_a';
import { MOBILE_B_EN } from './mobile_b';
import { MOBILE_C_EN } from './mobile_c';
import { CAMPAIGN_EN } from './campaign';
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
  ...CAMPAIGN_EN,
  ...BOTS_EN,
  ...MOBILE_EN,
  ...MOBILE_A_EN,
  ...MOBILE_B_EN,
  ...MOBILE_C_EN,
};

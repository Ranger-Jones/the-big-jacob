import { DEFAULT_SETTINGS, type BotLevel, type Settings } from './jakob/types';

/** "Vom Bauern zum König": eight stages against ever stronger bots. Win a stage to unlock the next. */
export interface CampaignStage {
  level: number;
  place: string;
  title: string;
  emoji: string;
  story: string;
  bots: BotLevel[];
  settings: Partial<Settings>;
  /** Display names of the rules that make this stage special. */
  twist: string;
}

export const CAMPAIGN: CampaignStage[] = [
  {
    level: 1, place: 'Bauernhof', title: 'Bauer', emoji: '🌾', twist: 'Grundregeln',
    story: 'Zwei Knechte vom Nachbarhof fordern dich zum Kartenspiel. Zeig ihnen, wer hier das Sagen hat.',
    bots: ['easy', 'easy'], settings: { rounds: 3 },
  },
  {
    level: 2, place: 'Dorfschänke', title: 'Schankwirt', emoji: '🍺', twist: 'Mehr Gegner',
    story: 'In der Schänke sitzt eine ganze Runde. Wer gewinnt, zahlt heute nichts.',
    bots: ['easy', 'easy', 'easy'], settings: { rounds: 3 },
  },
  {
    level: 3, place: 'Marktplatz', title: 'Händler', emoji: '🧺', twist: 'Hofgeflüster',
    story: 'Am Markt geht es turbulent zu – jede Runde bringt ein neues Ereignis.',
    bots: ['easy', 'easy', 'sly'], settings: { rounds: 3, events: true },
  },
  {
    level: 4, place: 'Zunfthaus', title: 'Zunftmeister', emoji: '⚒️', twist: 'Schnapp!',
    story: 'Die Zunftmeister spielen schnell und frech. Gleiche Zahlen lassen den Nächsten aussetzen.',
    bots: ['sly', 'sly', 'sly'], settings: { rounds: 3, snap: true },
  },
  {
    level: 5, place: 'Burghof', title: 'Ritter', emoji: '🛡️', twist: 'Bomben & Missionen',
    story: 'Die Ritter zünden Bomben und verfolgen geheime Pläne. Behalte die Nerven.',
    bots: ['sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, bomb: true, missions: true },
  },
  {
    level: 6, place: 'Kathedrale', title: 'Erzbischof', emoji: '⛪', twist: 'Königssturz',
    story: 'Wer oben steht, muss sich beweisen: Ein Großer Jakob, der nicht gewinnt, stürzt ab.',
    bots: ['sly', 'sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, kingFall: true, events: true },
  },
  {
    level: 7, place: 'Thronsaal', title: 'Kronprinz', emoji: '🎩', twist: 'Thronfolge',
    story: 'Der Hof ist versammelt. Dreimal in Folge Großer Jakob – und der Thron gehört dir.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 7, throne: true, mercy: true },
  },
  {
    level: 8, place: 'Königsgruft', title: 'Großer Jakob', emoji: '👑', twist: 'Totales Chaos',
    story: 'Die letzte Prüfung: Narrenverbot, Narrenfluch, Hoftausch und eine tickende Uhr.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'],
    settings: { rounds: 5, jesterBan: true, jesterCurse: true, courtSwap: true, blitz: true, turnSeconds: 45, events: true },
  },
];

export function stageSettings(stage: CampaignStage): Settings {
  return { ...DEFAULT_SETTINGS, chat: false, ...stage.settings };
}

/** Title earned so far ("Bauer" before the first win). */
export function campaignTitle(level: number): string {
  if (level <= 0) return 'Landstreicher';
  return CAMPAIGN[Math.min(level, CAMPAIGN.length) - 1].title;
}

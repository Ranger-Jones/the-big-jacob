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
  // Act II – a journey through the realm: foreign courts with their own customs.
  {
    level: 9, place: 'Grenzposten', title: 'Grenzgraf', emoji: '🚧', twist: 'Zugzeit 30 s',
    story: 'An der Grenze wird nicht gezögert. Wer zu lange überlegt, verliert seinen Zug.',
    bots: ['sly', 'sly', 'easy'], settings: { rounds: 3, turnSeconds: 30 },
  },
  {
    level: 10, place: 'Hafenstadt', title: 'Hafenmeister', emoji: '⚓', twist: 'Hohe Steuern',
    story: 'Im Hafen kassiert der Zoll doppelt. Bleib oben, sonst zahlst du drauf.',
    bots: ['sly', 'sly', 'sly'], settings: { rounds: 5, tax: 'high' },
  },
  {
    level: 11, place: 'Silbermine', title: 'Bergvogt', emoji: '⛏️', twist: 'Bomben',
    story: 'Unter Tage knallt es. Vier gleiche Karten sprengen jeden Stich.',
    bots: ['sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, bomb: true },
  },
  {
    level: 12, place: 'Klosterbibliothek', title: 'Archivar', emoji: '📚', twist: 'Ohne Kartengedächtnis',
    story: 'Die Mönche schweigen. Merk dir selbst, welche Karten schon gefallen sind.',
    bots: ['sly', 'sly', 'sly'], settings: { rounds: 5, tracker: false },
  },
  {
    level: 13, place: 'Turnierplatz', title: 'Turnierritter', emoji: '🏇', twist: 'Schnapp! und Bomben',
    story: 'Lanzen und Karten fliegen. Schnell und hart muss gespielt werden.',
    bots: ['sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, snap: true, bomb: true },
  },
  {
    level: 14, place: 'Sumpfdorf', title: 'Moorgraf', emoji: '🐸', twist: 'Narrenfluch',
    story: 'Im Moor bleibt alles an dir kleben – vor allem Narren, die du nicht loswirst.',
    bots: ['sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, jesterCurse: true, events: true },
  },
  {
    level: 15, place: 'Gelehrtenturm', title: 'Hofastronom', emoji: '🔭', twist: 'Geheime Missionen',
    story: 'Die Sterne verraten jedem eine Aufgabe. Erfülle deine, bevor die anderen es tun.',
    bots: ['sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, missions: true, events: true },
  },
  {
    level: 16, place: 'Weinberg', title: 'Kellermeister', emoji: '🍇', twist: 'Hoftausch',
    story: 'Nach der Lese wird geteilt: Die Bürger reichen Karten blind weiter.',
    bots: ['sly', 'sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, courtSwap: true },
  },
  {
    level: 17, place: 'Bärenwald', title: 'Jägermeister', emoji: '🐻', twist: 'Narrenverbot',
    story: 'Wer mit einem Narren aus dem Wald läuft, landet ganz unten.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, jesterBan: true },
  },
  {
    level: 18, place: 'Fürstenhof', title: 'Landgraf', emoji: '🏰', twist: 'Punkteziel 30',
    story: 'Der Fürst spielt nicht nach Runden, sondern bis einer 30 Punkte hat.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { goal: 30, events: true },
  },
  // Act III – legends: the realm's old tales come alive at the card table.
  {
    level: 19, place: 'Nebelpass', title: 'Pfadfinder', emoji: '🌫️', twist: 'Blitzrunde',
    story: 'Der Nebel frisst die Zeit. Jede Runde bleibt dir weniger Bedenkzeit.',
    bots: ['sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, turnSeconds: 45, blitz: true },
  },
  {
    level: 20, place: 'Drachenhort', title: 'Drachentöter', emoji: '🐉', twist: 'Königssturz & Bomben',
    story: 'Der Drache hütet die besten Karten. Wer oben thront, fällt tief.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, kingFall: true, bomb: true },
  },
  {
    level: 21, place: 'Elfenhain', title: 'Mondritter', emoji: '🌙', twist: 'Gnadenrecht',
    story: 'Die Elfen kennen Gnade – einmal pro Spiel darf der Knecht die Steuer verweigern.',
    bots: ['sly', 'sly', 'sly', 'sly', 'easy'], settings: { rounds: 5, mercy: true, events: true },
  },
  {
    level: 22, place: 'Räuberhöhle', title: 'Schattenfürst', emoji: '🗡️', twist: 'Hohe Steuern & Hoftausch',
    story: 'Bei den Räubern wird genommen, nicht gegeben. Halt deine Karten fest.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, tax: 'high', courtSwap: true },
  },
  {
    level: 23, place: 'Gläserner Turm', title: 'Hofmagier', emoji: '🔮', twist: 'Ohne Revolution',
    story: 'Der Magier hat die Revolution verboten. Hier hilft nur gutes Spiel.',
    bots: ['sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, revolution: false, events: true },
  },
  {
    level: 24, place: 'Riesenbrücke', title: 'Brückenvogt', emoji: '🌉', twist: 'Adel gegen Volk',
    story: 'Zwei Lager stehen sich gegenüber. Gewinne mit deinem Team die Brücke.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, teams: true },
  },
  {
    level: 25, place: 'Phönixberg', title: 'Feuerhüter', emoji: '🔥', twist: 'Thronfolge',
    story: 'Wer dreimal in Folge oben steht, steigt wie der Phönix zum Sieg.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 7, throne: true, kingFall: true },
  },
  {
    level: 26, place: 'Geisterburg', title: 'Geisterjäger', emoji: '👻', twist: 'Zugzeit 15 s',
    story: 'Um Mitternacht spukt es. Wer zögert, den holen die Geister.',
    bots: ['sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, turnSeconds: 15 },
  },
  {
    level: 27, place: 'Zwergenschmiede', title: 'Schmiedemeister', emoji: '⚒️', twist: 'Doppeldeck',
    story: 'Die Zwerge spielen mit zwei Kartensätzen – und mit vielen Gegnern.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'easy', 'easy'], settings: { rounds: 3, doubleDeck: true },
  },
  {
    level: 28, place: 'Meereskönigin', title: 'Admiral', emoji: '🌊', twist: 'Punkteziel 50',
    story: 'Die Königin der Meere fordert eine lange Schlacht bis 50 Punkte.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { goal: 50, events: true, snap: true },
  },
  // Act IV – the road to the imperial crown.
  {
    level: 29, place: 'Kurfürstenrat', title: 'Kurfürst', emoji: '📜', twist: 'Abdankung & Gnade',
    story: 'Die Kurfürsten wählen den Kaiser. Überzeuge sie mit List und Großmut.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, abdicate: true, mercy: true, events: true },
  },
  {
    level: 30, place: 'Kaiserpfalz', title: 'Pfalzgraf', emoji: '🏛️', twist: 'Narren steuerpflichtig',
    story: 'Am Kaiserhof zahlt man selbst mit Narren Steuern.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, jestersTaxable: true, tax: 'high' },
  },
  {
    level: 31, place: 'Feldlager', title: 'Feldmarschall', emoji: '⚔️', twist: 'Bomben & Schnapp! & Blitz',
    story: 'Im Krieg zählt Tempo. Alles ist erlaubt, nur kein Zögern.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, bomb: true, snap: true, blitz: true, turnSeconds: 30 },
  },
  {
    level: 32, place: 'Schatzkammer', title: 'Schatzmeister', emoji: '💰', twist: 'Missionen & Narrenfluch',
    story: 'Jeder Edelstein erzählt eine Aufgabe – und jeder Narr kostet dich.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, missions: true, jesterCurse: true },
  },
  {
    level: 33, place: 'Spiegelsaal', title: 'Hofmarschall', emoji: '🪞', twist: 'Verkehrtes Chaos',
    story: 'Im Spiegelsaal ist nichts, wie es scheint. Jede Runde ein neues Ereignis.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 7, events: true, courtSwap: true, jesterBan: true },
  },
  {
    level: 34, place: 'Kaiserliche Jagd', title: 'Reichsjägermeister', emoji: '🦌', twist: 'Adel gegen Volk, Doppeldeck',
    story: 'Die große Jagd: zwei Teams, zwei Kartensätze, ein Sieger.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 3, teams: true, doubleDeck: true },
  },
  {
    level: 35, place: 'Sternwarte', title: 'Reichsastrologe', emoji: '✨', twist: 'Zugzeit 15 s & Missionen',
    story: 'Die Sterne stehen günstig – aber nur für die Schnellen.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 5, turnSeconds: 15, missions: true, events: true },
  },
  {
    level: 36, place: 'Krönungsdom', title: 'Thronanwärter', emoji: '⛪', twist: 'Thronfolge & Königssturz',
    story: 'Vor dem Altar entscheidet sich, wer würdig ist. Dreimal oben – oder tief gefallen.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'sly'], settings: { rounds: 7, throne: true, kingFall: true, events: true },
  },
  {
    level: 37, place: 'Reichstag', title: 'Reichsverweser', emoji: '🦅', twist: 'Punkteziel 50, alle Kniffe',
    story: 'Das ganze Reich sieht zu. Alle Kniffe sind erlaubt, bis einer 50 Punkte hat.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'sly'],
    settings: { goal: 50, snap: true, bomb: true, kingFall: true, events: true, missions: true, mercy: true },
  },
  {
    level: 38, place: 'Kaiserthron', title: 'Kaiser', emoji: '👑', twist: 'Die Kaiserprüfung',
    story: 'Die letzte Station: Narrenverbot, Narrenfluch, hohe Steuern, Blitz und Königssturz. Werde Kaiser.',
    bots: ['sly', 'sly', 'sly', 'sly', 'sly', 'sly', 'sly'],
    settings: {
      rounds: 7, jesterBan: true, jesterCurse: true, tax: 'high', blitz: true, turnSeconds: 45, kingFall: true, events: true, courtSwap: true,
    },
  },
];

/** A new station may be conquered once per day (Berlin date); replaying won stations is always allowed. */
export function campaignLockedToday(wonOn: string | null | undefined, today: string): boolean {
  return wonOn === today;
}

export const CAMPAIGN_DAILY_LIMIT = 'Heute hast du schon eine Station erobert. Die nächste wartet ab morgen auf dich.';

export function stageSettings(stage: CampaignStage): Settings {
  return { ...DEFAULT_SETTINGS, chat: false, ...stage.settings };
}

/** Title earned so far ("Bauer" before the first win). */
export function campaignTitle(level: number): string {
  if (level <= 0) return 'Landstreicher';
  return CAMPAIGN[Math.min(level, CAMPAIGN.length) - 1].title;
}

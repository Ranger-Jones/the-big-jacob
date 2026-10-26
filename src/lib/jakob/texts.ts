import { JESTER, rankWord } from './cards';
import type { CourtEvent, LogEntry, MissionId, Settings } from './types';

export const EVENT_TEXT: Record<CourtEvent, { emoji: string; title: string; text: string }> = {
  holiday: { emoji: '🎉', title: 'Feiertag', text: 'Der König ist gnädig: Diese Runde gibt es keine Steuern.' },
  taxHike: { emoji: '💰', title: 'Steuererhöhung', text: 'Die Knechte zahlen diese Runde je eine Karte mehr.' },
  reversed: { emoji: '🙃', title: 'Verkehrte Welt', text: 'Diese Runde schlagen höhere Zahlen die niedrigeren.' },
  doublePoints: { emoji: '✨', title: 'Doppelte Punkte', text: 'Jeder Platz bringt diese Runde doppelt so viele Punkte.' },
  jesterFreedom: { emoji: '🃏', title: 'Narrenfreiheit', text: 'Ein Narr allein schlägt diese Runde jede Karte.' },
  pest: { emoji: '🐀', title: 'Pest', text: 'Vor dem Ausspielen gibt jeder eine zufällige Karte an den Nächsten weiter.' },
  audit: { emoji: '🔍', title: 'Steuerprüfung', text: 'Eine Karte des Großen Jakob wird allen gezeigt.' },
  coronation: { emoji: '👑', title: 'Krönungsfest', text: 'Der Erste dieser Runde bekommt doppelte Punkte.' },
  charity: { emoji: '🤲', title: 'Mildtätigkeit', text: 'Der Große Jakob schenkt dem Großen Knecht seine schlechteste Karte.' },
};

export const MISSION_TEXT: Record<MissionId, { emoji: string; title: string; text: string }> = {
  twelveTrick: { emoji: '🌾', title: 'Bauernaufstand', text: 'Gewinne einen Stich mit Zwölfen.' },
  bigPlay: { emoji: '🧱', title: 'Großer Wurf', text: 'Lege mindestens 4 Karten auf einmal.' },
  loneJester: { emoji: '🃏', title: 'Narrenstück', text: 'Spiele einen Narren ganz allein.' },
  crownTwice: { emoji: '👑', title: 'Doppelte Krone', text: 'Werde mindestens zweimal Großer Jakob.' },
  neverServant: { emoji: '🧹', title: 'Niemals Knecht', text: 'Werde im ganzen Spiel nie Großer Knecht (ab 2 Runden).' },
  fiveTricks: { emoji: '🖐️', title: 'Stichsammler', text: 'Gewinne 5 Stiche in einem Spiel.' },
  revolutionary: { emoji: '✊', title: 'Aufrührer', text: 'Rufe eine Revolution aus.' },
  climber: { emoji: '🪜', title: 'Emporkömmling', text: 'Steige in einer Runde um mindestens zwei Ränge auf.' },
};

/** "3× Neun", "Narr", "2× Sieben + Narr" */
export function describeCards(cards: readonly number[]): string {
  const naturals = cards.filter((c) => c !== JESTER);
  const jesters = cards.length - naturals.length;
  if (naturals.length === 0) return jesters === 1 ? 'einen Narren' : `${jesters} Narren`;
  const base = naturals.length === 1 ? `eine ${rankWord(naturals[0])}` : `${naturals.length}× ${rankWord(naturals[0])}`;
  return jesters ? `${base} + ${jesters === 1 ? 'Narr' : `${jesters} Narren`}` : base;
}

export function describeLog(entry: LogEntry, name: (id: string) => string): string | null {
  const who = entry.by ? name(entry.by) : '';
  switch (entry.kind) {
    case 'play': return `${who} legt ${describeCards(entry.cards ?? [])}`;
    case 'bomb': return `💣 ${who} zündet eine Bombe: ${describeCards(entry.cards ?? [])}!`;
    case 'pass': return `${who} passt`;
    case 'timeout': return `⏳ ${who} war zu langsam`;
    case 'clear': return entry.by ? `Neuer Stich – ${name(entry.by)} spielt aus` : 'Neuer Stich';
    case 'out': return `🎉 ${who} hat keine Karten mehr`;
    case 'snap': return `⚡ Schnapp! ${entry.to ? name(entry.to) : ''} setzt aus`;
    case 'revolution': return `✊ ${who} ruft die Revolution aus – keine Steuern!`;
    case 'grandRevolution': return `🔥 Große Revolution von ${who}! Die Ordnung kehrt sich um.`;
    case 'tax': return null;
    case 'event': return null;
    case 'left': return `🚪 ${who} hat den Tisch verlassen`;
    case 'jesterOut': return `🤡 ${who} ging mit einem Narren raus und landet ganz unten`;
    case 'unbeatable': return `👑 Unschlagbar! ${who} gewinnt den Stich sofort`;
    case 'kingFall': return `👑💥 Königssturz! ${who} fällt auf den letzten Platz`;
    case 'mission': return `📜 ${who} erfüllt die Mission „${entry.mission ? MISSION_TEXT[entry.mission].title : ''}“ (+3)`;
    case 'mercy': return `🙏 ${who} bittet um Gnade – keine große Steuer`;
    case 'abdicate': return `🪑 ${who} dankt ab und tauscht mit ${entry.to ? name(entry.to) : 'einem Bürger'}`;
    case 'jesterCurse': return `🤡 Narrenfluch: ${who} verliert ${entry.count ?? 1} ${entry.count === 1 ? 'Punkt' : 'Punkte'}`;
    case 'courtSwap': return '🔄 Hoftausch: Die Bürger reichen eine Karte weiter';
    case 'pest': return '🐀 Pest: Jeder reicht eine Karte weiter';
    case 'audit': return `🔍 Steuerprüfung: ${who} hat ${describeCards(entry.cards ?? [])}`;
    case 'charity': return `🤲 ${who} schenkt ${entry.to ? name(entry.to) : ''} ${describeCards(entry.cards ?? [])}`;
    case 'autopilot': return `🤖 Ein Bot spielt für ${who}`;
    case 'resume': return `👋 ${who} ist zurück`;
    case 'throne': return `🏰 Thronfolge! ${who} war dreimal in Folge Großer Jakob`;
  }
}

export const SETTING_TEXT = {
  rounds: { label: 'Runden' },
  turnSeconds: { label: 'Zugzeit' },
  tax: { label: 'Steuern' },
  revolution: { label: 'Revolution', hint: 'Wer beide Narren hat, kann die Steuern abschaffen – als Großer Knecht sogar die Rangfolge umdrehen.' },
  jestersTaxable: { label: 'Narren sind steuerpflichtig', hint: 'Knechte müssen auch ihre Narren als beste Karten abgeben.' },
  chat: { label: 'Chat', hint: 'Nachrichten an den ganzen Tisch.' },
  tracker: { label: 'Kartengedächtnis', hint: 'Zeigt, welche Karten in dieser Runde schon gespielt wurden.' },
  snap: { label: 'Schnapp!', hint: 'Du darfst die gleiche Zahl legen – der Nächste ist dann für diesen Stich raus.' },
  bomb: { label: 'Bombe', hint: 'Vier oder mehr gleiche Karten ohne Narren schlagen jeden Stich und gewinnen ihn sofort.' },
  kingFall: { label: 'Königssturz', hint: 'Wird der Große Jakob nicht Erster, stürzt er auf den letzten Platz.' },
  jesterBan: { label: 'Narrenverbot', hint: 'Wer mit einem Narren ausgeht, landet auf dem letzten Platz.' },
  events: { label: 'Hofgeflüster', hint: 'Jede Runde ein zufälliges Ereignis: Feiertag, Pest, Krönungsfest, Verkehrte Welt …' },
  missions: { label: 'Geheime Missionen', hint: 'Jeder bekommt eine verdeckte Aufgabe – erfüllt bringt sie 3 Bonuspunkte.' },
  throne: { label: 'Thronfolge', hint: 'Wer dreimal hintereinander Großer Jakob wird, gewinnt sofort.' },
  teams: { label: 'Adel gegen Volk', hint: 'Zwei Teams (abwechselnd nach Sitzplatz), die Punkte zählen fürs Team. Gerade Spielerzahl ab 4.' },
  mercy: { label: 'Gnadenrecht', hint: 'Einmal pro Spiel darf der Große Knecht die große Steuer verweigern.' },
  abdicate: { label: 'Abdankung', hint: 'Der Große Jakob darf abdanken und tauscht den Platz mit einem Bürger.' },
  jesterCurse: { label: 'Narrenfluch', hint: 'Wer am Rundenende noch Narren hat, verliert pro Narr einen Punkt.' },
  courtSwap: { label: 'Hoftausch', hint: 'Nach den Steuern reichen die Bürger blind eine Karte weiter.' },
  blitz: { label: 'Blitzrunde', hint: 'Die Zugzeit wird jede Runde 5 Sekunden kürzer (mindestens 10 s).' },
  doubleDeck: { label: 'Doppeldeck', hint: 'Zwei Kartensätze (160 Karten) – bis zu 12 Spieler am Tisch.' },
} as const;

export const KNIFFE = [
  'snap', 'bomb', 'kingFall', 'jesterBan', 'events', 'missions', 'mercy', 'abdicate', 'jesterCurse', 'courtSwap', 'blitz',
] as const satisfies (keyof Settings)[];

/** How the game ends and how big the table can be. */
export const GAME_MODES = ['throne', 'teams', 'doubleDeck'] as const satisfies (keyof Settings)[];

export function goalLabel(goal: Settings['goal']): string {
  return goal === null ? 'Aus' : `${goal} P.`;
}

export function turnLabel(seconds: Settings['turnSeconds']): string {
  return seconds === null ? 'Aus' : `${seconds} s`;
}

export const TAX_LABELS: Record<Settings['tax'], string> = { none: 'Keine', normal: 'Normal', high: 'Hoch' };

export const TEAM_INFO: Record<0 | 1, { name: string; emoji: string; color: string }> = {
  0: { name: 'Adel', emoji: '👑', color: '#6c2a8e' },
  1: { name: 'Volk', emoji: '🌾', color: '#2f7a4f' },
};

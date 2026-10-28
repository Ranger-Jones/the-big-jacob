import { format, type T } from '@/lib/i18n/core';
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

/** Default translator: German text with placeholders filled in. */
const de: T = (text, vars) => format(text, vars);

/** "eine Neun", "3× Neun", "einen Narren", "2× Sieben + Narr" */
export function describeCards(cards: readonly number[], t: T = de): string {
  const naturals = cards.filter((c) => c !== JESTER);
  const jesters = cards.length - naturals.length;
  if (naturals.length === 0) return jesters === 1 ? t('einen Narren') : t('{n} Narren', { n: jesters });
  const rank = naturals[0];
  const word = t(rankWord(rank));
  const base = naturals.length > 1
    ? t('{n}× {rank}', { n: naturals.length, rank: word })
    : rank === 8 ? t('eine Acht') : rank === 11 ? t('eine Elf') : t('eine {rank}', { rank: word });
  if (!jesters) return base;
  return jesters === 1 ? t('{cards} + Narr', { cards: base }) : t('{cards} + {n} Narren', { cards: base, n: jesters });
}

/** Second-person lines for the viewer's own moves ("Du legt" is wrong in German and "You plays" in English). */
function describeOwnLog(entry: LogEntry, t: T, cards: () => string): string | null {
  switch (entry.kind) {
    case 'play': return t('Du legst {cards}', { cards: cards() });
    case 'bomb': return t('💣 Du zündest eine Bombe: {cards}!', { cards: cards() });
    case 'pass': return t('Du passt');
    case 'timeout': return t('⏳ Du warst zu langsam');
    case 'clear': return t('Neuer Stich – du spielst aus');
    case 'out': return t('🎉 Du hast keine Karten mehr');
    case 'revolution': return t('✊ Du rufst die Revolution aus – keine Steuern!');
    case 'grandRevolution': return t('🔥 Deine Große Revolution! Die Ordnung kehrt sich um.');
    case 'jesterOut': return t('🤡 Du gingst mit einem Narren raus und landest ganz unten');
    case 'unbeatable': return t('👑 Unschlagbar! Du gewinnst den Stich sofort');
    case 'kingFall': return t('👑💥 Königssturz! Du fällst auf den letzten Platz');
    case 'mercy': return t('🙏 Du bittest um Gnade – keine große Steuer');
    case 'resume': return t('👋 Du bist zurück');
    case 'duelDraw': return t('🂠 Du passt und ziehst eine Karte vom Hofstapel');
    default: return null;
  }
}

/**
 * One log line. Pass `me` (the viewer's id) to get second-person lines for their own moves;
 * `name` should then return plain names.
 */
export function describeLog(entry: LogEntry, name: (id: string) => string, t: T = de, me?: string | null): string | null {
  const cards = () => describeCards(entry.cards ?? [], t);
  if (me && entry.kind === 'snap' && entry.to === me) return t('⚡ Schnapp! Du setzt aus');
  if (me && entry.by === me && entry.kind !== 'snap') {
    const own = describeOwnLog(entry, t, cards);
    if (own) return own;
  }
  const who = entry.by ? name(entry.by) : '';
  const other = entry.to ? name(entry.to) : '';
  switch (entry.kind) {
    case 'play': return t('{name} legt {cards}', { name: who, cards: cards() });
    case 'bomb': return t('💣 {name} zündet eine Bombe: {cards}!', { name: who, cards: cards() });
    case 'pass': return t('{name} passt', { name: who });
    case 'timeout': return t('⏳ {name} war zu langsam', { name: who });
    case 'clear': return entry.by ? t('Neuer Stich – {name} spielt aus', { name: who }) : t('Neuer Stich');
    case 'out': return t('🎉 {name} hat keine Karten mehr', { name: who });
    case 'snap': return t('⚡ Schnapp! {name} setzt aus', { name: other });
    case 'revolution': return t('✊ {name} ruft die Revolution aus – keine Steuern!', { name: who });
    case 'grandRevolution': return t('🔥 Große Revolution von {name}! Die Ordnung kehrt sich um.', { name: who });
    case 'tax': return null;
    case 'event': return null;
    case 'left': return t('🚪 {name} hat den Tisch verlassen', { name: who });
    case 'jesterOut': return t('🤡 {name} ging mit einem Narren raus und landet ganz unten', { name: who });
    case 'unbeatable': return t('👑 Unschlagbar! {name} gewinnt den Stich sofort', { name: who });
    case 'kingFall': return t('👑💥 Königssturz! {name} fällt auf den letzten Platz', { name: who });
    case 'mission': return t('📜 {name} erfüllt die Mission „{mission}“ (+3)', { name: who, mission: entry.mission ? t(MISSION_TEXT[entry.mission].title) : '' });
    case 'mercy': return t('🙏 {name} bittet um Gnade – keine große Steuer', { name: who });
    case 'abdicate': return entry.to
      ? t('🪑 {name} dankt ab und tauscht mit {other}', { name: who, other })
      : t('🪑 {name} dankt ab und tauscht mit einem Bürger', { name: who });
    case 'jesterCurse': {
      const count = entry.count ?? 1;
      return count === 1
        ? t('🤡 Narrenfluch: {name} verliert 1 Punkt', { name: who })
        : t('🤡 Narrenfluch: {name} verliert {count} Punkte', { name: who, count });
    }
    case 'courtSwap': return t('🔄 Hoftausch: Die Bürger reichen eine Karte weiter');
    case 'pest': return t('🐀 Pest: Jeder reicht eine Karte weiter');
    case 'audit': return t('🔍 Steuerprüfung: {name} hat {cards}', { name: who, cards: cards() });
    case 'charity': return t('🤲 {name} schenkt {other} {cards}', { name: who, other, cards: cards() });
    case 'autopilot': return t('🤖 Ein Bot spielt für {name}', { name: who });
    case 'fastForward': return t('⏩ Nur noch Bots haben Karten – die Runde wurde zu Ende gespielt');
    case 'resume': return t('👋 {name} ist zurück', { name: who });
    case 'throne': return t('🏰 Thronfolge! {name} war dreimal in Folge Großer Jakob', { name: who });
    case 'duelDraw': return t('🂠 {name} zieht eine Karte vom Hofstapel', { name: who });
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
  duel: { label: 'Duell', hint: 'Nur zu zweit: je 15 Karten, der Rest liegt verdeckt als Hofstapel. Wer passt, zieht eine Karte. Der Rundensieger bekommt so viele Punkte, wie der andere noch Karten hat (Narren doppelt).' },
} as const;

export const KNIFFE = [
  'snap', 'bomb', 'kingFall', 'jesterBan', 'events', 'missions', 'mercy', 'abdicate', 'jesterCurse', 'courtSwap', 'blitz',
] as const satisfies (keyof Settings)[];

/** How the game ends and how big the table can be. */
export const GAME_MODES = ['duel', 'throne', 'teams', 'doubleDeck'] as const satisfies (keyof Settings)[];

export function goalLabel(goal: Settings['goal'], t: T = de): string {
  return goal === null ? t('Aus') : t('{goal} P.', { goal });
}

export function turnLabel(seconds: Settings['turnSeconds'], t: T = de): string {
  return seconds === null ? t('Aus') : t('{seconds} s', { seconds });
}

export const TAX_LABELS: Record<Settings['tax'], string> = { none: 'Keine', normal: 'Normal', high: 'Hoch' };

export const TEAM_INFO: Record<0 | 1, { name: string; emoji: string; color: string }> = {
  0: { name: 'Adel', emoji: '👑', color: '#6c2a8e' },
  1: { name: 'Volk', emoji: '🌾', color: '#2f7a4f' },
};

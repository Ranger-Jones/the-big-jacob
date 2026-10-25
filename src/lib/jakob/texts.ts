import { JESTER, rankWord } from './cards';
import type { CourtEvent, LogEntry, Settings } from './types';

export const EVENT_TEXT: Record<CourtEvent, { emoji: string; title: string; text: string }> = {
  holiday: { emoji: '🎉', title: 'Feiertag', text: 'Der König ist gnädig: Diese Runde gibt es keine Steuern.' },
  taxHike: { emoji: '💰', title: 'Steuererhöhung', text: 'Die Knechte zahlen diese Runde je eine Karte mehr.' },
  reversed: { emoji: '🙃', title: 'Verkehrte Welt', text: 'Diese Runde schlagen höhere Zahlen die niedrigeren.' },
  doublePoints: { emoji: '✨', title: 'Doppelte Punkte', text: 'Jeder Platz bringt diese Runde doppelt so viele Punkte.' },
  jesterFreedom: { emoji: '🃏', title: 'Narrenfreiheit', text: 'Ein Narr allein schlägt diese Runde jede Karte.' },
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
    case 'snap': return `⚡ Schnapp! ${entry.to ? name(entry.to) : ''} muss aussetzen`;
    case 'revolution': return `✊ ${who} ruft die Revolution aus – keine Steuern!`;
    case 'grandRevolution': return `🔥 Große Revolution von ${who}! Die Ordnung kehrt sich um.`;
    case 'tax': return null;
    case 'event': return null;
    case 'left': return `🚪 ${who} hat den Tisch verlassen`;
    case 'jesterOut': return `🤡 ${who} ging mit einem Narren raus und landet ganz unten`;
    case 'kingFall': return `👑💥 Königssturz! ${who} fällt auf den letzten Platz`;
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
  snap: { label: 'Schnapp!', hint: 'Du darfst die gleiche Zahl legen – der Nächste muss dann aussetzen.' },
  bomb: { label: 'Bombe', hint: 'Vier oder mehr gleiche Karten ohne Narren schlagen jeden Stich und gewinnen ihn sofort.' },
  kingFall: { label: 'Königssturz', hint: 'Wird der Große Jakob nicht Erster, stürzt er auf den letzten Platz.' },
  jesterBan: { label: 'Narrenverbot', hint: 'Wer mit einem Narren ausgeht, landet auf dem letzten Platz.' },
  events: { label: 'Hofgeflüster', hint: 'Jede Runde ein zufälliges Ereignis: Feiertag, Steuererhöhung, Verkehrte Welt …' },
} as const;

export const KNIFFE = ['snap', 'bomb', 'kingFall', 'jesterBan', 'events'] as const satisfies (keyof Settings)[];

export function turnLabel(seconds: Settings['turnSeconds']): string {
  return seconds === null ? 'Aus' : `${seconds} s`;
}

export const TAX_LABELS: Record<Settings['tax'], string> = { none: 'Keine', normal: 'Normal', high: 'Hoch' };

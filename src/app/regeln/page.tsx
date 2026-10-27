import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PlayingCard } from '@/components/deck/playing-card';
import { Card } from '@/components/ui/card';
import { DEFAULT_DECK } from '@/lib/decks';
import { getT } from '@/lib/i18n/server';
import { RANKS } from '@/lib/jakob/cards';
import { EVENT_TEXT, GAME_MODES, KNIFFE, MISSION_TEXT, SETTING_TEXT } from '@/lib/jakob/texts';
import { MISSIONS } from '@/lib/jakob/types';
import { COURT_EVENTS } from '@/lib/jakob/types';
import { EVENT_ICONS, Icon, MISSION_ICONS, type IconName } from '@/components/ui/icons';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Regeln') };
}

/** Renders **bold** markers of a (translated) sentence as <b>. */
function rich(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

const TITLES: [IconName, string, string][] = [
  ['crown', 'Großer Jakob', 'Spielt zuerst aus und kassiert die zwei besten Karten des Großen Knechts.'],
  ['coronet', 'Kleiner Jakob', 'Bekommt die beste Karte des Kleinen Knechts (ab 4 Spielern).'],
  ['basket', 'Bürger', 'Weder Steuern noch Tribut. Ruhiges Leben in der Mitte.'],
  ['bucket', 'Kleiner Knecht', 'Gibt seine beste Karte ab (ab 4 Spielern).'],
  ['broom', 'Großer Knecht', 'Gibt seine zwei besten Karten ab und bekommt die Reste zurück.'],
];

export default async function RulesPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-14">
      <h1 className="gold-text text-6xl font-bold">{t('So spielt man am Hof')}</h1>
      <p className="text-lg text-parchment/85">
        {t('Der Große Jakob ist ein Ablegespiel um Rang und Würden, nach dem Vorbild von „Der Große Dalmuti“.')}{' '}
        {t('Ziel jeder Runde: als Erster alle Karten loswerden.')}
      </p>
      <p>
        {t('Lieber ausprobieren statt lesen?')} <Link href="/lernen" className="font-bold text-gold-soft hover:underline">{t('Spielen lernen')}</Link> {t('führt dich in sieben Lektionen durchs Spiel.')}
      </p>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Die Karten')}</h2>
        <p>
          {rich(t('80 Karten: Von der **1** gibt es eine, von der **2** zwei … von der **12** zwölf. Dazu kommen zwei **Narren**.'))}{' '}
          {rich(t('Je **kleiner** die Zahl, desto **besser** die Karte – und desto seltener.'))}
        </p>
        <div className="no-scrollbar -mx-2 flex gap-1 overflow-x-auto px-2 pb-2">
          {RANKS.map((r) => <PlayingCard key={r} rank={r} deck={DEFAULT_DECK} size="sm" />)}
        </div>
        <p>
          {t('Narren sind Joker: Zusammen mit anderen Karten zählen sie wie diese. Allein gespielt zählen sie als 13 – die schlechteste Karte.')}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Der Ablauf einer Runde')}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li><b>{t('Rangfolge:')}</b> {t('In der ersten Runde zieht jeder eine Karte. Kleinste Zahl = Großer Jakob, größte = Großer Knecht. Danach bestimmt die Reihenfolge, in der ihr ausgeht, eure neuen Ränge.')}</li>
          <li><b>{t('Geben:')}</b> {t('Alle Karten werden verteilt – die Hohen Herren bekommen eventuelle Extrakarten.')}</li>
          <li><b>{t('Hofzeremonie:')}</b> {t('Wer beide Narren hat, darf jetzt die Revolution ausrufen (siehe unten). Alle bestätigen mit „Bereit“.')}</li>
          <li><b>{t('Steuern:')}</b> {t('Der Große Knecht gibt dem Großen Jakob seine 2 besten Karten, der gibt 2 beliebige zurück. Kleiner Knecht und Kleiner Jakob tauschen je 1 Karte.')}</li>
          <li><b>{t('Ausspielen:')}</b> {rich(t('Der Große Jakob legt beliebig viele **gleiche** Karten. Reihum muss jeder **genauso viele** Karten mit einer **kleineren** Zahl legen – oder passen.'))}</li>
          <li><b>{t('Stich:')}</b> {t('Wer passt, ist für den Rest dieses Stichs raus und wird übersprungen. Haben alle anderen gepasst, gewinnt der Letzte, der gelegt hat, den Stich und spielt neu aus.')}</li>
          <li><b>{t('Unschlagbar:')}</b> {t('Wer die 1 legt – oder eine Zahl, unter der alle kleineren schon gespielt sind –, gewinnt den Stich sofort.')}</li>
          <li><b>{t('Ausgehen:')}</b> {t('Wer keine Karten mehr hat, ist raus und wird in der nächsten Runde entsprechend befördert. Wer übrig bleibt, wird Großer Knecht.')}</li>
        </ol>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Die Ränge')}</h2>
        <ul className="flex flex-col gap-2">
          {TITLES.map(([icon, title, text]) => (
            <li key={title} className="flex gap-3">
              <Icon name={icon} className="mt-0.5 size-6 text-gold-soft" />
              <span><b>{t(title)}</b> – {t(text)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Revolution!')}</h2>
        <p>
          {rich(t('Hast du nach dem Geben **beide Narren**, kannst du die Revolution ausrufen: Diese Runde zahlt niemand Steuern.'))}
        </p>
        <p>
          {rich(t('Bist du dabei der **Große Knecht**, wird es eine **Große Revolution**: Die ganze Rangfolge dreht sich um – du wirst sofort Großer Jakob, der König wird zum Knecht.'))}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Punkte & Sieg')}</h2>
        <p>
          {t('Nach jeder Runde gibt es Punkte nach Platz: Bei 5 Spielern bekommt der Erste 4, der Zweite 3 … der Letzte 0.')}{' '}
          {t('Nach der eingestellten Rundenzahl gewinnt, wer die meisten Punkte hat. Bei Gleichstand zählt die letzte Runde.')}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Spielmodi')}</h2>
        <ul className="flex flex-col gap-2">
          <li><b>{t('Punkteziel:')}</b> {t('Statt fester Rundenzahl wird gespielt, bis jemand 20, 30 oder 50 Punkte hat.')}</li>
          {GAME_MODES.map((k) => <li key={k}><b>{t(SETTING_TEXT[k].label)}:</b> {t(SETTING_TEXT[k].hint)}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Geheime Missionen')}</h2>
        <p>{t('Mit dieser Option bekommt jeder zu Spielbeginn eine verdeckte Aufgabe. Wer sie erfüllt, bekommt sofort 3 Bonuspunkte. Am Ende werden alle Missionen aufgedeckt.')}</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {MISSIONS.map((m) => <li key={m}><Icon name={MISSION_ICONS[m] ?? 'target'} className="text-gold-soft" /> <b>{t(MISSION_TEXT[m].title)}:</b> {t(MISSION_TEXT[m].text)}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Kniffe (in der Lobby wählbar)')}</h2>
        <ul className="flex flex-col gap-2">
          {KNIFFE.map((k) => <li key={k}><b>{t(SETTING_TEXT[k].label)}:</b> {t(SETTING_TEXT[k].hint)}</li>)}
          <li><b>{t(SETTING_TEXT.jestersTaxable.label)}:</b> {t(SETTING_TEXT.jestersTaxable.hint)}</li>
          <li><b>{t('Steuern Hoch:')}</b> {t('Der Große Knecht zahlt 3 Karten, der Kleine 2.')}</li>
        </ul>
        <h3 className="mt-2 text-2xl font-bold">{t('Ereignisse beim Hofgeflüster')}</h3>
        <ul className="flex flex-col gap-1.5">
          {COURT_EVENTS.map((e) => <li key={e}><Icon name={EVENT_ICONS[e] ?? 'sparkles'} className="text-gold-soft" /> <b>{t(EVENT_TEXT[e].title)}:</b> {t(EVENT_TEXT[e].text)}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Bedienung')}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>{t('Deine Hand liegt als Stapel pro Zahl vor dir. Ein Tipp wählt passend viele Karten aus, jeder weitere Tipp eine weniger.')}</li>
          <li>{t('Narren tippst du extra dazu. Ausgegraute Karten passen gerade nicht auf den Stich.')}</li>
          <li><Icon name="book" /> {t('zeigt das Kartengedächtnis,')} <Icon name="chat" /> {t('öffnet den Chat, die Emoji-Leiste schickt Reaktionen an alle.')}</li>
          <li>{t('Hängt jemand fest, kann ihn nach 30 Sekunden jeder am Tisch überspringen – oder ein Bot übernimmt, bis die Person zurück ist. Mit Zugzeit entscheidet der Hof nach Ablauf automatisch.')}</li>
        </ul>
      </Card>
    </main>
  );
}

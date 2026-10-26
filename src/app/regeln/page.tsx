import type { Metadata } from 'next';
import { PlayingCard } from '@/components/deck/playing-card';
import { Card } from '@/components/ui/card';
import { DEFAULT_DECK } from '@/lib/decks';
import { RANKS } from '@/lib/jakob/cards';
import { EVENT_TEXT, GAME_MODES, KNIFFE, MISSION_TEXT, SETTING_TEXT } from '@/lib/jakob/texts';
import { MISSIONS } from '@/lib/jakob/types';
import { COURT_EVENTS } from '@/lib/jakob/types';

export const metadata: Metadata = { title: 'Regeln' };

const TITLES = [
  ['👑', 'Großer Jakob', 'Spielt zuerst aus und kassiert die zwei besten Karten des Großen Knechts.'],
  ['🎩', 'Kleiner Jakob', 'Bekommt die beste Karte des Kleinen Knechts (ab 4 Spielern).'],
  ['🧺', 'Bürger', 'Weder Steuern noch Tribut. Ruhiges Leben in der Mitte.'],
  ['🪣', 'Kleiner Knecht', 'Gibt seine beste Karte ab (ab 4 Spielern).'],
  ['🧹', 'Großer Knecht', 'Gibt seine zwei besten Karten ab und bekommt die Reste zurück.'],
];

export default function RulesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-14">
      <h1 className="gold-text text-6xl font-bold">So spielt man am Hof</h1>
      <p className="text-lg text-parchment/85">
        Der Große Jakob ist ein Ablegespiel um Rang und Würden, nach dem Vorbild von „Der Große Dalmuti“.
        Ziel jeder Runde: als Erster alle Karten loswerden.
      </p>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Die Karten</h2>
        <p>
          80 Karten: Von der <b>1</b> gibt es eine, von der <b>2</b> zwei … von der <b>12</b> zwölf. Dazu kommen zwei <b>Narren</b>.
          Je <b>kleiner</b> die Zahl, desto <b>besser</b> die Karte – und desto seltener.
        </p>
        <div className="no-scrollbar -mx-2 flex gap-1 overflow-x-auto px-2 pb-2">
          {RANKS.map((r) => <PlayingCard key={r} rank={r} deck={DEFAULT_DECK} size="sm" />)}
        </div>
        <p>
          Narren sind Joker: Zusammen mit anderen Karten zählen sie wie diese. Allein gespielt zählen sie als 13 – die schlechteste Karte.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Der Ablauf einer Runde</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li><b>Rangfolge:</b> In der ersten Runde zieht jeder eine Karte. Kleinste Zahl = Großer Jakob, größte = Großer Knecht. Danach bestimmt die Reihenfolge, in der ihr ausgeht, eure neuen Ränge.</li>
          <li><b>Geben:</b> Alle Karten werden verteilt – die Hohen Herren bekommen eventuelle Extrakarten.</li>
          <li><b>Hofzeremonie:</b> Wer beide Narren hat, darf jetzt die Revolution ausrufen (siehe unten). Alle bestätigen mit „Bereit“.</li>
          <li><b>Steuern:</b> Der Große Knecht gibt dem Großen Jakob seine 2 besten Karten, der gibt 2 beliebige zurück. Kleiner Knecht und Kleiner Jakob tauschen je 1 Karte.</li>
          <li><b>Ausspielen:</b> Der Große Jakob legt beliebig viele <b>gleiche</b> Karten. Reihum muss jeder <b>genauso viele</b> Karten mit einer <b>kleineren</b> Zahl legen – oder passen.</li>
          <li><b>Stich:</b> Wer passt, ist für den Rest dieses Stichs raus und wird übersprungen. Haben alle anderen gepasst, gewinnt der Letzte, der gelegt hat, den Stich und spielt neu aus.</li>
          <li><b>Unschlagbar:</b> Wer die 1 legt – oder eine Zahl, unter der alle kleineren schon gespielt sind –, gewinnt den Stich sofort.</li>
          <li><b>Ausgehen:</b> Wer keine Karten mehr hat, ist raus und wird in der nächsten Runde entsprechend befördert. Wer übrig bleibt, wird Großer Knecht.</li>
        </ol>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Die Ränge</h2>
        <ul className="flex flex-col gap-2">
          {TITLES.map(([emoji, title, text]) => (
            <li key={title} className="flex gap-3">
              <span className="text-2xl" aria-hidden>{emoji}</span>
              <span><b>{title}</b> – {text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Revolution!</h2>
        <p>
          Hast du nach dem Geben <b>beide Narren</b>, kannst du die Revolution ausrufen: Diese Runde zahlt niemand Steuern.
        </p>
        <p>
          Bist du dabei der <b>Große Knecht</b>, wird es eine <b>Große Revolution</b>: Die ganze Rangfolge dreht sich um –
          du wirst sofort Großer Jakob, der König wird zum Knecht.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Punkte & Sieg</h2>
        <p>
          Nach jeder Runde gibt es Punkte nach Platz: Bei 5 Spielern bekommt der Erste 4, der Zweite 3 … der Letzte 0.
          Nach der eingestellten Rundenzahl gewinnt, wer die meisten Punkte hat. Bei Gleichstand zählt die letzte Runde.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Spielmodi</h2>
        <ul className="flex flex-col gap-2">
          <li><b>Punkteziel:</b> Statt fester Rundenzahl wird gespielt, bis jemand 20, 30 oder 50 Punkte hat.</li>
          {GAME_MODES.map((k) => <li key={k}><b>{SETTING_TEXT[k].label}:</b> {SETTING_TEXT[k].hint}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Geheime Missionen</h2>
        <p>Mit dieser Option bekommt jeder zu Spielbeginn eine verdeckte Aufgabe. Wer sie erfüllt, bekommt sofort 3 Bonuspunkte. Am Ende werden alle Missionen aufgedeckt.</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {MISSIONS.map((m) => <li key={m}>{MISSION_TEXT[m].emoji} <b>{MISSION_TEXT[m].title}:</b> {MISSION_TEXT[m].text}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Kniffe (in der Lobby wählbar)</h2>
        <ul className="flex flex-col gap-2">
          {KNIFFE.map((k) => <li key={k}><b>{SETTING_TEXT[k].label}:</b> {SETTING_TEXT[k].hint}</li>)}
          <li><b>{SETTING_TEXT.jestersTaxable.label}:</b> {SETTING_TEXT.jestersTaxable.hint}</li>
          <li><b>Steuern Hoch:</b> Der Große Knecht zahlt 3 Karten, der Kleine 2.</li>
        </ul>
        <h3 className="mt-2 text-2xl font-bold">Ereignisse beim Hofgeflüster</h3>
        <ul className="flex flex-col gap-1.5">
          {COURT_EVENTS.map((e) => <li key={e}>{EVENT_TEXT[e].emoji} <b>{EVENT_TEXT[e].title}:</b> {EVENT_TEXT[e].text}</li>)}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">Bedienung</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Deine Hand liegt als Stapel pro Zahl vor dir. Ein Tipp wählt passend viele Karten aus, jeder weitere Tipp eine weniger.</li>
          <li>Narren tippst du extra dazu. Ausgegraute Karten passen gerade nicht auf den Stich.</li>
          <li>🧠 zeigt das Kartengedächtnis, 💬 öffnet den Chat, die Emoji-Leiste schickt Reaktionen an alle.</li>
          <li>Hängt jemand fest, kann ihn nach 30 Sekunden jeder am Tisch überspringen – oder ein Bot übernimmt, bis die Person zurück ist. Mit Zugzeit entscheidet der Hof nach Ablauf automatisch.</li>
        </ul>
      </Card>
    </main>
  );
}

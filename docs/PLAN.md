# Der Große Jakob – Plan

Datum: 2026-10-25 · Online-Umsetzung von „Der Große Dalmuti“ für Freundesrunden. Gleicher Stack wie Kniffel
(Next.js 16, React 19, Tailwind 4, Supabase Auth/Postgres/Realtime/Storage, Vercel `fra1`).

## Regeln (Grundspiel)

- 80 Karten: Rang 1 („Der Große Jakob“) ×1, Rang 2 ×2 … Rang 12 ×12, dazu 2 Narren (13).
  Kleinere Zahl = besser. Narren sind Joker; allein gespielt zählen sie als 13.
- 2–8 Spieler (ab 4 am schönsten). Erste Runde: Jeder zieht eine Karte → Rangfolge (Gleichstand: wer zuerst zog).
- Ränge: Großer Jakob, Kleiner Jakob (ab 4), Bürger, Kleiner Knecht (ab 4), Großer Knecht.
- Geben: alle Karten reihum, beginnend beim Großen Jakob.
- **Hofzeremonie:** Wer beide Narren hat, darf die **Revolution** ausrufen → keine Steuern.
  Ist es der Große Knecht: **Große Revolution** → Rangfolge dreht sich komplett um.
  Damit niemand erraten kann, wer die Narren hat, bestätigen alle kurz „Bereit“.
- **Steuern:** Großer Knecht gibt seine 2 besten Karten an den Großen Jakob, der gibt 2 beliebige zurück;
  Kleiner Knecht ↔ Kleiner Jakob je 1 Karte.
- **Spielen:** Der Große Jakob spielt aus (beliebig viele gleiche Karten). Reihum muss man gleich viele
  Karten mit kleinerer Zahl legen oder passen. Passen alle anderen, spielt der Letzte neu aus.
  Wer zuerst keine Karten mehr hat, wird nächste Runde Großer Jakob usw.
- **Punkte:** pro Runde Platz → Punkte (n−1 … 0). Nach der eingestellten Rundenzahl gewinnt, wer die meisten hat.

## Lobby-Einstellungen (Host)

| Einstellung | Werte | Standard |
|---|---|---|
| Runden | 3 · 5 · 7 · 10 | 5 |
| Zugzeit | Aus · 15 · 30 · 45 · 60 s | Aus |
| Steuern | Keine · Normal · Hoch (3/2) | Normal |
| Revolution | an/aus | an |
| Narren steuerpflichtig | an/aus | aus |
| Chat | an/aus | an |
| **Kniffe** | | |
| Schnapp! | Gleiche Zahl darf gelegt werden – der Nächste setzt aus | aus |
| Bombe | 4+ gleiche Karten ohne Narren schlagen jeden Stich, Stich sofort gewonnen | aus |
| Königssturz | Wird der Große Jakob nicht Erster, stürzt er auf den letzten Platz | aus |
| Narrenverbot | Mit einem Narren darf man nicht ausgehen | aus |
| Hofgeflüster | Jede Runde ein Ereignis: Feiertag, Steuererhöhung, Verkehrte Welt, Doppelte Punkte, Narrenfreiheit | aus |
| Kartengedächtnis | Übersicht, welche Karten schon gespielt wurden | an |

Dazu: **Bots** (Einfach / Gerissen) zum Auffüllen, jeder Spieler wählt sein **eigenes Deck**.

## Eigene Decks

- Seite „Decks“: eigene Decks anlegen (aus Vorlage: Hofstaat, Rettungswache, Tierreich), bearbeiten, löschen,
  als Standard setzen. Live-Vorschau.
- Pro Karte: Name, Emoji, optional eigenes Bild (Upload, quadratisch zugeschnitten, Bucket `deck-art`).
- Deck-Stil: Rahmenfarbe, Akzent, Papier, Schrift (Gotisch, Klassisch, Verspielt), Rückseite (Muster, 2 Farben, Wappen-Emoji).
- In der Lobby wählt jeder sein Deck. Gespielte Karten erscheinen für alle im Deck des Spielers, der sie legt.
- Decks deiner Freunde ansehen und kopieren.

## Architektur

- **Engine** `src/lib/jakob/` (reines TypeScript, voll getestet): Karten, Regeln, Zustandsmaschine
  (`lobby → draw → court → tax → play → roundEnd → … → finished`), Bots.
- **Geheime Hände:** `games.state` enthält nur den öffentlichen Stand (Kartenanzahl statt Karten).
  Vollständige Geheimdaten liegen in `game_secrets` (nur Server). Menschliche Hände werden zusätzlich nach
  `game_hands` gespiegelt – RLS: jeder liest nur seine eigene Zeile.
- `commit_game(...)` schreibt Spielstand, Geheimnisse, Hände und Spielerzeilen atomar mit Versionsprüfung.
- Alle Aktionen sind Server Actions; gemischt wird auf dem Server (`crypto.randomInt`).
- Doppelklick-Schutz über Zug-Token (`round`, `moveSeq`); Zeitablauf meldet irgendein Client, der Server prüft mit eigener Uhr.
- Bots: der Host-Client (bzw. der erste Online-Mensch) stößt Bot-Züge an, der Server berechnet sie.
- Realtime: `games` (UPDATE/DELETE), `game_hands` (RLS), `game_messages`, Broadcast für Reaktionen, Presence.

## Statistik & Bestenliste

Pro Spiel je Spieler: Punkte, Platz, Kronen (Runden als Erster), Knechtschaften, Revolutionen,
Große Revolutionen, Bomben, Aufstiege (Knecht → Jakob). Bestenliste nach Siegen, dann Kronen.
Profil mit Abzeichen, Spielverlauf, Profilbild.

## Seiten

`/zugang` (Frage: „Wer ist mein Lieblings Rettungsdienstmitarbeiter?“ → „Peschel“), `/`, `/login`, `/registrieren`,
`/freunde`, `/bestenliste`, `/profil/[name]`, `/decks`, `/decks/[id]`, `/regeln`, `/spiel/[code]`.

## Umsetzungsschritte

1. Gerüst (Config, Supabase lokal auf eigenen Ports 553xx, Gate, Auth, UI-Kit, Theme).
2. Engine + Regeln + Bots mit Unit-Tests.
3. Migrationen (Schema, RLS, commit_game, Views, Storage, Realtime-Policies).
4. Services/Actions (Spiel, Freunde, Profil, Chat, Decks).
5. Spiel-UI (Lobby, Ziehen, Hofzeremonie, Steuern, Tisch, Hand, Rundenende, Ergebnis), Chat, Reaktionen, Sound.
6. Deck-Editor, Profil, Bestenliste, Regeln, Freunde.
7. Integrationstests gegen lokales Supabase, Build, Lint, Typecheck, Browser-Test.
8. ANLEITUNG.md fürs Hosting.

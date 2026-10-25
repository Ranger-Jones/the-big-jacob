# Der Große Jakob

Online-Kartenspiel nach dem Vorbild von „Der Große Dalmuti“ für Freundesrunden: Live-Tische für 2–8 Spieler,
Bots, Revolution & Große Revolution, Steuern, Hofzeremonie, optionale Kniffe (Schnapp!, Bombe, Königssturz,
Narrenverbot, Hofgeflüster-Ereignisse, Kartengedächtnis), Zugzeit, eigene Decks mit Fotos, Chat, Emoji-Reaktionen,
Freunde mit Online-Status, Einladungen, Revanche, Profilbilder, Abzeichen, Spielverlauf und Bestenliste.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · motion · Supabase (Auth, Postgres, Realtime, Storage) · Vitest · Playwright

Wie du das Spiel online stellst, steht in **[ANLEITUNG.md](ANLEITUNG.md)**. Der Plan liegt in [docs/PLAN.md](docs/PLAN.md).

## Lokal entwickeln

Voraussetzungen: Node 24, pnpm, Docker Desktop (läuft).

```bash
pnpm install
pnpm db:start      # Supabase lokal (Ports 55321–55327, parallel zu Kniffel)
pnpm env:local     # schreibt .env.local mit den lokalen Schlüsseln
pnpm dev --port 3002
```

Supabase Studio: http://127.0.0.1:55323 · Zugangsfrage: „Peschel“

## Tests

```bash
pnpm test              # Unit: Regeln, Engine (komplette Spiele mit Bots), Gate, Hilfsfunktionen
pnpm test:integration  # gegen lokales Supabase: geheime Hände (RLS), Realtime, Spielablauf, Decks
pnpm test:e2e          # Playwright: Gate → Registrierung → Tisch mit Bots → Ziehen → Hofzeremonie
pnpm lint && pnpm typecheck
```

## Aufbau

```
src/lib/jakob/         Karten, Regeln, Zustandsmaschine, Bots, Texte (reines TypeScript, getestet)
src/lib/decks.ts       Deck-Schema (zod) und Vorlagen (Hofstaat, Rettungswache, Tierreich, Piraten)
src/server/*-service   Spiel-, Deck-, Freundes-, Profil- und Chat-Logik (Service-Role, prüft jede Aktion)
src/server/*-actions   Server Actions (Login + Zugangsfrage prüfen, Eingaben validieren)
src/hooks/use-game     Live-Spielzustand, eigene Hand, Presence, Reaktionen, Bot- und Zeit-Anstöße
src/components/        UI (Tisch, Hand, Phasen, Lobby, Deck-Editor, Ergebnis …)
supabase/migrations/   Schema, RLS, commit_game, Statistik-Views, Storage, Realtime-Regeln
```

**Fairness & Geheimnisse:** `games.state` enthält nur den öffentlichen Stand (Kartenanzahl statt Karten).
Alle Hände liegen in `game_secrets` (für Clients unlesbar); jede menschliche Hand wird zusätzlich nach `game_hands`
gespiegelt, wo RLS nur die eigene Zeile freigibt. Gemischt wird auf dem Server (`crypto.randomInt`), gespeichert
atomar mit Versionsprüfung; Züge tragen eine Zugnummer, damit Doppelklicks nur einmal zählen.

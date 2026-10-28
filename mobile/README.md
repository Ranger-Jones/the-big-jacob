# Der Große Jakob – App (Flutter)

Die App spielt an denselben Tischen wie die Website. Sie liest Spielstand, Hand und Profile direkt aus
Supabase (Realtime, RLS) und schickt jeden Zug über die Web-API `/api/app/*` (gleiche Regeln wie im Web).

## Auf dem Handy gegen das lokale Backend testen

Voraussetzungen: Docker Desktop läuft, Handy und Mac sind im selben WLAN, das iPhone ist in Xcode/Flutter
sichtbar (`flutter devices`).

```bash
pnpm db:start          # lokales Supabase (Ports 553xx)
pnpm dev:lan           # Spielserver im WLAN auf Port 3007
mobile/tool/run_local.sh
```

`run_local.sh` sucht die WLAN-IP des Macs, baut die App mit den lokalen Adressen und startet sie auf dem
ersten verbundenen iPhone (oder auf dem Gerät, das du als Argument angibst). Beim ersten Start fragt iOS,
ob die App auf das lokale Netzwerk zugreifen darf → **Erlauben**.

Konten sind die lokalen: In der App registrieren oder ein Testkonto nutzen. Automatisch einloggen:

```bash
DEV_EMAIL=hofnarr_test@test.local DEV_PASSWORD=narrenkappe-123 mobile/tool/run_local.sh
```

Diagnose für Berührungen (zeigt jede Berührung mit Position im Log): `--dart-define=TAP_LOG=true`.

## Gegen den Live-Server

Ohne zusätzliche Angaben nutzt die App `https://the-big-jacob.vercel.app` und das Live-Supabase:

```bash
cd mobile && flutter run --release
```

## Tests

```bash
cd mobile && flutter analyze && flutter test
```

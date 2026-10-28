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

## An Freunde verteilen (ohne App Store Connect)

Die App wird mit dem Eventings-Entwicklerkonto **ad hoc** signiert. Sie läuft dann auf allen iPhones, die im
Konto registriert sind (bis zu 100 iPhones pro Jahr), ganz ohne App Store oder TestFlight.

1. **iPhone deines Freundes registrieren:** Er schickt dir seine Geräte-ID (UDID). Am einfachsten: iPhone per
   Kabel an einen Mac → Finder → auf die Zeile unter dem Gerätenamen klicken, bis die UDID erscheint → kopieren.
   Dann auf [developer.apple.com](https://developer.apple.com/account/resources/devices/list) → Devices → **+** →
   Name und UDID eintragen.
2. **App bauen:** `mobile/tool/build_adhoc.sh` – Xcode nimmt neu registrierte iPhones automatisch ins Profil auf.
   Ergebnis: `mobile/build/ios/ipa/der_grosse_jakob.ipa`.
3. **Verteilen:** Die `.ipa` bei [diawi.com](https://www.diawi.com) hochladen → du bekommst einen Link und einen
   QR-Code. Dein Freund öffnet den Link in **Safari** auf dem iPhone → „Installieren“.
4. Fertig – ein Entwicklermodus ist für Ad-hoc-Builds nicht nötig. Updates installiert man genauso über einen neuen Link.

Für jeden neuen Freund: Schritt 1 und 2 wiederholen und die neue `.ipa` teilen. Das Profil ist ein Jahr gültig;
danach einfach neu bauen. Ohne Installation geht es übrigens auch: die Website in Safari öffnen →
Teilen → „Zum Home-Bildschirm“.

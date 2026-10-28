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

## An Freunde verteilen über TestFlight (ohne Gerätekennungen)

Die App kommt dabei nicht in den App Store – nur wer den Einladungslink hat, kann sie über Apples TestFlight-App installieren.

Einmalig:
1. In [App Store Connect](https://appstoreconnect.apple.com) unter **Apps → + → Neue App** anlegen: iOS, Name „Der Große Jakob“, Sprache Deutsch, Bundle-ID `de.rangerjones.derGrosseJakob`, SKU z. B. `dergrossejakob`.
2. In Xcode unter **Settings → Accounts** ist der Eventings-Account angemeldet (Rolle Admin oder App Manager).

Pro Version:
1. `mobile/tool/build_testflight.sh` – baut, signiert und lädt hoch (Build-Nummer kommt aus der Uhrzeit).
2. Nach 10–30 Minuten erscheint der Build in App Store Connect unter **TestFlight**.

Beim ersten Mal für externe Tester:
1. **TestFlight → Externe Tests → +** eine Gruppe „Freunde“ anlegen und den Build hinzufügen.
2. **Testinformationen** ausfüllen: kurze Beschreibung, Feedback-E-Mail, Kontaktdaten und ein **Demo-Konto** (Benutzername + Passwort), mit dem sich Apples Prüfer anmelden können.
3. Zur Beta-Prüfung einreichen (meist innerhalb eines Tages), danach **Öffentlichen Link aktivieren** und den Link verschicken.

Spätere Builds derselben Version brauchen meist keine neue Prüfung. Jeder Build läuft nach 90 Tagen ab.

## An Freunde verteilen per Ad hoc (mit Gerätekennungen)

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

# Anleitung: Der Große Jakob online stellen

Das dauert etwa 20 Minuten. Du brauchst **GitHub**, **Supabase** und **Vercel** – genau wie bei Kniffel.

> Der Große Jakob bekommt ein **eigenes Supabase-Projekt** (eigene Tabellen, eigene Accounts).
> Im kostenlosen Supabase-Tarif sind **2 aktive Projekte** erlaubt – Kniffel + Jakob passt also genau.

## 1. Code auf GitHub ✅

Der Code liegt in [github.com/Ranger-Jones/the-big-jacob](https://github.com/Ranger-Jones/the-big-jacob) (Branch `main`).
Spätere Änderungen lädst du mit `git push` hoch.

## 2. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) → **New project**.
2. Name: `der-grosse-jakob`, Region: **Frankfurt (eu-central-1)**.
3. **Datenbank-Passwort** vergeben und notieren.
4. Warten, bis das Projekt bereit ist. Die **Project Reference** steht in der Adresszeile: `supabase.com/dashboard/project/<ref>`.

## 3. Datenbank einrichten

Im Projektordner `~/Development/DerGrosseJakob`:

```bash
pnpm exec supabase login
```

```bash
pnpm exec supabase link --project-ref <ref>
```

```bash
pnpm exec supabase db push
```

Das legt alle Tabellen, Zugriffsregeln (geheime Hände!), Statistiken, Realtime-Regeln und die Speicher für Profilbilder und Kartenbilder an.

## 4. Login-Einstellungen in Supabase

Im Supabase-Dashboard unter **Authentication**:

1. **Sign In / Providers → Email:** **Confirm email** ausschalten und speichern.
2. **URL Configuration → Site URL:** nach Schritt 6 deine Vercel-Adresse eintragen (z. B. `https://the-big-jacob.vercel.app`).

## 5. Schlüssel kopieren

Im Supabase-Dashboard oben auf **Connect** oder unter **Project Settings → API Keys**:

| Wert | Wo | Wird zu |
|---|---|---|
| Project URL | `https://<ref>.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key | beginnt mit `sb_publishable_` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key | beginnt mit `sb_secret_` | `SUPABASE_SECRET_KEY` |

⚠️ Den **Secret key** nie teilen und nie in den Code schreiben – er gehört nur in Vercel.
Er signiert auch das Zugangs-Cookie der Passwortfrage.

## 6. Auf Vercel veröffentlichen

1. Auf [vercel.com](https://vercel.com) → **Add New → Project** → Repo `the-big-jacob` importieren (Next.js wird erkannt).
2. Unter **Environment Variables** die drei Werte aus Schritt 5 eintragen.
3. **Deploy**. Nach 1–2 Minuten hast du deine Adresse.
4. Die Adresse in Supabase als **Site URL** eintragen (Schritt 4.2).

## 7. Ausprobieren

1. Seite öffnen → Frage **„Wer ist mein Lieblings Rettungsdienstmitarbeiter?“** → **Peschel** (Groß-/Kleinschreibung egal).
2. Account erstellen, Freunde unter **Freunde** hinzufügen.
3. **Neuen Tisch eröffnen**, Freunde einladen oder Link teilen, Regeln & Kniffe wählen, ggf. Bots dazuholen → **Spiel starten**. 👑

## Gut zu wissen

- **Passwortfrage ändern:** in `src/lib/gate.ts` (`GATE_QUESTION`, `ANSWER`). Wer schon drin ist, bleibt drin – um alle auszusperren, auch `PAYLOAD` ändern.
- **Pausiertes Projekt:** Kostenlose Supabase-Projekte schlafen nach 7 Tagen ohne Nutzung ein → im Dashboard **Restore project**.
- **Passwort vergessen:** Im Supabase-Dashboard unter **Authentication → Users** ein neues Passwort setzen.
- **Updates:** `git push` → Vercel deployt automatisch. Neue Migrationen danach mit `pnpm exec supabase db push`.
- **Realtime-Einstellungen:** Nichts ändern. **„Allow public access“** unter Realtime → Settings eingeschaltet lassen, sonst kommen Einladungen nicht live an.
- **Kosten:** Für eine Freundesrunde reichen die Free-Tarife locker. Kartenbilder und Profilbilder werden auf 384 bzw. 256 px verkleinert.
- **Lokal weiterentwickeln:** siehe [README.md](README.md). Läuft parallel zu Kniffel (eigene Ports 553xx, App auf Port 3002).

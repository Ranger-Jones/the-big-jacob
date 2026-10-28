#!/bin/sh
# Next.js dev server for testing the mobile app on a phone in the same WLAN (port 3007).
#   pnpm dev:lan        → local Supabase (announced under the LAN address so images load on the phone)
#   pnpm dev:lan prod   → the real Supabase project; needs .env.prod.local with
#                         NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
[ -z "$IP" ] && { echo "Keine WLAN-IP gefunden."; exit 1; }
if [ "$1" = "prod" ]; then
  [ -f .env.prod.local ] || { echo "Für den Test gegen das echte Supabase fehlt .env.prod.local (siehe mobile/README.md)."; exit 1; }
  set -a; . ./.env.prod.local; set +a
  echo "Spielserver für die App: http://$IP:3007 – gegen das ECHTE Supabase ($NEXT_PUBLIC_SUPABASE_URL)"
  exec next dev --hostname 0.0.0.0 --port 3007
fi
echo "Spielserver für die App: http://$IP:3007 (lokales Supabase: http://$IP:55321)"
NEXT_PUBLIC_SUPABASE_URL="http://$IP:55321" exec next dev --hostname 0.0.0.0 --port 3007

#!/bin/zsh
# Runs the app against the local backend on this Mac:
#   1. `pnpm db:start` (local Supabase) and `pnpm dev:lan` (Next.js on port 3007, reachable in the WLAN)
#   2. `mobile/tool/run_local.sh [device]` – device = simulator name/UDID or iPhone UDID (default: first iPhone found)
# Phone and Mac must be in the same WLAN. Accounts are the local ones (register in the app or use a test account).
set -e
ROOT=${0:A:h:h:h}
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
KEY=$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' "$ROOT/.env.local" | cut -d= -f2)
[[ -z "$IP" || -z "$KEY" ]] && { echo "Keine LAN-IP oder kein lokaler Supabase-Key (.env.local) gefunden."; exit 1; }
DEVICE=${1:-$(flutter devices --machine 2>/dev/null | python3 -c "import sys,json;d=[x for x in json.load(sys.stdin) if x['targetPlatform'].startswith('ios') and not x['emulator']];print(d[0]['id'] if d else '')")}
[[ -z "$DEVICE" ]] && { echo "Kein iPhone gefunden. Gerät per Kabel oder WLAN verbinden."; exit 1; }
curl -s -o /dev/null --max-time 3 "http://$IP:3007/api/app/art/h-crown" || echo "Hinweis: Der Spielserver antwortet nicht auf http://$IP:3007 – läuft 'pnpm dev:lan'?"
echo "Backend: http://$IP:3007 · Supabase: http://$IP:55321 · Gerät: $DEVICE"
cd "$ROOT/mobile"
DEFINES=(--dart-define=API_BASE=http://$IP:3007 --dart-define=SUPABASE_URL=http://$IP:55321 --dart-define=SUPABASE_KEY=$KEY)
[[ -n "$DEV_EMAIL" ]] && DEFINES+=(--dart-define=DEV_EMAIL=$DEV_EMAIL --dart-define=DEV_PASSWORD=$DEV_PASSWORD)
flutter run --release -d "$DEVICE" "${DEFINES[@]}"

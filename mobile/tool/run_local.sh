#!/bin/zsh
# Runs the app on an iPhone (or simulator) against the game server on this Mac.
#   mobile/tool/run_local.sh [device]        → local Supabase   (server: pnpm dev:lan)
#   mobile/tool/run_local.sh prod [device]   → real Supabase    (server: pnpm dev:lan prod)
# Phone and Mac must be in the same WLAN.
set -e
ROOT=${0:A:h:h:h}
MODE=local
[[ "$1" == "prod" ]] && { MODE=prod; shift; }
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
[[ -z "$IP" ]] && { echo "Keine WLAN-IP gefunden."; exit 1; }
DEVICE=${1:-$(flutter devices --machine 2>/dev/null | python3 -c "import sys,json;d=[x for x in json.load(sys.stdin) if x['targetPlatform'].startswith('ios') and not x['emulator']];print(d[0]['id'] if d else '')")}
[[ -z "$DEVICE" ]] && { echo "Kein iPhone gefunden. Gerät per Kabel oder WLAN verbinden."; exit 1; }
curl -s -o /dev/null --max-time 5 "http://$IP:3007/api/app/art/h-crown" || echo "Hinweis: Der Spielserver antwortet nicht auf http://$IP:3007 – läuft 'pnpm dev:lan'?"
DEFINES=(--dart-define=API_BASE=http://$IP:3007)
if [[ $MODE == local ]]; then
  KEY=$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' "$ROOT/.env.local" | cut -d= -f2)
  DEFINES+=(--dart-define=SUPABASE_URL=http://$IP:55321 --dart-define=SUPABASE_KEY=$KEY)
fi
[[ -n "$DEV_EMAIL" ]] && DEFINES+=(--dart-define=DEV_EMAIL=$DEV_EMAIL --dart-define=DEV_PASSWORD=$DEV_PASSWORD)
echo "Modus: $MODE · Spielserver: http://$IP:3007 · Gerät: $DEVICE"
cd "$ROOT/mobile"
flutter run --release -d "$DEVICE" "${DEFINES[@]}"

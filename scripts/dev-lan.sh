#!/bin/sh
# Next.js dev server for testing the mobile app on a phone in the same WLAN (port 3007).
# Supabase is announced under the LAN address, so image URLs written in this mode load on the phone.
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
[ -z "$IP" ] && { echo "Keine WLAN-IP gefunden."; exit 1; }
echo "Spielserver für die App: http://$IP:3007 (Supabase: http://$IP:55321)"
NEXT_PUBLIC_SUPABASE_URL="http://$IP:55321" exec next dev --hostname 0.0.0.0 --port 3007

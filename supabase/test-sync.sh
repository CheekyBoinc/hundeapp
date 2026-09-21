#!/bin/bash
# Abnahmetest des Sync-Dienstes: legt ein Testkonto an, prüft Schreiben,
# Konflikt, Lesen, fehlende Freischaltung und Löschung und räumt danach auf.
#
# Aufruf:  SUPABASE_ACCESS_TOKEN=sbp_... ./supabase/test-sync.sh
#
# Der Zugangsschlüssel kommt aus der Umgebung und wird nirgends abgelegt;
# die Projektkennung steht in supabase/config.toml.

set -euo pipefail

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Bitte SUPABASE_ACCESS_TOKEN setzen." >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
REF=$(grep -m1 '^project_id' "$root/supabase/config.toml" | cut -d'"' -f2)
URL="https://$REF.supabase.co"
MGMT="https://api.supabase.com/v1/projects/$REF"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

jget() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);process.stdout.write(String(eval('o'+process.argv[1])??''))}catch(e){process.stdout.write('')}})" "$1"
}
put() { node -e "require('fs').writeFileSync(process.argv[1], process.argv[2])" "$TMP/$1" "$2"; }

KEYS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" "$MGMT/api-keys")
ANON=$(echo "$KEYS" | jget ".find(x=>x.name==='anon').api_key")
SERVICE=$(echo "$KEYS" | jget ".find(x=>x.name==='service_role').api_key")

sqlq() {
  put sql.json "$(node -e "process.stdout.write(JSON.stringify({query: process.argv[1]}))" "$1")"
  curl -s -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    --data @"$TMP/sql.json" "$MGMT/database/query"
}

email="test-$(date +%s)@example.com"
pw="Testpasswort-123"

put user.json "{\"email\":\"$email\",\"password\":\"$pw\",\"email_confirm\":true}"
uid=$(curl -s -X POST "$URL/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
  -H "Content-Type: application/json" --data @"$TMP/user.json" | jget ".id")
echo "1. Testkonto angelegt:            $([ -n "$uid" ] && echo ja || echo NEIN)"

echo "2. Freischaltung durch Auslöser:  $(sqlq "select active, source from entitlement where user_id = '$uid'")"

put login.json "{\"email\":\"$email\",\"password\":\"$pw\"}"
jwt=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
  -H "Content-Type: application/json" --data @"$TMP/login.json" | jget ".access_token")
echo "3. Anmeldung:                     $([ -n "$jwt" ] && echo ja || echo NEIN)"

rpc() {
  put rpc.json "$2"
  curl -s -X POST "$URL/rest/v1/rpc/$1" -H "apikey: $ANON" -H "Authorization: Bearer $jwt" \
    -H "Content-Type: application/json" --data @"$TMP/rpc.json"
}

echo "4. Erstes Schreiben:              $(rpc sync_put '{"p_expected":null,"p_data":{"stand":1}}')   (erwartet 1)"
echo "5. Schreiben mit Revision:        $(rpc sync_put '{"p_expected":1,"p_data":{"stand":2}}')   (erwartet 2)"
echo "6. Revision abfragen:             $(rpc sync_head '{}')   (erwartet 2)"
echo "7. Veraltete Revision:            $(rpc sync_put '{"p_expected":1,"p_data":{"stand":3}}')   (erwartet null)"

sqlq "update entitlement set active = false where user_id = '$uid'" > /dev/null
echo "8. Ohne Freischaltung:            $(rpc sync_put '{"p_expected":2,"p_data":{"stand":4}}' | head -c 100)"
echo "9. Lesen trotz Sperre:            $(curl -s "$URL/rest/v1/sync_state?select=revision" -H "apikey: $ANON" -H "Authorization: Bearer $jwt")"
sqlq "update entitlement set active = true where user_id = '$uid'" > /dev/null

echo "10. Zu großes Dokument:           $(sqlq "insert into sync_state (user_id, data) values ('$uid', to_jsonb(repeat('a', 1100000)))" | head -c 120)"

curl -s -X DELETE "$URL/auth/v1/admin/users/$uid" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" > /dev/null
echo "11. Nach dem Löschen:             sync_state=$(sqlq "select count(*) from sync_state where user_id = '$uid'") entitlement=$(sqlq "select count(*) from entitlement where user_id = '$uid'")   (erwartet je 0)"

#!/bin/sh
# SPIKE / NOT PRODUCTION AUTHORITY. Never use shell tracing with credentials.
set -eu
for value in "$NAKAMA_DB_PASSWORD" "$NAKAMA_HTTP_KEY" "$NAKAMA_SERVER_KEY" "$NAKAMA_SESSION_KEY" "$NAKAMA_REFRESH_KEY" "$NAKAMA_CONSOLE_PASSWORD" "$NAKAMA_CONSOLE_KEY"; do
  case "$value" in *[!0-9a-f]*|'') echo 'Generate local hex credentials first' >&2; exit 1;; esac
  [ "${#value}" -ge 64 ] || { echo 'Local credentials must be at least 64 hex characters' >&2; exit 1; }
done
/nakama/nakama migrate up --database.address "nakama:$NAKAMA_DB_PASSWORD@postgres:5432/nakama"
exec /nakama/nakama --name emopet-spike \
  --database.address "nakama:$NAKAMA_DB_PASSWORD@postgres:5432/nakama" \
  --runtime.path /nakama/data/modules --runtime.js_entrypoint world.js \
  --runtime.env "WORLD_SPIKE_TEST_USER_IDS=$WORLD_SPIKE_TEST_USER_IDS" \
  --runtime.http_key "$NAKAMA_HTTP_KEY" --socket.server_key "$NAKAMA_SERVER_KEY" \
  --session.encryption_key "$NAKAMA_SESSION_KEY" --session.refresh_encryption_key "$NAKAMA_REFRESH_KEY" \
  --session.token_expiry_sec 300 --session.refresh_token_expiry_sec 300 \
  --console.username spike --console.password "$NAKAMA_CONSOLE_PASSWORD" \
  --console.signing_key "$NAKAMA_CONSOLE_KEY" --logger.level WARN

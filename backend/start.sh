#!/usr/bin/env bash
set -euo pipefail

PORT="${SECRET_BACKEND_PORT:-8443}"
CERT_FILE="${TLS_CERT_FILE:-/certs/localhost.crt}"
KEY_FILE="${TLS_KEY_FILE:-/certs/localhost.key}"

EXTRA_ARGS=()
if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
  EXTRA_ARGS+=("--ssl-certfile" "$CERT_FILE" "--ssl-keyfile" "$KEY_FILE")
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" "${EXTRA_ARGS[@]}"

#!/bin/sh
set -eu

PORT="${FRONTEND_PORT:-5173}"
CERT_FILE="${TLS_CERT_FILE:-/certs/localhost.crt}"
KEY_FILE="${TLS_KEY_FILE:-/certs/localhost.key}"

CMD="npm run dev -- --host --port ${PORT}"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  CMD="$CMD --https --cert ${CERT_FILE} --key ${KEY_FILE}"
fi

exec sh -c "$CMD"

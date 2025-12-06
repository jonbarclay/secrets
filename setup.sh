#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
CERT_DIR="certs"
CERT_FILE="${CERT_DIR}/localhost.crt"
KEY_FILE="${CERT_DIR}/localhost.key"

log() {
  printf "[setup] %s\n" "$1"
}

ensure_certificates() {
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    log "Existing self-signed certificate found at ${CERT_FILE} and ${KEY_FILE}."
    return
  fi

  log "Generating self-signed certificate for https://localhost ..."
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=localhost" >/dev/null 2>&1
  log "Self-signed certificate created at ${CERT_FILE} and key at ${KEY_FILE}."
}

lock_down_permissions() {
  chmod 644 "$CERT_FILE" "$KEY_FILE"
}

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    touch "$ENV_FILE"
    log "Created ${ENV_FILE}."
  fi
}

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >>"$ENV_FILE"
  fi
}

ensure_fernet_key() {
  if grep -q '^SECRET_FERNET_KEY=' "$ENV_FILE"; then
    return
  fi

  local key
  key=$(python - <<'PY'
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
  )
  upsert_env "SECRET_FERNET_KEY" "$key"
  log "Generated SECRET_FERNET_KEY."
}

seed_defaults() {
  upsert_env "SECRET_REDIS_URL" "redis://redis:6379/0"
  upsert_env "SECRET_FRONTEND_ORIGIN" "https://localhost"
  upsert_env "SECRET_DEFAULT_TTL_SECONDS" "3600"
  upsert_env "SECRET_ONE_TIME_FALLBACK_TTL_SECONDS" "3600"
  upsert_env "SECRET_BACKEND_PORT" "8443"
  upsert_env "FRONTEND_PORT" "5173"
  upsert_env "TLS_CERT_FILE" "/certs/localhost.crt"
  upsert_env "TLS_KEY_FILE" "/certs/localhost.key"
  upsert_env "VITE_API_BASE" "https://localhost/api"
}

main() {
  ensure_certificates
  ensure_env_file
  lock_down_permissions
  ensure_fernet_key
  seed_defaults

  log "Environment ready. Review ${ENV_FILE} to customize values before running docker compose."
}

main "$@"

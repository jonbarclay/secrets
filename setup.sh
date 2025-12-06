#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
CERT_DIR="certs"
CSR_FILE="${CERT_DIR}/server.csr"

# These will be set based on user input
DOMAIN=""
CERT_FILE=""
KEY_FILE=""

log() {
  printf "[setup] %s\n" "$1"
}

prompt() {
  printf "[setup] %s " "$1"
}

extract_domain_from_url() {
  local url="$1"
  # Remove protocol prefix and any trailing path/port
  echo "$url" | sed -E 's|^https?://||' | sed -E 's|[:/].*||'
}

validate_url() {
  local url="$1"
  if [[ "$url" =~ ^https?://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})?(:[0-9]+)?(/.*)?$ ]]; then
    return 0
  else
    return 1
  fi
}

prompt_for_url() {
  local default_url="https://localhost"

  echo ""
  log "Enter the URL where this application will be hosted."
  log "This is used for TLS certificates and CORS configuration."
  echo ""
  prompt "Application URL [${default_url}]:"
  read -r user_url

  if [[ -z "$user_url" ]]; then
    user_url="$default_url"
  fi

  # Ensure URL has https:// prefix
  if [[ ! "$user_url" =~ ^https?:// ]]; then
    user_url="https://${user_url}"
  fi

  if ! validate_url "$user_url"; then
    log "Warning: URL format may be invalid. Proceeding anyway."
  fi

  DOMAIN=$(extract_domain_from_url "$user_url")
  CERT_FILE="${CERT_DIR}/${DOMAIN}.crt"
  KEY_FILE="${CERT_DIR}/${DOMAIN}.key"

  # Store the full URL for use in env configuration
  APP_URL="$user_url"

  log "Using domain: ${DOMAIN}"
}

prompt_certificate_type() {
  echo ""
  log "Certificate Setup Options:"
  echo "  1) Generate self-signed certificate (for development/testing)"
  echo "  2) Generate CSR for CA signing (for production)"
  echo "  3) Skip certificate generation (certificates already exist)"
  echo ""
  prompt "Select option [1]:"
  read -r cert_choice

  cert_choice="${cert_choice:-1}"

  case "$cert_choice" in
    1)
      generate_self_signed_certificate
      ;;
    2)
      generate_csr_for_signing
      ;;
    3)
      check_existing_certificates
      ;;
    *)
      log "Invalid option. Defaulting to self-signed certificate."
      generate_self_signed_certificate
      ;;
  esac
}

generate_self_signed_certificate() {
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    log "Existing certificate found at ${CERT_FILE}."
    prompt "Overwrite? [y/N]:"
    read -r overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
      log "Keeping existing certificate."
      return
    fi
  fi

  log "Generating self-signed certificate for ${DOMAIN}..."

  # Generate certificate with SAN for better compatibility
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN}" \
    2>/dev/null || \
  # Fallback for older OpenSSL without -addext
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=${DOMAIN}" \
    2>/dev/null

  log "Self-signed certificate created at ${CERT_FILE}"
  log "Private key created at ${KEY_FILE}"
}

generate_csr_for_signing() {
  mkdir -p "$CERT_DIR"

  local csr_file="${CERT_DIR}/${DOMAIN}.csr"

  if [[ -f "$KEY_FILE" ]]; then
    log "Existing private key found at ${KEY_FILE}."
    prompt "Overwrite? [y/N]:"
    read -r overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
      log "Using existing private key."
    else
      log "Generating new private key..."
      openssl genrsa -out "$KEY_FILE" 2048 2>/dev/null
    fi
  else
    log "Generating private key..."
    openssl genrsa -out "$KEY_FILE" 2048 2>/dev/null
  fi

  log "Generating Certificate Signing Request (CSR) for ${DOMAIN}..."

  # Create OpenSSL config for SAN support
  local openssl_cnf="${CERT_DIR}/openssl-${DOMAIN}.cnf"
  cat > "$openssl_cnf" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
CN = ${DOMAIN}

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = www.${DOMAIN}
EOF

  openssl req -new \
    -key "$KEY_FILE" \
    -out "$csr_file" \
    -config "$openssl_cnf" \
    2>/dev/null

  log "CSR generated at ${csr_file}"
  log "Private key at ${KEY_FILE}"
  echo ""
  log "=========================================="
  log "CSR CONTENTS (submit this to your CA):"
  log "=========================================="
  cat "$csr_file"
  echo ""
  log "=========================================="
  echo ""

  prompt_for_signed_certificate
}

prompt_for_signed_certificate() {
  echo ""
  log "After your CA signs the CSR, you'll receive a signed certificate."
  prompt "Do you have the signed certificate now? [y/N]:"
  read -r has_cert

  if [[ "$has_cert" =~ ^[Yy]$ ]]; then
    import_signed_certificate
  else
    log "When you receive your signed certificate, paste it into: ${CERT_FILE}"
    log "Or re-run this setup script and select option 3."

    # Create placeholder so the script can complete
    if [[ ! -f "$CERT_FILE" ]]; then
      log "Creating placeholder certificate file..."
      touch "$CERT_FILE"
    fi
  fi
}

import_signed_certificate() {
  echo ""
  log "Paste your PEM-encoded signed certificate below."
  log "Include the full chain if provided (server cert first, then intermediates)."
  log "End with an empty line or press Ctrl+D when done:"
  echo ""

  local cert_content=""
  local line
  local in_cert=false

  while IFS= read -r line; do
    # Stop on empty line after certificate content
    if [[ -z "$line" && "$in_cert" == true ]]; then
      break
    fi

    if [[ "$line" == "-----BEGIN CERTIFICATE-----" ]]; then
      in_cert=true
    fi

    if [[ "$in_cert" == true || "$line" == "-----BEGIN CERTIFICATE-----" ]]; then
      cert_content+="${line}"$'\n'
    fi

    if [[ "$line" == "-----END CERTIFICATE-----" ]]; then
      # Check if there's more (certificate chain)
      :
    fi
  done

  if [[ -z "$cert_content" ]]; then
    log "Error: No certificate content received."
    return 1
  fi

  echo "$cert_content" > "$CERT_FILE"
  log "Signed certificate saved to ${CERT_FILE}"

  # Verify the certificate matches the private key
  if ! verify_cert_key_match; then
    log "Warning: Certificate and private key may not match!"
    log "Please verify your certificate is correct."
  else
    log "Certificate and private key verified successfully."
  fi
}

verify_cert_key_match() {
  if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
    return 1
  fi

  local cert_modulus key_modulus
  cert_modulus=$(openssl x509 -noout -modulus -in "$CERT_FILE" 2>/dev/null | openssl md5)
  key_modulus=$(openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5)

  [[ "$cert_modulus" == "$key_modulus" ]]
}

check_existing_certificates() {
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    log "Found existing certificates:"
    log "  Certificate: ${CERT_FILE}"
    log "  Private key: ${KEY_FILE}"

    if verify_cert_key_match; then
      log "Certificate and key verified successfully."
    else
      log "Warning: Certificate and private key may not match!"
    fi
  else
    log "Error: Certificate files not found for domain ${DOMAIN}"
    log "Expected:"
    log "  ${CERT_FILE}"
    log "  ${KEY_FILE}"
    echo ""
    prompt "Would you like to generate a self-signed certificate instead? [Y/n]:"
    read -r gen_self_signed
    if [[ ! "$gen_self_signed" =~ ^[Nn]$ ]]; then
      generate_self_signed_certificate
    else
      log "Please ensure certificate files exist before running docker-compose."
      exit 1
    fi
  fi
}

lock_down_permissions() {
  if [[ -f "$CERT_FILE" ]]; then
    chmod 644 "$CERT_FILE"
  fi
  if [[ -f "$KEY_FILE" ]]; then
    chmod 600 "$KEY_FILE"
  fi
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
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
  else
    echo "${key}=${value}" >>"$ENV_FILE"
  fi
}

ensure_fernet_key() {
  if grep -q '^SECRET_FERNET_KEY=' "$ENV_FILE"; then
    return
  fi

  local key
  key=$(python3 - <<'PY'
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
  )
  upsert_env "SECRET_FERNET_KEY" "$key"
  log "Generated SECRET_FERNET_KEY."
}

seed_defaults() {
  # Extract port from URL if present, otherwise use defaults
  local frontend_port="443"
  if [[ "$APP_URL" =~ :([0-9]+) ]]; then
    frontend_port="${BASH_REMATCH[1]}"
  fi

  # Core settings
  upsert_env "SECRET_REDIS_URL" "redis://redis:6379/0"
  upsert_env "SECRET_DEFAULT_TTL_SECONDS" "3600"
  upsert_env "SECRET_ONE_TIME_FALLBACK_TTL_SECONDS" "3600"
  upsert_env "SECRET_BACKEND_PORT" "8443"
  upsert_env "FRONTEND_PORT" "5173"

  # Domain and URL configuration (for CORS)
  upsert_env "APP_DOMAIN" "$DOMAIN"
  upsert_env "APP_URL" "$APP_URL"
  upsert_env "SECRET_FRONTEND_ORIGIN" "$APP_URL"
  upsert_env "VITE_API_BASE" "${APP_URL}/api"

  # TLS certificate paths (inside container)
  upsert_env "TLS_CERT_FILE" "/certs/${DOMAIN}.crt"
  upsert_env "TLS_KEY_FILE" "/certs/${DOMAIN}.key"
}

show_summary() {
  echo ""
  log "=========================================="
  log "Setup Complete!"
  log "=========================================="
  log "Domain:      ${DOMAIN}"
  log "URL:         ${APP_URL}"
  log "Certificate: ${CERT_FILE}"
  log "Private Key: ${KEY_FILE}"
  log "Environment: ${ENV_FILE}"
  echo ""
  log "Next steps:"
  log "  1. Review ${ENV_FILE} to customize values if needed"
  log "  2. Run: docker compose up --build"
  log "  3. Access the application at: ${APP_URL}"
  echo ""
  if [[ "$DOMAIN" != "localhost" ]]; then
    log "Note: Ensure DNS is configured to point ${DOMAIN} to this server."
  fi
}

main() {
  echo ""
  log "Secret Vault Setup"
  log "=================="

  prompt_for_url
  ensure_env_file
  prompt_certificate_type
  lock_down_permissions
  ensure_fernet_key
  seed_defaults
  show_summary
}

main "$@"

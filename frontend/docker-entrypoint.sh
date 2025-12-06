#!/bin/sh
set -e

# Default values if not set
APP_DOMAIN="${APP_DOMAIN:-localhost}"
TLS_CERT_FILE="${TLS_CERT_FILE:-/certs/localhost.crt}"
TLS_KEY_FILE="${TLS_KEY_FILE:-/certs/localhost.key}"

# Export for envsubst
export APP_DOMAIN TLS_CERT_FILE TLS_KEY_FILE

# Generate nginx config from template
# Only substitute our specific variables, not nginx variables like $uri
envsubst '${APP_DOMAIN} ${TLS_CERT_FILE} ${TLS_KEY_FILE}' \
    < /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "[entrypoint] Generated nginx config for domain: ${APP_DOMAIN}"
echo "[entrypoint] Using certificate: ${TLS_CERT_FILE}"

# Start nginx
exec nginx -g 'daemon off;'

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.uat}"
INFRA_COMPOSE_FILE="${INFRA_COMPOSE_FILE:-$ROOT_DIR/deploy/docker-compose.uat-infra.yml}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/opms}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"

DEFAULT_UAT_DOMAIN="${UAT_DOMAIN:-devopms.cbn.gov.ng}"
DEFAULT_UAT_APP_HOSTNAME="${UAT_APP_HOSTNAME:-ABJHCIVOPMSAPPT}"
DEFAULT_UAT_APP_REAL_IP="${UAT_APP_REAL_IP:-10.140.91.51}"
DEFAULT_UAT_APP_NAT_IP="${UAT_APP_NAT_IP:-172.24.52.51}"
DEFAULT_UAT_DB_HOSTNAME="${UAT_DB_HOSTNAME:-ABJHCIVOPMSDBT}"
DEFAULT_UAT_DB_REAL_IP="${UAT_DB_REAL_IP:-10.140.91.52}"
DEFAULT_UAT_DB_NAT_IP="${UAT_DB_NAT_IP:-172.24.52.52}"

SKIP_BUILD=0
SKIP_INFRA=0
SKIP_NGINX=0
SKIP_DNS_CHECK=0
FORCE_RECREATE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/deploy-uat.sh [options] <command>

Commands:
  write-env     Create/validate .env.uat, then exit
  setup-db      Provision the UAT DB/infra server and start infra services
  setup-app     Provision the UAT application server
  setup-all     Run setup-db, then setup-app
  ssl           Install an existing TLS certificate/key on the app server
  deploy        Build and deploy the API, portal, PM2 config, infra, and Nginx
  status        Show app and infra service status
  logs          Tail app PM2 logs
  backup        Back up the UAT PostgreSQL database on the DB server
  rollback      Roll back the app server to the previous API binary

Options:
  --env-file PATH       Use a custom env file. Default: .env.uat
  --infra-compose PATH  Use a custom infra compose file. Default: deploy/docker-compose.uat-infra.yml
  --deploy-user USER    SSH user. Default: deploy
  --deploy-dir PATH     Remote deploy directory. Default: /opt/opms
  --skip-build          Do not rebuild the Go API before deploy
  --skip-infra          Do not sync/start DB/infra services during deploy
  --skip-nginx          Do not install/reload Nginx during deploy
  --skip-dns-check      Do not validate devopms.cbn.gov.ng A record
  --force-recreate      Force Docker container recreation for infra services
  -h, --help            Show this help

Default UAT topology:
  Domain:      devopms.cbn.gov.ng
  App server:  ABJHCIVOPMSAPPT  real 10.140.91.51  NAT 172.24.52.51
  DB server:   ABJHCIVOPMSDBT    real 10.140.91.52  NAT 172.24.52.52

First-run values can be supplied through environment variables before running:
  UAT_DOMAIN, UAT_APP_REAL_IP, UAT_APP_NAT_IP, UAT_DB_REAL_IP, UAT_DB_NAT_IP
  UAT_APP_SSH_HOST, UAT_DB_SSH_HOST, TLS_EMAIL

Existing .env.uat files are never overwritten.
USAGE
}

log() {
  printf '[uat] %s\n' "$*"
}

warn() {
  printf '[uat] warning: %s\n' "$*" >&2
}

fail() {
  printf '[uat] error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:?--env-file requires a path}"
      shift 2
      ;;
    --infra-compose)
      INFRA_COMPOSE_FILE="${2:?--infra-compose requires a path}"
      shift 2
      ;;
    --deploy-user)
      DEPLOY_USER="${2:?--deploy-user requires a user}"
      shift 2
      ;;
    --deploy-dir)
      DEPLOY_DIR="${2:?--deploy-dir requires a path}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-infra)
      SKIP_INFRA=1
      shift
      ;;
    --skip-nginx)
      SKIP_NGINX=1
      shift
      ;;
    --skip-dns-check)
      SKIP_DNS_CHECK=1
      shift
      ;;
    --force-recreate)
      FORCE_RECREATE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      fail "unknown option: $1"
      ;;
    *)
      break
      ;;
  esac
done

COMMAND="${1:-}"
[[ -n "$COMMAND" ]] || {
  usage
  exit 1
}
shift || true
[[ $# -eq 0 ]] || fail "unexpected argument(s): $*"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH"
}

random_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

hex_secret() {
  local bytes="${1:-32}"
  openssl rand -hex "$bytes" | tr -d '\n'
}

env_file_value() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 0
  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

config_value() {
  local key="$1"
  if [[ -n "${!key-}" ]]; then
    printf '%s' "${!key}"
  else
    env_file_value "$key"
  fi
}

require_not_placeholder() {
  local key="$1"
  local value="$2"
  [[ -n "$value" ]] || fail "$key is required"
  [[ "$value" != CHANGE_ME* ]] || fail "$key is still a placeholder"
  [[ "$value" != replace-with-* ]] || fail "$key is still a placeholder"
}

require_https_url() {
  local key="$1"
  local value="$2"
  [[ "$value" == https://* ]] || fail "$key must be an HTTPS URL"
}

target_for() {
  local host="$1"
  printf '%s@%s' "$DEPLOY_USER" "$host"
}

ssh_cmd() {
  local target="$1"
  shift
  ssh -o ConnectTimeout=10 -o ServerAliveInterval=30 -o StrictHostKeyChecking=accept-new "$target" "$@"
}

rsync_to() {
  local target="$1"
  shift
  rsync -az --delete -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" "$@" "$target"
}

resolve_ipv4() {
  local host="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$host" | awk '/^[0-9.]+$/ { print }'
  elif command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$host" | awk '{ print $1 }' | sort -u
  else
    return 1
  fi
}

create_env_file_if_missing() {
  if [[ -f "$ENV_FILE" ]]; then
    log "using existing env file: $ENV_FILE"
    return 0
  fi

  require_cmd openssl

  local domain="$DEFAULT_UAT_DOMAIN"
  local app_hostname="$DEFAULT_UAT_APP_HOSTNAME"
  local app_real_ip="$DEFAULT_UAT_APP_REAL_IP"
  local app_nat_ip="$DEFAULT_UAT_APP_NAT_IP"
  local db_hostname="$DEFAULT_UAT_DB_HOSTNAME"
  local db_real_ip="$DEFAULT_UAT_DB_REAL_IP"
  local db_nat_ip="$DEFAULT_UAT_DB_NAT_IP"
  local frontend_url="https://$domain"
  local api_url="https://$domain/api/v1"
  local tls_email="${TLS_EMAIL:-}"

  log "creating $ENV_FILE"
  umask 077
  cat > "$ENV_FILE" <<EOF
# Generated by scripts/deploy-uat.sh
# Do not commit this file.

COMPOSE_PROJECT_NAME=opms-uat
UAT_DOMAIN=$domain
UAT_APP_HOSTNAME=$app_hostname
UAT_APP_REAL_IP=$app_real_ip
UAT_APP_NAT_IP=$app_nat_ip
UAT_APP_SSH_HOST=$app_nat_ip
UAT_DB_HOSTNAME=$db_hostname
UAT_DB_REAL_IP=$db_real_ip
UAT_DB_NAT_IP=$db_nat_ip
UAT_DB_SSH_HOST=$db_nat_ip

FRONTEND_URL=$frontend_url
NEXT_PUBLIC_API_URL=$api_url
ENTRA_REDIRECT_URI=$frontend_url/auth/callback

SERVER_HOST=0.0.0.0
SERVER_PORT=8089
SERVER_ENV=uat
LOG_LEVEL=info
LOG_FORMAT=json

DB_HOST=$db_real_ip
DB_PORT=5432
POSTGRES_HOST_PORT=5432
DB_USER=opms
DB_PASSWORD=$(random_secret)
DB_NAME=itd_opms
DB_SSLMODE=disable
DB_MAX_CONNS=50
DB_MIN_CONNS=10
DB_RLS_ENABLED=false

REDIS_HOST=$db_real_ip
REDIS_PORT=6381
REDIS_HOST_PORT=6381
REDIS_PASSWORD=$(hex_secret 32)
REDIS_DB=0

MINIO_ENDPOINT=$db_real_ip:9010
MINIO_HOST_PORT=9010
MINIO_CONSOLE_HOST_PORT=9011
MINIO_ACCESS_KEY=opms_uat
MINIO_SECRET_KEY=$(hex_secret 32)
MINIO_USE_SSL=false
MINIO_BUCKET_EVIDENCE=evidence-vault
MINIO_BUCKET_ATTACHMENTS=attachments

NATS_URL=nats://$db_real_ip:4222
NATS_HOST_PORT=4222
NATS_MONITOR_HOST_PORT=8222
INFRA_BIND_ADDRESS=$db_real_ip
MINIO_CONSOLE_BIND_ADDRESS=127.0.0.1
NATS_MONITOR_BIND_ADDRESS=127.0.0.1

JWT_SECRET=$(random_secret)
JWT_EXPIRY=30m
JWT_REFRESH_EXPIRY=168h
MFA_ENCRYPTION_KEY=$(random_secret)

ENTRA_ENABLED=false
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_GROUP_ROLE_MAPPING_JSON={}
GRAPH_SERVICE_ACCOUNT_ID=

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@cbn.gov.ng
SENDGRID_FROM_NAME=ITD-OPMS
INBOUND_EMAIL_WEBHOOK_SECRET=$(random_secret)
INBOUND_EMAIL_DOMAIN=$domain

SIEM_ENABLED=false
SIEM_MODE=syslog
SIEM_SYSLOG_ADDR=localhost:514
SIEM_SYSLOG_PROTO=udp
SIEM_WEBHOOK_URL=

OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
OTEL_SERVICE_NAME=itd-opms-api

TLS_MODE=existing
TLS_EMAIL=$tls_email
TLS_CERT_PATH=$DEPLOY_DIR/ssl/$domain.pem
TLS_KEY_PATH=$DEPLOY_DIR/ssl/$domain.key
EOF

  chmod 600 "$ENV_FILE"
  log "created $ENV_FILE with generated UAT secrets"
}

validate_env() {
  local key
  local value

  for key in \
    UAT_DOMAIN \
    UAT_APP_REAL_IP \
    UAT_APP_NAT_IP \
    UAT_APP_SSH_HOST \
    UAT_DB_REAL_IP \
    UAT_DB_NAT_IP \
    UAT_DB_SSH_HOST \
    FRONTEND_URL \
    NEXT_PUBLIC_API_URL \
    DB_HOST \
    DB_USER \
    DB_PASSWORD \
    DB_NAME \
    REDIS_HOST \
    REDIS_PASSWORD \
    MINIO_ENDPOINT \
    MINIO_ACCESS_KEY \
    MINIO_SECRET_KEY \
    NATS_URL \
    JWT_SECRET \
    MFA_ENCRYPTION_KEY; do
    value="$(config_value "$key")"
    require_not_placeholder "$key" "$value"
  done

  require_https_url FRONTEND_URL "$(config_value FRONTEND_URL)"
  require_https_url NEXT_PUBLIC_API_URL "$(config_value NEXT_PUBLIC_API_URL)"

  if [[ "$(config_value FRONTEND_URL)" =~ localhost|127\.0\.0\.1|0\.0\.0\.0 ]]; then
    fail "FRONTEND_URL must not point at localhost for UAT"
  fi

  local jwt_secret
  jwt_secret="$(config_value JWT_SECRET)"
  if ((${#jwt_secret} < 32)); then
    fail "JWT_SECRET must be at least 32 characters"
  fi

  if [[ "$(config_value DB_HOST)" != "$(config_value UAT_DB_REAL_IP)" ]]; then
    warn "DB_HOST is $(config_value DB_HOST), expected UAT DB real IP $(config_value UAT_DB_REAL_IP)"
  fi
}

validate_dns() {
  ((SKIP_DNS_CHECK)) && return 0

  local domain
  local app_nat_ip
  local ips

  domain="$(config_value UAT_DOMAIN)"
  app_nat_ip="$(config_value UAT_APP_NAT_IP)"
  ips="$(resolve_ipv4 "$domain" || true)"

  if [[ -z "$ips" ]]; then
    if [[ "${ALLOW_DNS_MISMATCH:-}" == "1" ]]; then
      warn "could not resolve A record for $domain"
      return 0
    fi
    fail "$domain has no resolvable A record. Point it at $app_nat_ip or use --skip-dns-check."
  fi

  if ! grep -qxF "$app_nat_ip" <<<"$ips"; then
    if [[ "${ALLOW_DNS_MISMATCH:-}" == "1" ]]; then
      warn "$domain resolves to [$ips], expected $app_nat_ip"
    else
      fail "$domain must resolve to $app_nat_ip before UAT can go live. Use --skip-dns-check to deploy before DNS is ready."
    fi
  fi
}

ensure_env() {
  create_env_file_if_missing
  validate_env
}

app_target() {
  target_for "$(config_value UAT_APP_SSH_HOST)"
}

db_target() {
  target_for "$(config_value UAT_DB_SSH_HOST)"
}

compose_cmd() {
  printf 'docker compose --env-file %q -f %q' "$DEPLOY_DIR/deploy/.env.uat" "$DEPLOY_DIR/deploy/docker-compose.uat-infra.yml"
}

sync_infra_files() {
  local target
  target="$(db_target)"

  require_cmd rsync
  require_cmd ssh

  log "syncing UAT infra compose and env to $(config_value UAT_DB_HOSTNAME) ($(config_value UAT_DB_SSH_HOST))"
  ssh_cmd "$target" "mkdir -p '$DEPLOY_DIR/deploy' '$DEPLOY_DIR/backups'"
  rsync -az -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "$INFRA_COMPOSE_FILE" \
    "$target:$DEPLOY_DIR/deploy/docker-compose.uat-infra.yml"
  rsync -az -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "$ENV_FILE" \
    "$target:$DEPLOY_DIR/deploy/.env.uat"
}

start_infra() {
  local target
  local up_flags
  local compose

  target="$(db_target)"
  compose="$(compose_cmd)"
  up_flags="-d"
  if ((FORCE_RECREATE)); then
    up_flags="$up_flags --force-recreate"
  fi

  log "starting UAT infra services on $(config_value UAT_DB_HOSTNAME)"
  ssh_cmd "$target" "bash -s" <<REMOTE
set -euo pipefail
cd "$DEPLOY_DIR/deploy"
$compose up $up_flags

deadline=\$((SECONDS + $HEALTH_TIMEOUT_SECONDS))
while true; do
  pending=()
  for service in postgres redis minio nats; do
    cid=\$($compose ps -q "\$service" 2>/dev/null || true)
    if [[ -z "\$cid" ]]; then
      pending+=("\$service:not-created")
      continue
    fi
    status=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "\$cid" 2>/dev/null || printf unknown)
    if [[ "\$status" != "healthy" && "\$status" != "running" ]]; then
      pending+=("\$service:\$status")
    fi
  done
  if ((\${#pending[@]} == 0)); then
    break
  fi
  if ((SECONDS >= deadline)); then
    $compose ps
    printf 'infra services did not become healthy: %s\n' "\${pending[*]}" >&2
    exit 1
  fi
  printf 'waiting for infra health: %s\n' "\${pending[*]}"
  sleep 5
done

$compose ps
REMOTE
}

cmd_setup_db() {
  ensure_env
  local target
  target="$(db_target)"

  log "provisioning DB/infra server $(config_value UAT_DB_HOSTNAME) ($(config_value UAT_DB_SSH_HOST))"
  ssh_cmd "$target" "sudo bash -s" <<REMOTE
set -euo pipefail
apt-get update
apt-get install -y curl wget ca-certificates gnupg lsb-release ufw fail2ban htop

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi
systemctl enable docker
systemctl start docker
usermod -aG docker "$DEPLOY_USER" || true

mkdir -p "$DEPLOY_DIR/deploy" "$DEPLOY_DIR/backups" "$DEPLOY_DIR/ssl"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow from "$(config_value UAT_APP_REAL_IP)" to any port 5432 proto tcp
ufw allow from "$(config_value UAT_APP_REAL_IP)" to any port 6381 proto tcp
ufw allow from "$(config_value UAT_APP_REAL_IP)" to any port 9010 proto tcp
ufw allow from "$(config_value UAT_APP_REAL_IP)" to any port 4222 proto tcp
ufw allow from "$(config_value UAT_APP_NAT_IP)" to any port 5432 proto tcp
ufw allow from "$(config_value UAT_APP_NAT_IP)" to any port 6381 proto tcp
ufw allow from "$(config_value UAT_APP_NAT_IP)" to any port 9010 proto tcp
ufw allow from "$(config_value UAT_APP_NAT_IP)" to any port 4222 proto tcp
ufw --force enable

systemctl enable fail2ban
systemctl start fail2ban
REMOTE

  sync_infra_files
  start_infra
  log "DB/infra server is ready"
}

cmd_setup_app() {
  ensure_env
  local target
  target="$(app_target)"

  log "provisioning app server $(config_value UAT_APP_HOSTNAME) ($(config_value UAT_APP_SSH_HOST))"
  ssh_cmd "$target" "sudo bash -s" <<REMOTE
set -euo pipefail
apt-get update
apt-get install -y curl wget ca-certificates gnupg lsb-release ufw fail2ban htop build-essential nginx

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
  env PATH=\$PATH:/usr/bin pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" || true
fi

mkdir -p "$DEPLOY_DIR/itd-opms-api/bin" "$DEPLOY_DIR/itd-opms-portal" "$DEPLOY_DIR/deploy" "$DEPLOY_DIR/backups" "$DEPLOY_DIR/ssl"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

systemctl enable nginx

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable fail2ban
systemctl start fail2ban
REMOTE

  log "app server is ready"
}

render_pm2_config_remote() {
  local target="$1"
  local api_url
  api_url="$(config_value NEXT_PUBLIC_API_URL)"

  ssh_cmd "$target" "bash -s" <<REMOTE
set -euo pipefail
cat > "$DEPLOY_DIR/deploy/ecosystem.uat.config.js" <<'EOF'
module.exports = {
  apps: [
    {
      name: 'opms-api-uat',
      cwd: '$DEPLOY_DIR/itd-opms-api',
      script: 'bin/itd-opms-api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        SERVER_ENV: 'uat',
      },
    },
    {
      name: 'opms-portal-uat',
      cwd: '$DEPLOY_DIR/itd-opms-portal',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_API_URL: '$api_url',
      },
    },
  ],
};
EOF
REMOTE
}

proxy_headers() {
  cat <<'EOF'
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
EOF
}

portal_proxy_headers() {
  cat <<'EOF'
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
EOF
}

render_nginx_http_config() {
  local domain
  domain="$(config_value UAT_DOMAIN)"

  cat <<EOF
upstream opms_uat_api {
    server 127.0.0.1:8089;
    keepalive 32;
}

upstream opms_uat_portal {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name $domain;
    client_max_body_size 55m;

    location = /nginx-health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location = /api/v1/health {
$(proxy_headers)
        proxy_pass http://opms_uat_api;
        access_log off;
    }

    location /api/ {
$(proxy_headers)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_pass http://opms_uat_api;
    }

    location /_next/static/ {
$(portal_proxy_headers)
        proxy_pass http://opms_uat_portal;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
$(portal_proxy_headers)
        proxy_pass http://opms_uat_portal;
    }
}
EOF
}

render_nginx_https_config() {
  local domain
  local cert_path
  local key_path
  domain="$(config_value UAT_DOMAIN)"
  cert_path="$(config_value TLS_CERT_PATH)"
  key_path="$(config_value TLS_KEY_PATH)"

  cat <<EOF
upstream opms_uat_api {
    server 127.0.0.1:8089;
    keepalive 32;
}

upstream opms_uat_portal {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name $domain;

    location = /nginx-health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 308 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name $domain;
    client_max_body_size 55m;

    ssl_certificate $cert_path;
    ssl_certificate_key $key_path;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    location = /nginx-health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location = /api/v1/health {
$(proxy_headers)
        proxy_pass http://opms_uat_api;
        access_log off;
    }

    location /api/ {
$(proxy_headers)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_pass http://opms_uat_api;
    }

    location /_next/static/ {
$(portal_proxy_headers)
        proxy_pass http://opms_uat_portal;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
$(portal_proxy_headers)
        proxy_pass http://opms_uat_portal;
    }
}
EOF
}

install_nginx_config() {
  local target
  local tls_mode
  local cert_path
  local key_path
  local tmp_config

  target="$(app_target)"
  tls_mode="$(config_value TLS_MODE)"
  cert_path="$(config_value TLS_CERT_PATH)"
  key_path="$(config_value TLS_KEY_PATH)"
  tmp_config="$(mktemp)"

  require_cmd scp

  if [[ "$tls_mode" == "none" ]]; then
    warn "TLS_MODE=none; installing HTTP-only Nginx config"
    render_nginx_http_config > "$tmp_config"
  elif ssh_cmd "$target" "test -f '$cert_path' -a -f '$key_path'"; then
    render_nginx_https_config > "$tmp_config"
  else
    warn "TLS certificate/key not found on app server; installing HTTP-only Nginx config"
    warn "run: scripts/deploy-uat.sh ssl"
    render_nginx_http_config > "$tmp_config"
  fi

  scp -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$tmp_config" "$target:/tmp/opms-uat.conf"
  rm -f "$tmp_config"

  ssh_cmd "$target" "sudo bash -s" <<'REMOTE'
set -euo pipefail
cp /tmp/opms-uat.conf /etc/nginx/conf.d/opms-uat.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
REMOTE
}

cmd_ssl() {
  ensure_env
  local target
  local cert_path
  local key_path
  local cert_pem
  local key_pem
  target="$(app_target)"
  cert_path="$(config_value TLS_CERT_PATH)"
  key_path="$(config_value TLS_KEY_PATH)"

  log "installing TLS certificate for $(config_value UAT_DOMAIN) on $(config_value UAT_APP_HOSTNAME)"
  printf 'Paste the certificate PEM, then press Ctrl-D:\n'
  cert_pem="$(cat)"
  printf 'Paste the private key PEM, then press Ctrl-D:\n'
  key_pem="$(cat)"

  [[ -n "${cert_pem:-}" ]] || fail "certificate PEM cannot be empty"
  [[ -n "${key_pem:-}" ]] || fail "private key PEM cannot be empty"

  ssh_cmd "$target" "sudo bash -s" <<REMOTE
set -euo pipefail
mkdir -p "$(dirname "$cert_path")"
cat > "$cert_path" <<'CERTEOF'
$cert_pem
CERTEOF
cat > "$key_path" <<'KEYEOF'
$key_pem
KEYEOF
chmod 644 "$cert_path"
chmod 600 "$key_path"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$(dirname "$cert_path")"
REMOTE

  install_nginx_config
  log "TLS certificate installed"
}

cmd_deploy() {
  ensure_env
  validate_dns

  local app
  local deploy_tag
  local api_url
  app="$(app_target)"
  deploy_tag="$(date +%Y%m%d_%H%M%S)"
  api_url="$(config_value NEXT_PUBLIC_API_URL)"

  require_cmd rsync
  require_cmd ssh

  if ((SKIP_INFRA == 0)); then
    sync_infra_files
    start_infra
  else
    warn "skipping infra sync/start"
  fi

  if ((SKIP_BUILD == 0)); then
    require_cmd go
    log "building Go API binary for linux/amd64"
    (
      cd "$ROOT_DIR/itd-opms-api"
      CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/itd-opms-api ./cmd/api
    )
  else
    warn "skipping Go API build"
  fi

  log "syncing API binary, migrations, portal, and env to $(config_value UAT_APP_HOSTNAME)"
  ssh_cmd "$app" "mkdir -p '$DEPLOY_DIR/itd-opms-api/bin' '$DEPLOY_DIR/itd-opms-api/migrations' '$DEPLOY_DIR/itd-opms-portal' '$DEPLOY_DIR/deploy'"

  rsync -az -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "$ROOT_DIR/itd-opms-api/bin/itd-opms-api" \
    "$app:$DEPLOY_DIR/itd-opms-api/bin/itd-opms-api.new"

  rsync_to "$app:$DEPLOY_DIR/itd-opms-api/migrations/" \
    "$ROOT_DIR/itd-opms-api/migrations/"

  rsync_to "$app:$DEPLOY_DIR/itd-opms-portal/" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.env' \
    --exclude='.env.local' \
    "$ROOT_DIR/itd-opms-portal/"

  rsync -az -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "$ENV_FILE" \
    "$app:$DEPLOY_DIR/itd-opms-api/.env"
  rsync -az -e "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "$ENV_FILE" \
    "$app:$DEPLOY_DIR/deploy/.env.uat"

  render_pm2_config_remote "$app"

  log "building portal and restarting PM2 services on app server"
  ssh_cmd "$app" "bash -s" <<REMOTE
set -euo pipefail
cd "$DEPLOY_DIR"

if [[ -f itd-opms-api/bin/itd-opms-api ]]; then
  cp itd-opms-api/bin/itd-opms-api itd-opms-api/bin/itd-opms-api.rollback
fi
mv itd-opms-api/bin/itd-opms-api.new itd-opms-api/bin/itd-opms-api
chmod +x itd-opms-api/bin/itd-opms-api

cd "$DEPLOY_DIR/itd-opms-portal"
npm ci --ignore-scripts
NEXT_PUBLIC_API_URL="$api_url" npm run build

cd "$DEPLOY_DIR/deploy"
pm2 delete ecosystem.uat.config.js 2>/dev/null || true
pm2 start ecosystem.uat.config.js
pm2 save

deadline=\$((SECONDS + $HEALTH_TIMEOUT_SECONDS))
until curl -fsS http://127.0.0.1:8089/api/v1/health >/dev/null; do
  if ((SECONDS >= deadline)); then
    pm2 logs opms-api-uat --lines 40 --nostream || true
    exit 1
  fi
  sleep 3
done

deadline=\$((SECONDS + 60))
until curl -fsS http://127.0.0.1:3000 >/dev/null; do
  if ((SECONDS >= deadline)); then
    pm2 logs opms-portal-uat --lines 40 --nostream || true
    exit 1
  fi
  sleep 3
done

printf 'Deployment %s complete\n' "$deploy_tag"
pm2 status
REMOTE

  if ((SKIP_NGINX == 0)); then
    log "installing Nginx config"
    install_nginx_config
  else
    warn "skipping Nginx config"
  fi

  log "UAT deploy complete"
  printf '\nUAT endpoint:\n'
  printf '  Portal: %s\n' "$(config_value FRONTEND_URL)"
  printf '  API:    %s\n' "$(config_value NEXT_PUBLIC_API_URL)"
  printf '\nServers:\n'
  printf '  App:    %s (%s, NAT %s)\n' "$(config_value UAT_APP_HOSTNAME)" "$(config_value UAT_APP_REAL_IP)" "$(config_value UAT_APP_NAT_IP)"
  printf '  DB:     %s (%s, NAT %s)\n' "$(config_value UAT_DB_HOSTNAME)" "$(config_value UAT_DB_REAL_IP)" "$(config_value UAT_DB_NAT_IP)"
}

cmd_status() {
  ensure_env
  local app
  local db
  local compose
  app="$(app_target)"
  db="$(db_target)"
  compose="$(compose_cmd)"

  log "app status on $(config_value UAT_APP_HOSTNAME)"
  ssh_cmd "$app" "bash -s" <<'REMOTE'
set +e
pm2 status
printf '\nNginx: '
systemctl is-active nginx
printf '\nAPI health:\n'
curl -fsS http://127.0.0.1:8089/api/v1/health || true
printf '\nPortal health:\n'
curl -fsSI http://127.0.0.1:3000 | head -5 || true
REMOTE

  log "infra status on $(config_value UAT_DB_HOSTNAME)"
  ssh_cmd "$db" "cd '$DEPLOY_DIR/deploy' && $compose ps"
}

cmd_logs() {
  ensure_env
  ssh_cmd "$(app_target)" "pm2 logs --lines 100"
}

cmd_backup() {
  ensure_env
  local db
  local compose
  db="$(db_target)"
  compose="$(compose_cmd)"

  log "backing up UAT database on $(config_value UAT_DB_HOSTNAME)"
  ssh_cmd "$db" "bash -s" <<REMOTE
set -euo pipefail
cd "$DEPLOY_DIR/deploy"
timestamp=\$(date +%Y%m%d_%H%M%S)
backup_file="$DEPLOY_DIR/backups/opms_uat_\${timestamp}.sql.gz"
$compose exec -T postgres pg_dump -U "$(config_value DB_USER)" -d "$(config_value DB_NAME)" --clean --if-exists | gzip > "\$backup_file"
du -sh "\$backup_file"
ls -t "$DEPLOY_DIR"/backups/opms_uat_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
REMOTE
}

cmd_rollback() {
  ensure_env
  local app
  app="$(app_target)"

  warn "rolling back API on $(config_value UAT_APP_HOSTNAME)"
  ssh_cmd "$app" "bash -s" <<REMOTE
set -euo pipefail
cd "$DEPLOY_DIR"
if [[ ! -f itd-opms-api/bin/itd-opms-api.rollback ]]; then
  echo "No rollback binary found." >&2
  exit 1
fi
pm2 stop opms-api-uat || true
cp itd-opms-api/bin/itd-opms-api.rollback itd-opms-api/bin/itd-opms-api
pm2 restart opms-api-uat
sleep 3
curl -fsS http://127.0.0.1:8089/api/v1/health >/dev/null
pm2 status
REMOTE
}

main() {
  [[ -f "$INFRA_COMPOSE_FILE" ]] || fail "infra compose file not found: $INFRA_COMPOSE_FILE"

  case "$COMMAND" in
    write-env)
      ensure_env
      log "env file is ready: $ENV_FILE"
      ;;
    setup-db)
      cmd_setup_db
      ;;
    setup-app)
      cmd_setup_app
      ;;
    setup-all)
      cmd_setup_db
      cmd_setup_app
      ;;
    ssl)
      cmd_ssl
      ;;
    deploy)
      cmd_deploy
      ;;
    status)
      cmd_status
      ;;
    logs)
      cmd_logs
      ;;
    backup)
      cmd_backup
      ;;
    rollback)
      cmd_rollback
      ;;
    *)
      fail "unknown command: $COMMAND"
      ;;
  esac
}

main "$@"

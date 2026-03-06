#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# ITD-OPMS Deployment Script — amsop.org (PM2 + Docker Infra)
# ══════════════════════════════════════════════════════════════
#
# Architecture:
#   - Infrastructure (Postgres, Redis, MinIO, NATS) → Docker Compose
#   - Application (Go API, Next.js Portal)          → PM2
#   - Reverse Proxy (Nginx)                         → System package
#   - SSL                                           → Cloudflare Origin Cert
#
# Usage:
#   ./deploy.sh setup    <server>  — First-time server provisioning
#   ./deploy.sh ssl      <server>  — Install Cloudflare Origin Certificate
#   ./deploy.sh deploy   <server>  — Build and deploy application
#   ./deploy.sh migrate  <server>  — Run database migrations
#   ./deploy.sh status   <server>  — Check all service status
#   ./deploy.sh logs     <server>  — Tail PM2 logs
#   ./deploy.sh backup   <server>  — Backup database
#   ./deploy.sh rollback <server>  — Rollback API binary to previous version
#
# ══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ───────────────────────────────────────────
DOMAIN="amsop.org"
DEPLOY_USER="deploy"
DEPLOY_DIR="/opt/opms"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[INFO]${NC} $*"; }

# ── Validation ──────────────────────────────────────────────
if [ $# -lt 2 ]; then
    echo "Usage: $0 <command> <server>"
    echo ""
    echo "Commands:"
    echo "  setup    <server>  — First-time server provisioning"
    echo "  ssl      <server>  — Install Cloudflare Origin Certificate"
    echo "  deploy   <server>  — Build and deploy application"
    echo "  migrate  <server>  — Run database migrations"
    echo "  status   <server>  — Check all service status"
    echo "  logs     <server>  — Tail PM2 logs"
    echo "  backup   <server>  — Backup database"
    echo "  rollback <server>  — Rollback to previous API binary"
    exit 1
fi

COMMAND="$1"
SERVER="$2"
SSH_TARGET="${DEPLOY_USER}@${SERVER}"

ssh_cmd() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SSH_TARGET" "$@"
}

scp_cmd() {
    scp -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$@"
}

# ══════════════════════════════════════════════════════════════
# SETUP — First-time server provisioning
# ══════════════════════════════════════════════════════════════
cmd_setup() {
    log "Setting up server at ${SERVER}..."

    ssh_cmd "sudo bash -s" <<'SETUP_SCRIPT'
set -euo pipefail

# ── System updates ──────────────────────────────
apt-get update && apt-get upgrade -y

apt-get install -y \
    curl wget git unzip htop \
    ufw fail2ban \
    ca-certificates gnupg lsb-release \
    build-essential

# ── Docker (for infrastructure services) ────────
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker deploy
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &>/dev/null; then
    apt-get install -y docker-compose-plugin
fi

# ── Go (for building API) ──────────────────────
if ! command -v /usr/local/go/bin/go &>/dev/null; then
    echo "Installing Go..."
    GO_LATEST=$(curl -s 'https://go.dev/VERSION?m=text' | head -1)
    wget -q "https://go.dev/dl/${GO_LATEST}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    cat > /etc/profile.d/golang.sh <<'EOF'
export PATH=$PATH:/usr/local/go/bin
EOF
fi
export PATH=$PATH:/usr/local/go/bin

# ── Node.js 22 (for portal) ────────────────────
if ! command -v node &>/dev/null || ! node --version | grep -q "v22"; then
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# ── PM2 ─────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
fi

# ── Nginx ───────────────────────────────────────
if ! command -v nginx &>/dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
fi

# ── Firewall ────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Fail2ban ────────────────────────────────────
systemctl enable fail2ban
systemctl start fail2ban

# ── Directory structure ─────────────────────────
mkdir -p /opt/opms/{itd-opms-api/bin,itd-opms-portal,deploy,backups,ssl}
chown -R deploy:deploy /opt/opms

# ── Kernel tuning ───────────────────────────────
cat > /etc/sysctl.d/99-opms.conf <<EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
vm.overcommit_memory = 1
EOF
sysctl --system

echo ""
echo "════════════════════════════════════"
echo " Server setup complete!"
echo "════════════════════════════════════"
echo " Go:     $(/usr/local/go/bin/go version 2>/dev/null || echo 'not found')"
echo " Node:   $(node --version 2>/dev/null || echo 'not found')"
echo " PM2:    $(pm2 --version 2>/dev/null || echo 'not found')"
echo " Docker: $(docker --version 2>/dev/null || echo 'not found')"
echo " Nginx:  $(nginx -v 2>&1 | head -1)"
echo "════════════════════════════════════"
SETUP_SCRIPT

    log "Server provisioned successfully."
    info ""
    info "Next steps:"
    info "  1. Edit deploy/ecosystem.prod.config.js with real secrets"
    info "  2. Run: ./deploy.sh ssl     ${SERVER}"
    info "  3. Run: ./deploy.sh deploy  ${SERVER}"
    info "  4. Run: ./deploy.sh migrate ${SERVER}"
}

# ══════════════════════════════════════════════════════════════
# SSL — Install Cloudflare Origin Certificate
# ══════════════════════════════════════════════════════════════
cmd_ssl() {
    log "Setting up SSL for ${DOMAIN}..."

    echo ""
    info "Since ${DOMAIN} is on Cloudflare, use a Cloudflare Origin Certificate."
    info ""
    info "Steps in Cloudflare Dashboard:"
    info "  1. Go to ${DOMAIN} → SSL/TLS → Origin Server"
    info "  2. Click 'Create Certificate'"
    info "  3. Select: RSA (2048), Hostnames: *.${DOMAIN}, ${DOMAIN}"
    info "  4. Validity: 15 years"
    info "  5. Copy the Origin Certificate (PEM) and Private Key"
    info "  6. Set SSL/TLS encryption mode to 'Full (strict)'"
    info ""
    read -rp "Have you created the Origin Certificate? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        error "Aborted. Create the certificate first."
        exit 1
    fi

    echo ""
    info "Paste the Origin Certificate PEM (end with Ctrl+D on empty line):"
    CERT_PEM=$(cat)

    echo ""
    info "Paste the Private Key PEM (end with Ctrl+D on empty line):"
    KEY_PEM=$(cat)

    ssh_cmd "sudo bash -s" <<CERT_SCRIPT
set -euo pipefail
mkdir -p /opt/opms/ssl
cat > /opt/opms/ssl/${DOMAIN}.pem <<'CERTEOF'
${CERT_PEM}
CERTEOF
cat > /opt/opms/ssl/${DOMAIN}.key <<'KEYEOF'
${KEY_PEM}
KEYEOF
chmod 600 /opt/opms/ssl/${DOMAIN}.key
chmod 644 /opt/opms/ssl/${DOMAIN}.pem
chown -R deploy:deploy /opt/opms/ssl
echo "SSL certificates installed at /opt/opms/ssl/"
CERT_SCRIPT

    # Install Nginx config
    log "Installing Nginx configuration..."
    scp_cmd "${REPO_ROOT}/deploy/nginx/nginx.conf" "${SSH_TARGET}:/tmp/nginx.conf"
    scp_cmd "${REPO_ROOT}/deploy/nginx/conf.d/amsop.conf" "${SSH_TARGET}:/tmp/amsop.conf"

    ssh_cmd "sudo bash -s" <<'NGINX_SCRIPT'
set -euo pipefail

# Update cert paths to /opt/opms/ssl
sed -i 's|/etc/letsencrypt/live/amsop.org/fullchain.pem|/opt/opms/ssl/amsop.org.pem|g' /tmp/amsop.conf
sed -i 's|/etc/letsencrypt/live/amsop.org/privkey.pem|/opt/opms/ssl/amsop.org.key|g' /tmp/amsop.conf

# Remove certbot ACME location (not needed with Cloudflare Origin)
sed -i '/location \/\.well-known\/acme-challenge\//,/}/d' /tmp/amsop.conf

# Remove certbot volume references
sed -i '/certbot/d' /tmp/amsop.conf

cp /tmp/nginx.conf /etc/nginx/nginx.conf
mkdir -p /etc/nginx/conf.d
cp /tmp/amsop.conf /etc/nginx/conf.d/amsop.conf

# Remove default site
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
echo "Nginx configured and reloaded."
NGINX_SCRIPT

    log "SSL and Nginx configured for ${DOMAIN}."
    info ""
    info "Cloudflare DNS records needed:"
    info "  A     ${DOMAIN}           → ${SERVER}  (Proxied orange cloud)"
    info "  A     www.${DOMAIN}       → ${SERVER}  (Proxied orange cloud)"
    info "  A     monitor.${DOMAIN}   → ${SERVER}  (Proxied orange cloud)"
    info ""
    info "  SSL/TLS mode: Full (strict)"
}

# ══════════════════════════════════════════════════════════════
# DEPLOY — Build and deploy application via PM2
# ══════════════════════════════════════════════════════════════
cmd_deploy() {
    log "Deploying to ${SERVER}..."

    DEPLOY_TAG=$(date +%Y%m%d_%H%M%S)
    info "Deployment tag: ${DEPLOY_TAG}"

    # ── Step 1: Cross-compile API binary locally ──
    log "Building Go API binary (linux/amd64)..."
    cd "${REPO_ROOT}/itd-opms-api"
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/itd-opms-api ./cmd/api
    info "API binary: $(ls -lh bin/itd-opms-api | awk '{print $5}')"

    # ── Step 2: Sync files to server ──────────────
    log "Syncing API binary and migrations..."
    rsync -az --progress \
        "${REPO_ROOT}/itd-opms-api/bin/itd-opms-api" \
        "${SSH_TARGET}:${DEPLOY_DIR}/itd-opms-api/bin/itd-opms-api.new"

    rsync -az --delete \
        "${REPO_ROOT}/itd-opms-api/migrations/" \
        "${SSH_TARGET}:${DEPLOY_DIR}/itd-opms-api/migrations/"

    log "Syncing portal source..."
    rsync -az --delete \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.env' \
        --exclude='.env.local' \
        "${REPO_ROOT}/itd-opms-portal/" \
        "${SSH_TARGET}:${DEPLOY_DIR}/itd-opms-portal/"

    log "Syncing deploy configs..."
    rsync -az \
        "${REPO_ROOT}/deploy/ecosystem.prod.config.js" \
        "${REPO_ROOT}/deploy/docker-compose.infra.yml" \
        "${SSH_TARGET}:${DEPLOY_DIR}/deploy/"

    # ── Step 3: Build portal + restart on server ──
    log "Building and starting services on server..."
    ssh_cmd "bash -s" <<DEPLOY_SCRIPT
set -euo pipefail
export PATH=\$PATH:/usr/local/go/bin

cd ${DEPLOY_DIR}

# ── Backup current API binary for rollback ───
if [ -f itd-opms-api/bin/itd-opms-api ]; then
    cp itd-opms-api/bin/itd-opms-api itd-opms-api/bin/itd-opms-api.rollback
    echo "Previous binary saved for rollback."
fi

# ── Swap in new API binary ───────────────────
mv itd-opms-api/bin/itd-opms-api.new itd-opms-api/bin/itd-opms-api
chmod +x itd-opms-api/bin/itd-opms-api

# ── Start infrastructure (Docker) ────────────
echo ""
echo "Starting infrastructure services..."
cd ${DEPLOY_DIR}/deploy
docker compose -f docker-compose.infra.yml up -d

echo "Waiting for infrastructure to be healthy..."
for i in \$(seq 1 30); do
    if docker compose -f docker-compose.infra.yml ps | grep -q "healthy"; then
        echo "Infrastructure is healthy."
        break
    fi
    sleep 1
done
docker compose -f docker-compose.infra.yml ps --format "table {{.Name}}\t{{.Status}}"

# ── Build Next.js portal ─────────────────────
echo ""
echo "Installing portal dependencies..."
cd ${DEPLOY_DIR}/itd-opms-portal
npm ci --ignore-scripts

echo "Building portal (production)..."
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api/v1 npm run build

# ── Start/Restart PM2 ────────────────────────
echo ""
echo "Starting PM2 services..."
cd ${DEPLOY_DIR}/deploy
pm2 delete ecosystem.prod.config.js 2>/dev/null || true
pm2 start ecosystem.prod.config.js
pm2 save

# ── Health checks ────────────────────────────
echo ""
echo "Checking API health..."
for i in \$(seq 1 30); do
    if curl -sf http://localhost:8089/api/v1/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    if [ \$i -eq 30 ]; then
        echo "WARNING: API health check failed after 30s"
        pm2 logs opms-api --lines 20 --nostream
        exit 1
    fi
    sleep 1
done

echo "Checking portal..."
for i in \$(seq 1 15); do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo "Portal is healthy!"
        break
    fi
    if [ \$i -eq 15 ]; then
        echo "WARNING: Portal not responding after 15s"
    fi
    sleep 1
done

echo ""
echo "════════════════════════════════════════"
echo " Deployment ${DEPLOY_TAG} complete!"
echo "════════════════════════════════════════"
pm2 status
DEPLOY_SCRIPT

    log "Deployment complete!"
    info "Site live at: https://${DOMAIN}"
}

# ══════════════════════════════════════════════════════════════
# MIGRATE — Run database migrations
# ══════════════════════════════════════════════════════════════
cmd_migrate() {
    log "Running migrations on ${SERVER}..."

    ssh_cmd "bash -s" <<'MIGRATE_SCRIPT'
set -euo pipefail
cd /opt/opms/deploy

DB_CONTAINER=$(docker compose -f docker-compose.infra.yml ps -q postgres)
if [ -z "$DB_CONTAINER" ]; then
    echo "ERROR: PostgreSQL container not running. Start infra first."
    exit 1
fi

echo "Applying migrations..."
for migration in /opt/opms/itd-opms-api/migrations/*.sql; do
    BASENAME=$(basename "$migration")
    echo "  → ${BASENAME}"
    docker cp "$migration" "${DB_CONTAINER}:/tmp/${BASENAME}"
    docker exec "${DB_CONTAINER}" psql -U opms -d itd_opms -f "/tmp/${BASENAME}" 2>&1 | \
        grep -vE "^$|^SET|^CREATE|^ALTER|NOTICE" || true
done

echo "All migrations applied."
MIGRATE_SCRIPT

    log "Migrations complete."
}

# ══════════════════════════════════════════════════════════════
# STATUS — Check all services
# ══════════════════════════════════════════════════════════════
cmd_status() {
    log "Checking status on ${SERVER}..."
    ssh_cmd "bash -s" <<'STATUS_SCRIPT'
cd /opt/opms/deploy

echo "═══════════════════════════════════"
echo " PM2 Services (API + Portal)"
echo "═══════════════════════════════════"
pm2 status

echo ""
echo "═══════════════════════════════════"
echo " Docker Infrastructure"
echo "═══════════════════════════════════"
docker compose -f docker-compose.infra.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "═══════════════════════════════════"
echo " Nginx"
echo "═══════════════════════════════════"
systemctl is-active nginx && echo "Nginx: running" || echo "Nginx: STOPPED"

echo ""
echo "═══════════════════════════════════"
echo " API Health"
echo "═══════════════════════════════════"
curl -s http://localhost:8089/api/v1/health 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "API unreachable"

echo ""
echo "═══════════════════════════════════"
echo " Disk Usage"
echo "═══════════════════════════════════"
df -h / | tail -1
STATUS_SCRIPT
}

# ══════════════════════════════════════════════════════════════
# LOGS — Tail PM2 logs
# ══════════════════════════════════════════════════════════════
cmd_logs() {
    log "Tailing PM2 logs from ${SERVER}..."
    ssh_cmd "pm2 logs --lines 100"
}

# ══════════════════════════════════════════════════════════════
# BACKUP — Backup database
# ══════════════════════════════════════════════════════════════
cmd_backup() {
    log "Backing up database on ${SERVER}..."
    ssh_cmd "bash -s" <<'BACKUP_SCRIPT'
set -euo pipefail
cd /opt/opms/deploy

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/opt/opms/backups/opms_${TIMESTAMP}.sql.gz"

echo "Creating backup: ${BACKUP_FILE}"
docker compose -f docker-compose.infra.yml exec -T postgres \
    pg_dump -U opms -d itd_opms --clean --if-exists | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Keep last 30 backups
ls -t /opt/opms/backups/opms_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
echo "Cleaned old backups (keeping last 30)."
BACKUP_SCRIPT

    log "Backup complete."
}

# ══════════════════════════════════════════════════════════════
# ROLLBACK — Rollback to previous API binary
# ══════════════════════════════════════════════════════════════
cmd_rollback() {
    warn "Rolling back API to previous version on ${SERVER}..."
    ssh_cmd "bash -s" <<'ROLLBACK_SCRIPT'
set -euo pipefail
cd /opt/opms

if [ ! -f itd-opms-api/bin/itd-opms-api.rollback ]; then
    echo "ERROR: No rollback binary found."
    exit 1
fi

echo "Stopping API..."
pm2 stop opms-api

echo "Restoring previous binary..."
cp itd-opms-api/bin/itd-opms-api.rollback itd-opms-api/bin/itd-opms-api

echo "Starting API..."
pm2 restart opms-api

sleep 3
if curl -sf http://localhost:8089/api/v1/health > /dev/null 2>&1; then
    echo "Rollback successful — API is healthy."
else
    echo "WARNING: API health check failed after rollback."
    pm2 logs opms-api --lines 20 --nostream
fi
ROLLBACK_SCRIPT

    log "Rollback complete."
}

# ── Command dispatch ────────────────────────────────────────
case "$COMMAND" in
    setup)    cmd_setup ;;
    ssl)      cmd_ssl ;;
    deploy)   cmd_deploy ;;
    migrate)  cmd_migrate ;;
    status)   cmd_status ;;
    logs)     cmd_logs ;;
    backup)   cmd_backup ;;
    rollback) cmd_rollback ;;
    *)
        error "Unknown command: $COMMAND"
        echo "Valid commands: setup, ssl, deploy, migrate, status, logs, backup, rollback"
        exit 1
        ;;
esac

// ══════════════════════════════════════════════
// ITD-OPMS Production PM2 Config — amsop.org
// ══════════════════════════════════════════════
// Usage:
//   pm2 start ecosystem.prod.config.js
//   pm2 restart ecosystem.prod.config.js
//   pm2 stop ecosystem.prod.config.js
//   pm2 logs
// ══════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'opms-api',
      cwd: '/opt/opms/itd-opms-api',
      script: 'bin/itd-opms-api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        SERVER_HOST: '0.0.0.0',
        SERVER_PORT: 8089,
        SERVER_ENV: 'production',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'opms',
        DB_PASSWORD: 'CHANGE_ME',
        DB_NAME: 'itd_opms',
        DB_SSLMODE: 'disable',
        DB_MAX_CONNS: 50,
        DB_MIN_CONNS: 10,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'CHANGE_ME',
        REDIS_DB: 0,
        MINIO_ENDPOINT: 'localhost:9000',
        MINIO_ACCESS_KEY: 'CHANGE_ME',
        MINIO_SECRET_KEY: 'CHANGE_ME',
        MINIO_USE_SSL: false,
        MINIO_BUCKET_EVIDENCE: 'evidence-vault',
        MINIO_BUCKET_ATTACHMENTS: 'attachments',
        NATS_URL: 'nats://localhost:4222',
        JWT_SECRET: 'CHANGE_ME_MIN_64_CHARS',
        JWT_EXPIRY: '30m',
        JWT_REFRESH_EXPIRY: '168h',
        ENTRA_ENABLED: false,
        ENTRA_TENANT_ID: '',
        ENTRA_CLIENT_ID: '',
        ENTRA_CLIENT_SECRET: '',
        ENTRA_REDIRECT_URI: 'https://amsop.org/auth/callback',
        GRAPH_SERVICE_ACCOUNT_ID: '',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'localhost:4317',
        OTEL_SERVICE_NAME: 'itd-opms-api',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
      },
    },
    {
      name: 'opms-portal',
      cwd: '/opt/opms/itd-opms-portal',
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
        NEXT_PUBLIC_API_URL: 'https://amsop.org/api/v1',
      },
    },
  ],
};

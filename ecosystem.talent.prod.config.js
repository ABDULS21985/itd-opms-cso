module.exports = {
  apps: [
    {
      name: 'talent-api',
      cwd: './apps/talent-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 4002,
      },
    },
    {
      name: 'talent-portal',
      cwd: './apps/talent-portal',
      script: '.next/standalone/apps/talent-portal/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};

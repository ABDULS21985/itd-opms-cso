module.exports = {
  apps: [
    {
      name: 'talent-api',
      cwd: './apps/talent-api',
      script: 'node_modules/.bin/nest',
      args: 'start --watch',
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4002,
      },
    },
    {
      name: 'talent-portal',
      cwd: './apps/talent-portal',
      script: 'node_modules/.bin/next',
      args: 'dev -p 3003',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
      },
    },
  ],
};

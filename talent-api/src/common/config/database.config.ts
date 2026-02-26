import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  username: process.env.DB_USER || 'talent_portal',
  password: process.env.DB_PASSWORD || 'talent_portal',
  database: process.env.DB_NAME || 'talent_portal_db',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.DB_LOGGING === 'true',
}));

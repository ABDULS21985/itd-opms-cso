import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load the correct .env file:
// 1. If TALENT_ENV_FILE is set, use that
// 2. Try .env.talent.uat at the monorepo root
// 3. Fall back to default .env
const monorepoRoot = path.resolve(__dirname, '../../../../');
const envFile =
  process.env.TALENT_ENV_FILE ||
  [
    path.join(monorepoRoot, '.env.talent.uat'),
    path.join(monorepoRoot, '.env'),
  ].find((f) => fs.existsSync(f));

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// Detect if running from compiled dist/ or source src/
const isCompiled = __filename.endsWith('.js');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  username: process.env.DB_USER || 'talent_portal',
  password: process.env.DB_PASSWORD || 'talent_portal',
  database: process.env.DB_NAME || 'talent_portal_db',
  entities: isCompiled
    ? [path.join(__dirname, '..', '**', '*.entity.js')]
    : ['src/**/*.entity.ts'],
  migrations: isCompiled
    ? [path.join(__dirname, 'migrations', '*.js')]
    : ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

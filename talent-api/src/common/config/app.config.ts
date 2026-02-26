import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'talent-api',
  port: parseInt(process.env.PORT || '4002', 10),
  apiPrefix: 'api/v1',
  corsWhitelist: process.env.CORS_WHITELIST || '',
}));

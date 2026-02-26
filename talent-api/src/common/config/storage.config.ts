import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.B2_ENDPOINT || '',
  region: process.env.B2_REGION || 'us-east-005',
  bucket: process.env.B2_BUCKET || '',
  keyId: process.env.B2_KEY_ID || '',
  applicationKey: process.env.B2_APP_KEY || process.env.B2_APPLICATION_KEY || '',
  prefix: process.env.TALENT_STORAGE_PREFIX || 'talent-portal/',
}));

import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'development-secret',
  issuer: process.env.JWT_ISSUER || 'digiweb',
  audience: process.env.JWT_AUDIENCE || 'digiweb-api',
}));

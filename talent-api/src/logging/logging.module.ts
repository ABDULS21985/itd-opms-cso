import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

/**
 * Patterns used to identify PII fields for masking in log output.
 * These field names will have their values replaced with '[REDACTED]'.
 */
const PII_FIELDS = [
  'email',
  'contactEmail',
  'actorEmail',
  'phone',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'ipAddress',
  'ip_address',
];

/**
 * Recursively redact PII fields from an object.
 */
function redactPiiPaths(): string[] {
  const paths: string[] = [];
  for (const field of PII_FIELDS) {
    paths.push(field);
    paths.push(`req.headers.${field}`);
    paths.push(`req.body.${field}`);
    paths.push(`res.body.${field}`);
    // Nested object patterns
    paths.push(`*.${field}`);
  }
  // Always redact authorization headers
  paths.push('req.headers.authorization');
  paths.push('req.headers.cookie');
  return paths;
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV', 'development') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            // Redact PII fields
            redact: {
              paths: redactPiiPaths(),
              censor: '[REDACTED]',
            },

            // Custom serializers for request/response
            serializers: {
              req(req: any) {
                return {
                  id: req.id,
                  method: req.method,
                  url: req.url,
                  query: req.query,
                  params: req.params,
                  // Omit body in production to avoid logging sensitive data
                  ...(isProduction ? {} : { body: req.raw?.body }),
                  headers: {
                    'user-agent': req.headers?.['user-agent'],
                    'content-type': req.headers?.['content-type'],
                    'x-correlation-id': req.headers?.['x-correlation-id'],
                  },
                };
              },
              res(res: any) {
                return {
                  statusCode: res.statusCode,
                };
              },
            },

            // Custom log level based on status code
            customLogLevel(req: any, res: any, err: any) {
              if (res.statusCode >= 500 || err) {
                return 'error';
              }
              if (res.statusCode >= 400) {
                return 'warn';
              }
              return 'info';
            },

            // Custom message format
            customSuccessMessage(req: any, res: any) {
              return `${req.method} ${req.url} ${res.statusCode}`;
            },

            customErrorMessage(req: any, res: any) {
              return `${req.method} ${req.url} ${res.statusCode} ERROR`;
            },

            // Add correlation ID to every log line
            customProps(req: any) {
              return {
                correlationId:
                  req.headers?.['x-correlation-id'] || req.id || undefined,
              };
            },

            // Transport configuration
            transport: isProduction
              ? undefined // Use default JSON output in production
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppLoggingModule {}

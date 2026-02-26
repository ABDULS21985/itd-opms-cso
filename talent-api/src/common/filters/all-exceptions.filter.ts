import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Include validation error details for 400 responses
    let errors: string[] | undefined;
    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      if (res?.message && Array.isArray(res.message)) {
        errors = res.message;
        message = res.message;
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (statusCode === 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode} - ${JSON.stringify(errors || message)}`,
      );
    }

    response.status(statusCode).json({
      status: 'error',
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

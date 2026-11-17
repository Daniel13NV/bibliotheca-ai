import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from './domain-error';

const STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  RULE_VIOLATION: 422,
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  UNAVAILABLE: 503,
};

/** Traduce errores de dominio y de Nest a respuestas JSON consistentes. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      const statusCode = STATUS_BY_CODE[exception.code] ?? 400;
      res.status(statusCode).json({
        statusCode,
        error: exception.code,
        message: exception.message,
        details: exception.details,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        res.status(statusCode).json({ statusCode, message: body });
        return;
      }
      const payload = body as Record<string, unknown>;
      const message = Array.isArray(payload.message) ? payload.message.join('. ') : payload.message;
      res.status(statusCode).json({ ...payload, statusCode, message });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ statusCode: 500, error: 'INTERNAL', message: 'Error interno del servidor' });
  }
}

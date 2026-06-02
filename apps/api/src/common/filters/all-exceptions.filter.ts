import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Catches everything and returns one consistent error shape:
 *   { statusCode, error, message, path, timestamp }
 *
 * - HttpException (incl. ValidationPipe's BadRequestException) keeps its status,
 *   message and error label.
 * - Prisma known request errors are mapped to sensible HTTP codes
 *   (P2002 unique → 409, P2025 not found → 404) instead of leaking as 500s.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else {
        const body = resp as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? statusText(status);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, error, message } = mapPrismaError(exception));
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(payload);
  }
}

function mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
  status: number;
  error: string;
  message: string;
} {
  switch (e.code) {
    case 'P2002': {
      const target = (e.meta?.target as string[] | string | undefined) ?? [];
      const fields = Array.isArray(target) ? target.join(', ') : target;
      return {
        status: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: fields
          ? `A record with this ${fields} already exists`
          : 'Unique constraint violation',
      };
    }
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message:
          (e.meta?.cause as string | undefined) ?? 'Record not found',
      };
    default:
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Database error (${e.code})`,
      };
  }
}

function statusText(status: number): string {
  return HttpStatus[status] ? toTitle(HttpStatus[status] as string) : 'Error';
}

function toTitle(constName: string): string {
  return constName
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

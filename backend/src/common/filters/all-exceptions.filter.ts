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
import { getRequestContext } from '../context/request-context';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  423: 'Locked',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/** Normalises every error into `{ statusCode, error, message, details?, requestId }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = getRequestContext()?.requestId ?? (req.id ? String(req.id) : undefined);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as { message?: unknown; details?: unknown };
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          details = b.message;
        } else if (typeof b.message === 'string') {
          message = b.message;
        }
        if (b.details !== undefined) details = b.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        message = target ? `A record with this ${target} already exists.` : 'Duplicate value.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found.';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record does not exist.';
      } else {
        this.logger.error({ err: exception, requestId }, 'Unhandled Prisma error');
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request data.';
    } else {
      this.logger.error({ err: exception, requestId }, 'Unhandled error');
    }

    const payload: ErrorBody = {
      statusCode: status,
      error: STATUS_TEXT[status] ?? 'Error',
      message,
      ...(details !== undefined ? { details } : {}),
      requestId,
    };
    if (!res.headersSent) res.status(status).json(payload);
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId =
      (req as unknown as { id?: string }).id ??
      (typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID());
    res.setHeader('X-Request-Id', requestId);
    requestContext.run(
      {
        requestId: String(requestId),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 300),
      },
      next,
    );
  }
}

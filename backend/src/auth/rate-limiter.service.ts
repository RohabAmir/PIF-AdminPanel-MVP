import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';

/**
 * In-memory sliding-window limiter keyed by action + email. Complements the per-IP
 * ThrottlerGuard so a distributed attack on one account is still slowed down.
 */
@Injectable()
export class EmailRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: AppConfig) {}

  consume(action: string, email: string, windowMs = 60_000): void {
    const limit = this.config.get('AUTH_RATE_LIMIT');
    const key = `${action}:${email.toLowerCase()}`;
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      throw new HttpException(
        {
          message: 'Too many attempts. Please wait a minute and try again.',
          details: { retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now, windowMs);
  }

  private prune(now: number, windowMs: number): void {
    for (const [k, v] of this.hits) {
      if (v.every((t) => now - t >= windowMs)) this.hits.delete(k);
    }
  }
}

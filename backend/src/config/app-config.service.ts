import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from './env.validation';

/** Typed accessor over validated environment variables. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get<K extends keyof AppEnv>(key: K): AppEnv[K] {
    return this.config.get(key, { infer: true });
  }

  get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
}

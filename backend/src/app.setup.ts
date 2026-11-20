import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfig } from './config/app-config.service';

function flattenErrors(
  errors: ValidationError[],
  parent = '',
): { field: string; errors: string[] }[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, errors: Object.values(e.constraints) }] : [];
    return [...own, ...flattenErrors(e.children ?? [], field)];
  });
}

/** Shared bootstrap used by main.ts and the e2e test-suite so both run the exact same app. */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get(AppConfig);
  app.set('trust proxy', config.get('TRUST_PROXY'));
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(cookieParser());
  // API responses depend on the caller (session cookie or X-API-Key), so CDNs in front of the API
  // (Vercel's proxy, Cloudflare at Render) must never share them. Routes may opt into browser caching.
  app.use(
    '/api',
    (
      _req: unknown,
      res: { setHeader(k: string, v: string): void; vary(f: string): void },
      next: () => void,
    ) => {
      res.setHeader('Cache-Control', 'no-store');
      res.vary('X-API-Key');
      next();
    },
  );

  const allowList = config.corsOrigins;
  app.enableCors((req: { url?: string; headers: { origin?: string } }, cb) => {
    // The public content API is read-only and API-key protected: open to any origin, no cookies.
    if (req.url?.startsWith('/api/public/')) {
      return cb(null, { origin: true, credentials: false, maxAge: 600 });
    }
    const origin = req.headers.origin;
    return cb(null, {
      origin: !origin || allowList.includes(origin),
      credentials: true,
      exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
      maxAge: 600,
    });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ message: 'Validation failed', details: flattenErrors(errors) }),
    }),
  );

  if (config.get('MEDIA_DRIVER') === 'local') {
    const dir = resolve(config.get('UPLOAD_DIR'));
    mkdirSync(dir, { recursive: true });
    app.useStaticAssets(dir, {
      prefix: '/uploads/',
      maxAge: '7d',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    });
  }

  const swagger = new DocumentBuilder()
    .setTitle('PIF Admin Panel API')
    .setDescription(
      'Multi-tenant CMS admin API. Authenticate via /auth/login → /auth/verify-otp, then send the access token as a Bearer token. CMS endpoints require the `X-Site-Id` header. Public content endpoints use `X-API-Key`.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .addGlobalParameters()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger), {
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();
  return app;
}

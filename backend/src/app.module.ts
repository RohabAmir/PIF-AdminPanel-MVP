import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { AppConfigModule } from './config/config.module';
import { AppConfig } from './config/app-config.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { MetaController } from './meta/meta.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PasswordChangeGuard } from './common/guards/password-change.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { SiteGuard } from './common/guards/site.guard';
import { RequestContextMiddleware } from './common/context/request-context.middleware';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SitesModule } from './sites/sites.module';
import { ProfileModule } from './profile/profile.module';
import { CmsModule } from './cms/cms.module';
import { PublicApiModule } from './public-api/public-api.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivityLogsModule } from './audit/activity-logs.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          genReqId: (req: IncomingMessage) => {
            const h = req.headers['x-request-id'];
            return typeof h === 'string' && /^[\w-]{8,64}$/.test(h) ? h : randomUUID();
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
          autoLogging: { ignore: (req: IncomingMessage) => req.url === '/api/health' },
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: config.get('GLOBAL_RATE_LIMIT') }],
      }),
    }),
    PrismaModule,
    AuditModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    SitesModule,
    ProfileModule,
    CmsModule,
    PublicApiModule,
    DashboardModule,
    ActivityLogsModule,
  ],
  controllers: [MetaController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PasswordChangeGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: SiteGuard },
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

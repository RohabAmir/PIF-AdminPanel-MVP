import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role, Site } from '@prisma/client';
import type { Permission } from '../permissions';
import type { AuthedRequest, AuthUser } from '../types';

export const IS_PUBLIC = 'isPublic';
export const PERMISSIONS = 'permissions';
export const ROLES = 'roles';
export const SITE_SCOPED = 'siteScoped';
export const ALLOW_PASSWORD_CHANGE = 'allowDuringPasswordChange';
export const AUDIT = 'audit';

/** Skip JWT authentication (login, public API, health…). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Require ALL of the given permissions. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS, permissions);

/** Restrict to specific roles (prefer RequirePermission). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Resolve the active website from the `X-Site-Id` header and enforce site access. */
export const SiteScoped = () => SetMetadata(SITE_SCOPED, true);

/** Endpoint stays reachable while the user must change their password. */
export const AllowDuringPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE, true);

export interface AuditMeta {
  action: string;
  entity?: string;
}

/** Record an activity-log entry after the handler succeeds. */
export const Audit = (action: string, entity?: string) =>
  SetMetadata(AUDIT, { action, entity } satisfies AuditMeta);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

export const CurrentSite = createParamDecorator((_data: unknown, ctx: ExecutionContext): Site => {
  const site = ctx.switchToHttp().getRequest<AuthedRequest>().site;
  if (!site) throw new Error('CurrentSite used on a route without @SiteScoped()');
  return site;
});

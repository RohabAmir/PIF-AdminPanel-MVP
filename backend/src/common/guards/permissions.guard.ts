import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { IS_PUBLIC, PERMISSIONS, ROLES } from '../decorators';
import { hasPermission, Permission } from '../permissions';
import type { AuthedRequest } from '../types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const { user } = context.switchToHttp().getRequest<AuthedRequest>();
    if (!user) return false;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    // Handler-level permissions are combined with class-level ones.
    const required = [
      ...(this.reflector.get<Permission[] | undefined>(PERMISSIONS, context.getClass()) ?? []),
      ...(this.reflector.get<Permission[] | undefined>(PERMISSIONS, context.getHandler()) ?? []),
    ];
    const missing = required.filter((p) => !hasPermission(user.role, p));
    if (missing.length) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}

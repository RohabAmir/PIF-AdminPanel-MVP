import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE, IS_PUBLIC } from '../decorators';
import type { AuthedRequest } from '../types';

/** While `mustChangePassword` is set, only a handful of auth endpoints are reachable. */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE, targets)) return true;
    const { user } = context.switchToHttp().getRequest<AuthedRequest>();
    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        message: 'You must set a new password before continuing.',
        details: { code: 'PASSWORD_CHANGE_REQUIRED' },
      });
    }
    return true;
  }
}

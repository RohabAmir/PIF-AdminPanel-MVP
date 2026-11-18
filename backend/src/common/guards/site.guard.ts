import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../context/request-context';
import { IS_PUBLIC, SITE_SCOPED } from '../decorators';
import type { AuthedRequest } from '../types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the active website from `X-Site-Id` and verifies the caller may access it.
 * Super Admins can access every site; everyone else only their assigned, active sites.
 */
@Injectable()
export class SiteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!this.reflector.getAllAndOverride<boolean>(SITE_SCOPED, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['x-site-id'];
    const siteId = Array.isArray(header) ? header[0] : header;
    if (!siteId)
      throw new BadRequestException('Select a website first (X-Site-Id header missing).');
    if (!UUID.test(siteId)) throw new BadRequestException('Invalid website id.');

    const isSuper = req.user.role === Role.SUPER_ADMIN;
    if (!isSuper && !req.user.siteIds.includes(siteId)) {
      throw new ForbiddenException('You do not have access to this website.');
    }
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      if (isSuper) throw new NotFoundException('Website not found.');
      throw new ForbiddenException('You do not have access to this website.');
    }
    if (!site.isActive && !isSuper) {
      throw new ForbiddenException('This website is currently inactive.');
    }
    req.site = site;
    const store = getRequestContext();
    if (store) store.site = { id: site.id, name: site.name };
    return true;
  }
}

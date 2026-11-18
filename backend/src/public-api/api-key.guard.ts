import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/context/request-context';
import { sha256 } from '../common/utils/crypto';
import type { AuthedRequest } from '../common/types';

/** Resolves the tenant from the `X-API-Key` header (only the SHA-256 hash is stored). */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['x-api-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key || !/^pif_[a-z0-9]{8}_[\w-]{20,}$/i.test(key)) {
      throw new UnauthorizedException('A valid X-API-Key header is required.');
    }
    const site = await this.prisma.site.findUnique({ where: { apiKeyHash: sha256(key) } });
    if (!site || !site.isActive) throw new UnauthorizedException('Invalid or inactive API key.');
    req.site = site;
    const ctx = getRequestContext();
    if (ctx) ctx.site = { id: site.id, name: site.name };
    return true;
  }
}

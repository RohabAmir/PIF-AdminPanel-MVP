import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/context/request-context';
import type { AuthUser } from '../../common/types';
import type { AccessPayload } from '../token.service';

/**
 * Validates the Bearer access token and re-loads the user on every request, so
 * deactivation, role changes and "sign out everywhere" take effect immediately.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessPayload): Promise<AuthUser> {
    const expired = () =>
      new UnauthorizedException('Your session has expired. Please sign in again.');
    if (payload.typ !== 'access') throw expired();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { sites: { select: { siteId: true } } },
    });
    if (!user || user.tokenVersion !== payload.tv) throw expired();
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Your account has been deactivated.');
    }
    const ctx = getRequestContext();
    if (ctx) ctx.actor = { id: user.id, name: user.name, email: user.email, role: user.role };
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      tokenVersion: user.tokenVersion,
      siteIds: user.sites.map((s) => s.siteId),
    };
  }
}

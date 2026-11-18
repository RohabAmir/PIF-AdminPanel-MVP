import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import type { CookieOptions, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/context/request-context';
import { randomToken, sha256 } from '../common/utils/crypto';
import { AuditService } from '../audit/audit.service';

export const REFRESH_COOKIE = 'pif_rt';

export interface AccessPayload {
  sub: string;
  role: string;
  tv: number;
  typ: 'access';
}

export type RevokeReason =
  | 'rotated'
  | 'logout'
  | 'reuse'
  | 'password_change'
  | 'password_reset'
  | 'deactivated'
  | 'logout_all'
  | 'deleted';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  signAccess(user: { id: string; role: string; tokenVersion: number }) {
    const ttl = this.config.get('JWT_ACCESS_TTL');
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, tv: user.tokenVersion, typ: 'access' } satisfies AccessPayload,
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: ttl as never },
    );
    const decoded = this.jwt.decode<{ exp: number }>(accessToken);
    return { accessToken, expiresAt: new Date(decoded.exp * 1000).toISOString() };
  }

  /** Issues a refresh token. Passing a familyId continues an existing rotation chain. */
  async issueRefresh(userId: string, familyId: string = randomUUID()): Promise<string> {
    const raw = randomToken(48);
    const ctx = getRequestContext();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS') * 86_400_000),
        userAgent: ctx?.userAgent,
        ip: ctx?.ip,
      },
    });
    return raw;
  }

  /**
   * Rotates a refresh token. Presenting an already-rotated token outside the grace window
   * is treated as theft: the whole token family is revoked.
   */
  async rotate(raw: string): Promise<{ userId: string; refreshToken: string }> {
    const invalid = () => new UnauthorizedException('Your session has expired. Please sign in again.');
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!token) throw invalid();

    if (token.revokedAt) {
      const graceMs = this.config.get('REFRESH_REUSE_GRACE_SECONDS') * 1000;
      const benignRace =
        token.revokeReason === 'rotated' && Date.now() - token.revokedAt.getTime() <= graceMs;
      if (!benignRace) {
        await this.revokeFamily(token.familyId, 'reuse');
        await this.audit.log({
          action: 'auth.refresh_token_reuse',
          entityType: 'user',
          entityId: token.userId,
          summary: `Refresh token reuse detected for ${token.user.email} — all sessions in that family were revoked`,
          actor: { id: token.user.id, name: token.user.name, email: token.user.email, role: token.user.role },
          site: null,
        });
        throw invalid();
      }
    }
    if (token.expiresAt < new Date()) throw invalid();
    if (token.user.status === UserStatus.INACTIVE) {
      await this.revokeAllForUser(token.userId, 'deactivated');
      throw invalid();
    }

    if (!token.revokedAt) {
      const res = await this.prisma.refreshToken.updateMany({
        where: { id: token.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'rotated' },
      });
      // Lost a race with a parallel refresh — fine, that is the benign case above.
      void res;
    }
    const refreshToken = await this.issueRefresh(token.userId, token.familyId);
    return { userId: token.userId, refreshToken };
  }

  async revokeByRaw(raw: string, reason: RevokeReason) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (token) await this.revokeFamily(token.familyId, reason);
    return token;
  }

  revokeFamily(familyId: string, reason: RevokeReason) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  revokeAllForUser(userId: string, reason: RevokeReason) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE'),
      sameSite: this.config.get('COOKIE_SAMESITE'),
      path: '/api/auth',
      maxAge: this.config.get('REFRESH_TOKEN_TTL_DAYS') * 86_400_000,
    };
  }

  setCookie(res: Response, raw: string): void {
    res.cookie(REFRESH_COOKIE, raw, this.cookieOptions());
  }

  clearCookie(res: Response): void {
    const { maxAge: _maxAge, ...opts } = this.cookieOptions();
    res.clearCookie(REFRESH_COOKIE, opts);
  }
}

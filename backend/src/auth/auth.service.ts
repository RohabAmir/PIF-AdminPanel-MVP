import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, User, UserStatus } from '@prisma/client';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { randomToken, sha256 } from '../common/utils/crypto';
import { isDemoAccount } from '../meta/demo';
import { presentMe, USER_SITES_INCLUDE } from '../users/user.presenter';
import { PasswordService } from './password.service';
import { OtpService, OTP_MAX_RESENDS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from './otp.service';
import { TokenService } from './token.service';
import { EmailRateLimiter } from './rate-limiter.service';
import type { AuthUser } from '../common/types';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000;
export const RESET_TOKEN_TTL_MS = 30 * 60_000;
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

const actorOf = (u: Pick<User, 'id' | 'name' | 'email' | 'role'>) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly passwords: PasswordService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly limiter: EmailRateLimiter,
  ) {}

  /** The demo OTP hint is only ever returned for the seeded demo accounts in DEMO_MODE. */
  private demoOtp(email: string, code: string): { demoOtp?: string } {
    return this.config.get('DEMO_MODE') && isDemoAccount(email) ? { demoOtp: code } : {};
  }

  private async sendOtp(user: User, code: string): Promise<boolean> {
    return this.mail.send(user.email, `${code} is your PIF Admin Panel verification code`, 'otp', {
      name: user.name.split(' ')[0],
      code,
      minutes: OTP_TTL_MS / 60_000,
    });
  }

  async login(email: string, password: string) {
    this.limiter.consume('login', email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.passwords.verify(password, null);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpException(
        {
          message: `Too many failed attempts. Your account is locked for ${minutes} more minute${minutes === 1 ? '' : 's'}.`,
          details: { code: 'ACCOUNT_LOCKED', lockedUntil: user.lockedUntil },
        },
        HttpStatus.LOCKED,
      );
    }

    if (!(await this.passwords.verify(password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) }
          : { failedLoginAttempts: attempts },
      });
      await this.audit.log({
        action: lock ? 'auth.account_locked' : 'auth.login_failed',
        entityType: 'user',
        entityId: user.id,
        summary: lock
          ? `Account ${user.email} locked for 15 minutes after ${MAX_FAILED_LOGINS} failed sign-in attempts`
          : `Failed sign-in attempt for ${user.email} (${attempts}/${MAX_FAILED_LOGINS})`,
        actor: actorOf(user),
        site: null,
      });
      if (lock) {
        throw new HttpException(
          {
            message: 'Too many failed attempts. Your account is locked for 15 minutes.',
            details: { code: 'ACCOUNT_LOCKED' },
          },
          HttpStatus.LOCKED,
        );
      }
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account has been deactivated. Please contact an administrator.');
    }
    if (user.mustChangePassword && user.tempPasswordExpiresAt && user.tempPasswordExpiresAt < new Date()) {
      throw new UnauthorizedException({
        message: 'Your temporary password has expired. Ask an administrator to resend your welcome email.',
        details: { code: 'TEMP_PASSWORD_EXPIRED' },
      });
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const { code, sessionToken } = await this.otp.create(user.id);
    const sent = await this.sendOtp(user, code);
    const demo = this.demoOtp(user.email, code);
    if (!sent && !demo.demoOtp) {
      throw new ServiceUnavailableException(
        'We could not send your verification code. Please try again in a moment.',
      );
    }
    return {
      otpSessionToken: sessionToken,
      email: maskEmail(user.email),
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      resendsRemaining: OTP_MAX_RESENDS,
      ...demo,
    };
  }

  async verifyOtp(sessionToken: string, code: string) {
    const otp = await this.otp.verify(sessionToken, code);
    const user = await this.prisma.user.update({
      where: { id: otp.userId },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      include: USER_SITES_INCLUDE,
    });
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account has been deactivated. Please contact an administrator.');
    }
    const actor = actorOf(user);
    await this.audit.log({
      action: 'auth.otp_verified',
      entityType: 'user',
      entityId: user.id,
      summary: `${user.name} verified their one-time code`,
      actor,
      site: null,
    });
    await this.audit.log({
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      summary: `${user.name} signed in`,
      actor,
      site: null,
    });
    return this.issueSession(user.id);
  }

  async resendOtp(sessionToken: string) {
    const current = await this.otp.load(sessionToken);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: current.userId } });
    this.limiter.consume('resend', user.email);
    const { otp, code } = await this.otp.resend(sessionToken);
    const sent = await this.sendOtp(user, code);
    const demo = this.demoOtp(user.email, code);
    if (!sent && !demo.demoOtp) {
      throw new ServiceUnavailableException('We could not send a new code. Please try again shortly.');
    }
    return {
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      resendsRemaining: OTP_MAX_RESENDS - otp.resendCount,
      expiresInSeconds: OTP_TTL_MS / 1000,
      ...demo,
    };
  }

  /** Issues a fresh access token + refresh-token family for a user. */
  async issueSession(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const refreshToken = await this.tokens.issueRefresh(user.id);
    const { accessToken, expiresAt } = this.tokens.signAccess(user);
    return { accessToken, expiresAt, refreshToken, user: await this.me(user.id) };
  }

  async refresh(raw: string | undefined) {
    if (!raw) throw new UnauthorizedException('Your session has expired. Please sign in again.');
    const { userId, refreshToken } = await this.tokens.rotate(raw);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { accessToken, expiresAt } = this.tokens.signAccess(user);
    return { accessToken, expiresAt, refreshToken, user: await this.me(userId) };
  }

  async logout(raw: string | undefined): Promise<void> {
    if (!raw) return;
    const token = await this.tokens.revokeByRaw(raw, 'logout');
    if (token && !token.revokeReason) {
      await this.audit.log({
        action: 'auth.logout',
        entityType: 'user',
        entityId: token.userId,
        summary: `${token.user.name} signed out`,
        actor: actorOf(token.user),
        site: null,
      });
    }
  }

  async logoutAll(user: AuthUser): Promise<void> {
    await this.tokens.revokeAllForUser(user.id, 'logout_all');
    await this.prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    await this.audit.log({
      action: 'auth.logout_all',
      entityType: 'user',
      entityId: user.id,
      summary: `${user.name} signed out of all sessions`,
      site: null,
    });
  }

  async forgotPassword(email: string) {
    this.limiter.consume('forgot', email);
    const message = 'If an account exists for this email, you will receive a password reset link shortly.';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status === UserStatus.INACTIVE) return { message };

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const raw = randomToken(32);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${encodeURIComponent(raw)}`;
    await this.mail.send(user.email, 'Reset your PIF Admin Panel password', 'reset-password', {
      name: user.name.split(' ')[0],
      resetUrl,
      minutes: RESET_TOKEN_TTL_MS / 60_000,
    });
    await this.audit.log({
      action: 'auth.password_reset_requested',
      entityType: 'user',
      entityId: user.id,
      summary: `Password reset requested for ${user.email}`,
      actor: actorOf(user),
      site: null,
    });
    return { message };
  }

  private assertNotProtectedDemo(email: string): void {
    if (this.config.get('DEMO_MODE') && isDemoAccount(email)) {
      throw new ForbiddenException('Demo accounts are protected in the public demo. Try this with a user you create.');
    }
  }

  async resetPassword(raw: string, password: string) {
    const invalid = new BadRequestException({
      message: 'This reset link is invalid or has expired. Please request a new one.',
      details: { code: 'RESET_TOKEN_INVALID' },
    });
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) throw invalid;
    if (token.user.status === UserStatus.INACTIVE) throw invalid;
    this.assertNotProtectedDemo(token.user.email);
    if (await this.passwords.verify(password, token.user.passwordHash)) {
      throw new BadRequestException('Your new password must be different from your current password.');
    }
    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalid;

    await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash: await this.passwords.hash(password),
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        status: token.user.status === UserStatus.PENDING ? UserStatus.ACTIVE : token.user.status,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    });
    await this.tokens.revokeAllForUser(token.userId, 'password_reset');
    await this.audit.log({
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: token.userId,
      summary: `${token.user.name} reset their password via email link`,
      actor: actorOf(token.user),
      site: null,
    });
    return { message: 'Your password has been reset. You can now sign in.' };
  }

  async changePassword(auth: AuthUser, currentPassword: string | undefined, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.id } });
    this.assertNotProtectedDemo(user.email);
    const forced = user.mustChangePassword;
    if (!forced) {
      if (!currentPassword || !(await this.passwords.verify(currentPassword, user.passwordHash))) {
        throw new BadRequestException({
          message: 'Your current password is incorrect.',
          details: [{ field: 'currentPassword', errors: ['Your current password is incorrect.'] }],
        });
      }
    }
    if (await this.passwords.verify(newPassword, user.passwordHash)) {
      throw new BadRequestException({
        message: forced
          ? 'Your new password must be different from the temporary password.'
          : 'Your new password must be different from your current password.',
        details: [{ field: 'newPassword', errors: ['Choose a password you have not used here.'] }],
      });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.passwords.hash(newPassword),
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
        tokenVersion: { increment: 1 },
      },
    });
    // Every other session is signed out; this one continues with a brand-new token family.
    await this.tokens.revokeAllForUser(user.id, 'password_change');
    await this.audit.log({
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: user.id,
      summary: forced
        ? `${user.name} set a new password on first sign-in`
        : `${user.name} changed their password`,
      site: null,
    });
    return this.issueSession(user.id);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_SITES_INCLUDE,
    });
    const allSites =
      user.role === Role.SUPER_ADMIN
        ? await this.prisma.site.findMany({ orderBy: { name: 'asc' } })
        : undefined;
    return presentMe(user, allSites);
  }
}

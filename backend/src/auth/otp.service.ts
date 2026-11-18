import { HttpException, HttpStatus, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { OtpCode } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateOtp, safeEqual } from '../common/utils/crypto';

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30_000;
export const OTP_MAX_RESENDS = 3;
const OTP_SESSION_TTL = '10m';

interface OtpSessionPayload {
  sub: string;
  sid: string;
  typ: 'otp';
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  /** OTPs are stored as an HMAC keyed with a server secret, so a DB leak cannot be brute-forced offline. */
  private hash(code: string, otpId: string): string {
    return createHmac('sha256', this.config.get('JWT_OTP_SECRET')).update(`${otpId}:${code}`).digest('hex');
  }

  async create(userId: string): Promise<{ otp: OtpCode; code: string; sessionToken: string }> {
    // Any previous pending code for this user is superseded.
    await this.prisma.otpCode.updateMany({
      where: { userId, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
    const code = generateOtp();
    const draft = await this.prisma.otpCode.create({
      data: { userId, codeHash: 'pending', expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    const otp = await this.prisma.otpCode.update({
      where: { id: draft.id },
      data: { codeHash: this.hash(code, draft.id) },
    });
    const sessionToken = this.jwt.sign({ sub: userId, sid: otp.id, typ: 'otp' } satisfies OtpSessionPayload, {
      secret: this.config.get('JWT_OTP_SECRET'),
      expiresIn: OTP_SESSION_TTL,
    });
    return { otp, code, sessionToken };
  }

  /** Validates the OTP session token and returns the live OTP row. */
  async load(sessionToken: string): Promise<OtpCode> {
    let payload: OtpSessionPayload;
    try {
      payload = this.jwt.verify<OtpSessionPayload>(sessionToken, {
        secret: this.config.get('JWT_OTP_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Your verification session has expired. Please sign in again.',
        details: { code: 'OTP_SESSION_EXPIRED' },
      });
    }
    if (payload.typ !== 'otp') throw new UnauthorizedException('Invalid verification session.');
    const otp = await this.prisma.otpCode.findUnique({ where: { id: payload.sid } });
    if (!otp || otp.userId !== payload.sub || otp.consumedAt || otp.invalidatedAt) {
      throw new UnauthorizedException({
        message: 'This verification session is no longer valid. Please sign in again.',
        details: { code: 'OTP_SESSION_EXPIRED' },
      });
    }
    return otp;
  }

  async verify(sessionToken: string, code: string): Promise<OtpCode> {
    const otp = await this.load(sessionToken);
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.invalidate(otp.id);
      throw new UnauthorizedException({
        message: 'Too many incorrect attempts. Please sign in again.',
        details: { code: 'OTP_LOCKED' },
      });
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException({
        message: 'This code has expired. Request a new code.',
        details: { code: 'OTP_EXPIRED' },
      });
    }
    if (!safeEqual(this.hash(code, otp.id), otp.codeHash)) {
      const attempts = otp.attempts + 1;
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts } });
      const remaining = OTP_MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        await this.invalidate(otp.id);
        throw new UnauthorizedException({
          message: 'Too many incorrect attempts. Please sign in again.',
          details: { code: 'OTP_LOCKED' },
        });
      }
      throw new BadRequestException({
        message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        details: { code: 'OTP_INVALID', attemptsRemaining: remaining },
      });
    }
    // Single use: the conditional update makes concurrent double-submits fail safely.
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, invalidatedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('This code has already been used. Please sign in again.');
    }
    return otp;
  }

  async resend(sessionToken: string): Promise<{ otp: OtpCode; code: string }> {
    const otp = await this.load(sessionToken);
    const wait = OTP_RESEND_COOLDOWN_MS - (Date.now() - otp.lastSentAt.getTime());
    if (wait > 0) {
      const s = Math.ceil(wait / 1000);
      throw new HttpException(
        { message: `Please wait ${s} seconds before requesting a new code.`, details: { retryAfter: s } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (otp.resendCount >= OTP_MAX_RESENDS) {
      throw new HttpException(
        {
          message: 'You have reached the maximum number of resends. Please sign in again.',
          details: { code: 'OTP_RESEND_LIMIT' },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = generateOtp();
    const updated = await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        codeHash: this.hash(code, otp.id),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        lastSentAt: new Date(),
        resendCount: { increment: 1 },
      },
    });
    return { otp: updated, code };
  }

  private invalidate(id: string) {
    return this.prisma.otpCode.update({ where: { id }, data: { invalidatedAt: new Date() } });
  }
}

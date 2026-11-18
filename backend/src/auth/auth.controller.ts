import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AllowDuringPasswordChange, CurrentUser, Public } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE, TokenService } from './token.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  OtpSessionDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

const authLimit = { default: { limit: () => Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  private respond(res: Response, s: { refreshToken: string } & Record<string, unknown>) {
    const { refreshToken, ...body } = s;
    this.tokens.setCookie(res, refreshToken);
    return body;
  }

  @Post('login')
  @Public()
  @Throttle(authLimit)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1 — validate credentials and email a one-time code' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('verify-otp')
  @Public()
  @Throttle(authLimit)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2 — verify the code; issues access token + refresh cookie' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.verifyOtp(dto.otpSessionToken, dto.code));
  }

  @Post('resend-otp')
  @Public()
  @Throttle(authLimit)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the code (30 s cooldown, max 3 per sign-in)' })
  resendOtp(@Body() dto: OtpSessionDto) {
    return this.auth.resendOtp(dto.otpSessionToken);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh cookie and get a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]));
    } catch (e) {
      this.tokens.clearCookie(res);
      throw e;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token family and clear the cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.tokens.clearCookie(res);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @AllowDuringPasswordChange()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out of every session on every device' })
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user);
    this.tokens.clearCookie(res);
  }

  @Post('forgot-password')
  @Public()
  @Throttle(authLimit)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a single-use reset link (always returns the same message)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Public()
  @Throttle(authLimit)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using the emailed token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @AllowDuringPasswordChange()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (also used for the forced first-login change)' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(res, await this.auth.changePassword(user, dto.currentPassword, dto.newPassword));
  }

  @Get('me')
  @ApiBearerAuth()
  @AllowDuringPasswordChange()
  @ApiOperation({ summary: 'Current user, permissions and accessible websites' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}

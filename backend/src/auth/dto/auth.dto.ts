import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsJWT, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_REGEX } from '../../common/utils/password-policy';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ example: 'superadmin@pifdemo.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Demo@12345' })
  @IsString()
  @Length(1, 128, { message: 'Password is required.' })
  password: string;
}

export class OtpSessionDto {
  @ApiProperty({ description: 'Short-lived token returned by /auth/login' })
  @IsJWT({ message: 'Your verification session is invalid. Please sign in again.' })
  otpSessionToken: string;
}

export class VerifyOtpDto extends OtpSessionDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' })
  code: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200, { message: 'This reset link is invalid or has expired.' })
  token: string;

  @ApiProperty({ example: 'N3w-Passw0rd!' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Required unless this is the forced first-login change' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}

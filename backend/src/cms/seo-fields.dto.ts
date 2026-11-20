import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Absolute URL, an uploaded file, or an image bundled with the hosted websites. */
export const URL_OR_UPLOAD = /^(https?:\/\/[^\s]+|\/(uploads|websites)\/[^\s]+)$/;

/** Per-page / per-post SEO overrides. */
export class SeoFieldsDto {
  @ApiPropertyOptional({ maxLength: 70 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(70, { message: 'Meta title should be 70 characters or fewer.' })
  metaTitle?: string;

  @ApiPropertyOptional({ maxLength: 170 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(170, { message: 'Meta description should be 170 characters or fewer.' })
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(95)
  ogTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  ogDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @ValidateIf((_o, v) => v !== '')
  @Matches(URL_OR_UPLOAD, { message: 'OG image must be a valid URL.' })
  @MaxLength(1000)
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @ValidateIf((_o, v) => v !== '')
  @Matches(/^https?:\/\/[^\s]+$/, { message: 'Canonical URL must start with http:// or https://' })
  @MaxLength(1000)
  canonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  noindex?: boolean;
}

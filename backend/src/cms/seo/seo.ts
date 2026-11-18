import { Body, Controller, Get, Injectable, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Site } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { Audit, CurrentSite, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { setAuditHints } from '../../common/context/request-context';
import { URL_OR_UPLOAD } from '../seo-fields.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : trim({ value });

export class SeoSettingsDto {
  @ApiProperty({ example: '%s | Oasis Demo', description: '%s is replaced by the page title' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  @Matches(/%s/, { message: 'The title template must contain %s where the page title goes.' })
  titleTemplate: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(170, { message: 'Default meta description should be 170 characters or fewer.' })
  defaultMetaDescription: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(URL_OR_UPLOAD, { message: 'Default OG image must be a valid URL.' })
  defaultOgImage?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  robotsTxt: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^https?:\/\/[^\s/]+(\/[^\s]*)?$/, {
    message: 'Canonical base URL must start with https://',
  })
  canonicalBaseUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^[A-Za-z0-9_-]{10,100}$/, {
    message: 'Paste only the content value of the Google verification meta tag.',
  })
  googleVerification?: string | null;
}

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(site: Site) {
    const db = this.prisma.forSite(site.id);
    return (
      (await db.seoSetting.findFirst()) ??
      db.seoSetting.create({ data: { siteId: site.id, titleTemplate: `%s | ${site.name}` } })
    );
  }

  async update(site: Site, dto: SeoSettingsDto) {
    const before = await this.get(site);
    setAuditHints({ before, summary: undefined });
    return this.prisma.forSite(site.id).seoSetting.update({ where: { id: before.id }, data: dto });
  }
}

@ApiTags('CMS · SEO')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('seo/settings')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get()
  get(@CurrentSite() site: Site) {
    return this.seo.get(site);
  }

  @Put()
  @RequirePermission(Permission.SETTINGS_MANAGE)
  @Audit('seo.updated', 'seo_settings')
  update(@CurrentSite() site: Site, @Body() dto: SeoSettingsDto) {
    return this.seo.update(site, dto);
  }
}

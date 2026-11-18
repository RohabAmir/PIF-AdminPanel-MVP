import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Site, SocialPlatform } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { Audit, CurrentSite, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { setAuditHints } from '../../common/context/request-context';
import { ReorderDto } from '../pages/pages.dto';

export const PLATFORM_HOSTS: Record<SocialPlatform, string[]> = {
  FACEBOOK: ['facebook.com', 'fb.com'],
  INSTAGRAM: ['instagram.com'],
  X: ['x.com', 'twitter.com'],
  LINKEDIN: ['linkedin.com'],
  YOUTUBE: ['youtube.com', 'youtu.be'],
  TIKTOK: ['tiktok.com'],
  SNAPCHAT: ['snapchat.com'],
  WHATSAPP: ['wa.me', 'whatsapp.com'],
};

export function validatePlatformUrl(platform: SocialPlatform, raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'Enter a full URL starting with https://';
  }
  if (url.protocol !== 'https:') return 'Social links must use https://';
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\.|^api\./, '');
  const allowed = PLATFORM_HOSTS[platform];
  if (!allowed.some((h) => host === h || host.endsWith(`.${h}`))) {
    return `This doesn't look like a ${platform.charAt(0) + platform.slice(1).toLowerCase()} URL (expected ${allowed.join(' or ')}).`;
  }
  if (url.pathname.length <= 1 && platform !== 'WHATSAPP')
    return 'Include the profile or page path in the URL.';
  return null;
}

export class SocialLinkDto {
  @ApiProperty({ enum: SocialPlatform })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty({ example: 'https://instagram.com/oasis.demo' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSocialLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  list(siteId: string) {
    return this.prisma.forSite(siteId).socialLink.findMany({ orderBy: { order: 'asc' } });
  }

  private assertUrl(platform: SocialPlatform, url: string) {
    const err = validatePlatformUrl(platform, url);
    if (err)
      throw new BadRequestException({ message: err, details: [{ field: 'url', errors: [err] }] });
  }

  async create(siteId: string, dto: SocialLinkDto) {
    this.assertUrl(dto.platform, dto.url);
    const db = this.prisma.forSite(siteId);
    if (await db.socialLink.findFirst({ where: { platform: dto.platform } })) {
      throw new ConflictException({
        message: 'This platform already has a link. Edit the existing one instead.',
        details: [{ field: 'platform', errors: ['This platform already has a link.'] }],
      });
    }
    const max = await db.socialLink.aggregate({ _max: { order: true } });
    return db.socialLink.create({
      data: {
        siteId,
        platform: dto.platform,
        url: dto.url,
        isActive: dto.isActive ?? true,
        order: (max._max.order ?? -1) + 1,
      },
    });
  }

  async update(siteId: string, id: string, dto: UpdateSocialLinkDto) {
    const db = this.prisma.forSite(siteId);
    const before = await db.socialLink.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Social link not found.');
    if (dto.url) this.assertUrl(before.platform, dto.url);
    setAuditHints({ before });
    return db.socialLink.update({ where: { id }, data: dto });
  }

  async reorder(siteId: string, ids: string[]) {
    const count = await this.prisma
      .forSite(siteId)
      .socialLink.count({ where: { id: { in: ids } } });
    if (count !== new Set(ids).size)
      throw new BadRequestException('Some links do not belong to this website.');
    await this.prisma.$transaction(
      ids.map((lid, order) =>
        this.prisma.socialLink.update({ where: { id: lid, siteId }, data: { order } }),
      ),
    );
    return this.list(siteId);
  }

  async remove(siteId: string, id: string) {
    const db = this.prisma.forSite(siteId);
    const before = await db.socialLink.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Social link not found.');
    setAuditHints({ before });
    await db.socialLink.delete({ where: { id } });
    return { id, platform: before.platform };
  }
}

@ApiTags('CMS · Social media')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('social-links')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  list(@CurrentSite() site: Site) {
    return this.social.list(site.id);
  }

  @Post()
  @RequirePermission(Permission.SETTINGS_MANAGE)
  @Audit('social.created', 'social_link')
  create(@CurrentSite() site: Site, @Body() dto: SocialLinkDto) {
    return this.social.create(site.id, dto);
  }

  @Put('order')
  @RequirePermission(Permission.SETTINGS_MANAGE)
  @Audit('social.reordered', 'social_link')
  reorder(@CurrentSite() site: Site, @Body() dto: ReorderDto) {
    return this.social.reorder(site.id, dto.ids);
  }

  @Patch(':id')
  @RequirePermission(Permission.SETTINGS_MANAGE)
  @Audit('social.updated', 'social_link')
  update(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSocialLinkDto,
  ) {
    return this.social.update(site.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission(Permission.SETTINGS_MANAGE)
  @Audit('social.deleted', 'social_link')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.social.remove(site.id, id);
  }
}

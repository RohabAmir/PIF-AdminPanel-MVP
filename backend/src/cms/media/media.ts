import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, Site } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfig } from '../../config/app-config.service';
import {
  Audit,
  CurrentSite,
  CurrentUser,
  RequirePermission,
  SiteScoped,
} from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { setAuditHints } from '../../common/context/request-context';
import { paginate, PaginationQueryDto, skipTake } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types';
import { IncomingFile, MediaStorage, sniffImageType } from './storage';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ExternalMediaDto {
  @ApiProperty({ example: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee' })
  @Transform(trim)
  @Matches(/^https:\/\/[^\s]+$/, { message: 'Image URL must start with https://' })
  @MaxLength(1000)
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  alt?: string;
}

export class UpdateMediaDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  alt: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorage,
    private readonly config: AppConfig,
  ) {}

  async list(siteId: string, q: PaginationQueryDto) {
    const db = this.prisma.forSite(siteId);
    const where: Prisma.MediaAssetWhereInput = q.search
      ? {
          OR: [
            { filename: { contains: q.search, mode: 'insensitive' } },
            { alt: { contains: q.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      db.mediaAsset.findMany({
        where,
        orderBy: { createdAt: q.sortOrder ?? 'desc' },
        include: { uploadedBy: { select: { id: true, name: true } } },
        ...skipTake(q),
      }),
      db.mediaAsset.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async upload(siteId: string, file: IncomingFile | undefined, user: AuthUser) {
    if (this.storage.driver === 'url') {
      throw new BadRequestException(
        'File uploads are disabled in this environment. Add images by URL instead.',
      );
    }
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const max = this.config.get('MAX_UPLOAD_MB');
    if (file.size > max * 1024 * 1024)
      throw new PayloadTooLargeException(`Images must be ${max} MB or smaller.`);
    const mime = sniffImageType(file.buffer);
    if (!mime)
      throw new UnsupportedMediaTypeException('Only JPEG, PNG, WebP and GIF images are allowed.');
    const stored = await this.storage.save(file, mime, siteId);
    return this.prisma.forSite(siteId).mediaAsset.create({
      data: {
        siteId,
        url: stored.url,
        storageKey: stored.key,
        storage: stored.storage,
        filename: file.originalname.replace(/[^\w.\- ]+/g, '_').slice(0, 150) || 'image',
        mimeType: mime,
        size: file.size,
        uploadedById: user.id,
      },
    });
  }

  addExternal(siteId: string, dto: ExternalMediaDto, user: AuthUser) {
    const filename = decodeURIComponent(
      new URL(dto.url).pathname.split('/').pop() || 'image',
    ).slice(0, 150);
    return this.prisma.forSite(siteId).mediaAsset.create({
      data: {
        siteId,
        url: dto.url,
        storage: 'external',
        filename,
        mimeType: 'image/*',
        alt: dto.alt ?? '',
        uploadedById: user.id,
      },
    });
  }

  async update(siteId: string, id: string, alt: string) {
    const db = this.prisma.forSite(siteId);
    const before = await db.mediaAsset.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Image not found.');
    setAuditHints({ before });
    return db.mediaAsset.update({ where: { id }, data: { alt } });
  }

  async remove(siteId: string, id: string) {
    const db = this.prisma.forSite(siteId);
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Image not found.');
    setAuditHints({ before: asset });
    await db.mediaAsset.delete({ where: { id } });
    await this.storage.remove(asset.storage, asset.storageKey);
    return { id, filename: asset.filename };
  }
}

@ApiTags('CMS · Media')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentSite() site: Site, @Query() q: PaginationQueryDto) {
    return this.media.list(site.id, q);
  }

  @Post('upload')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('media.uploaded', 'media')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
  upload(
    @CurrentSite() site: Site,
    @UploadedFile() file: IncomingFile | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.media.upload(site.id, file, user);
  }

  @Post('external')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('media.added', 'media')
  addExternal(
    @CurrentSite() site: Site,
    @Body() dto: ExternalMediaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.media.addExternal(site.id, dto, user);
  }

  @Patch(':id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('media.updated', 'media')
  update(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.media.update(site.id, id, dto.alt);
  }

  @Delete(':id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('media.deleted', 'media')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.remove(site.id, id);
  }
}

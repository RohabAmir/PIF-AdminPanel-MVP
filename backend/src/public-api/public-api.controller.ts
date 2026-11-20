import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Site } from '@prisma/client';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentSite, Public } from '../common/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiService } from './public-api.service';

export class PublicBlogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}

export class SubmitFormDto {
  @ApiProperty({ example: { name: 'Jane Doe', email: 'jane@example.com', message: 'Hello!' } })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ example: '/contact' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourcePage?: string;

  @ApiPropertyOptional({ description: 'Honeypot — must stay empty' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  _hp?: string;
}

/**
 * Every tenant requests the same URLs and is told apart only by X-API-Key, so shared caches (CDNs)
 * must not store these responses: they would serve one website's content to another and delay edits.
 * `private, no-cache` lets the browser keep a copy but revalidate each time (cheap 304 via ETag).
 */
const CACHE = 'private, no-cache';

@ApiTags('Public content API')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('public')
export class PublicApiController {
  constructor(private readonly api: PublicApiService) {}

  @Get('pages')
  @Header('Cache-Control', CACHE)
  pages(@CurrentSite() site: Site) {
    return this.api.pages(site);
  }

  @Get('pages/:slug')
  @Header('Cache-Control', CACHE)
  page(@CurrentSite() site: Site, @Param('slug') slug: string) {
    return this.api.page(site, slug);
  }

  @Get('blogs')
  @Header('Cache-Control', CACHE)
  blogs(@CurrentSite() site: Site, @Query() q: PublicBlogQueryDto) {
    return this.api.blogs(site, q);
  }

  @Get('blogs/:slug')
  @Header('Cache-Control', CACHE)
  blog(@CurrentSite() site: Site, @Param('slug') slug: string) {
    return this.api.blog(site, slug);
  }

  @Get('social-links')
  @Header('Cache-Control', CACHE)
  social(@CurrentSite() site: Site) {
    return this.api.socialLinks(site);
  }

  @Get('seo/:pageSlug')
  @Header('Cache-Control', CACHE)
  seo(@CurrentSite() site: Site, @Param('pageSlug') slug: string) {
    return this.api.seo(site, slug);
  }

  @Get('forms/:key')
  @Header('Cache-Control', CACHE)
  form(@CurrentSite() site: Site, @Param('key') key: string) {
    return this.api.form(site, key);
  }

  @Post('forms/:key/submit')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @Throttle({
    default: { limit: () => Number(process.env.PUBLIC_FORM_RATE_LIMIT ?? 10), ttl: 60_000 },
  })
  submit(@CurrentSite() site: Site, @Param('key') key: string, @Body() dto: SubmitFormDto) {
    return this.api.submit(site, key, dto.data, dto.sourcePage, dto._hp);
  }
}

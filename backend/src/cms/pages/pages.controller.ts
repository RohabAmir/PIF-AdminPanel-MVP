import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { PageStatus, Site } from '@prisma/client';
import { Audit, CurrentSite, CurrentUser, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import type { AuthUser } from '../../common/types';
import { PagesService } from './pages.service';
import { CreatePageDto, ListPagesQueryDto, ReorderDto, UpdatePageDto } from './pages.dto';

@ApiTags('CMS · Pages')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list(@CurrentSite() site: Site, @Query() q: ListPagesQueryDto) {
    return this.pages.list(site.id, q);
  }

  @Get(':id')
  get(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.pages.get(site.id, id);
  }

  @Post()
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('page.created', 'page')
  create(@CurrentSite() site: Site, @Body() dto: CreatePageDto, @CurrentUser() user: AuthUser) {
    return this.pages.create(site.id, dto, user);
  }

  @Put('order')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('page.reordered', 'page')
  reorder(@CurrentSite() site: Site, @Body() dto: ReorderDto) {
    return this.pages.reorder(site.id, dto.ids);
  }

  @Patch(':id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('page.updated', 'page')
  update(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(site.id, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CONTENT_PUBLISH)
  @Audit('page.published', 'page')
  publish(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.pages.setStatus(site.id, id, PageStatus.PUBLISHED);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CONTENT_PUBLISH)
  @Audit('page.unpublished', 'page')
  unpublish(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.pages.setStatus(site.id, id, PageStatus.DRAFT);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CONTENT_PUBLISH)
  @Audit('page.archived', 'page')
  archive(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.pages.setStatus(site.id, id, PageStatus.ARCHIVED);
  }

  @Post(':id/duplicate')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('page.duplicated', 'page')
  duplicate(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.pages.duplicate(site.id, id, user);
  }

  @Delete(':id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('page.deleted', 'page')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.pages.remove(site.id, id);
  }
}

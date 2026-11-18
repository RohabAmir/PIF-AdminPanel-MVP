import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Site } from '@prisma/client';
import { Audit, CurrentSite, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { ReorderDto } from '../pages/pages.dto';
import { SectionsService } from './sections.service';
import { CreateSectionDto, UpdateSectionDto } from './sections.dto';

@ApiTags('CMS · Sections')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller()
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Get('pages/:pageId/sections')
  list(@CurrentSite() site: Site, @Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.sections.list(site.id, pageId);
  }

  @Post('pages/:pageId/sections')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('section.created', 'section')
  create(@CurrentSite() site: Site, @Param('pageId', ParseUUIDPipe) pageId: string, @Body() dto: CreateSectionDto) {
    return this.sections.create(site.id, pageId, dto);
  }

  @Put('pages/:pageId/sections/order')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('section.reordered', 'section')
  reorder(@CurrentSite() site: Site, @Param('pageId', ParseUUIDPipe) pageId: string, @Body() dto: ReorderDto) {
    return this.sections.reorder(site.id, pageId, dto.ids);
  }

  @Get('sections/:id')
  get(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.sections.get(site.id, id);
  }

  @Patch('sections/:id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('section.updated', 'section')
  update(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSectionDto) {
    return this.sections.update(site.id, id, dto);
  }

  @Post('sections/:id/duplicate')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('section.duplicated', 'section')
  duplicate(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.sections.duplicate(site.id, id);
  }

  @Delete('sections/:id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('section.deleted', 'section')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.sections.remove(site.id, id);
  }
}

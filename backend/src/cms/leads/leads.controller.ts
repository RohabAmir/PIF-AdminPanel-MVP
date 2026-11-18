import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Site } from '@prisma/client';
import type { Response } from 'express';
import { Audit, CurrentSite, CurrentUser, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import type { AuthUser } from '../../common/types';
import { LeadsService } from './leads.service';
import { AddLeadNoteDto, LeadFiltersDto, UpdateLeadStatusDto } from './leads.dto';

@ApiTags('CMS · Leads')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@CurrentSite() site: Site, @Query() q: LeadFiltersDto) {
    return this.leads.list(site.id, q);
  }

  @Get('export')
  @RequirePermission(Permission.LEADS_EXPORT)
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async export(@CurrentSite() site: Site, @Query() q: LeadFiltersDto, @Res({ passthrough: true }) res: Response) {
    const { csv } = await this.leads.exportCsv(site.id, site.name, q);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="leads-${site.slug}-${stamp}.csv"`);
    return '﻿' + csv;
  }

  @Get(':id')
  get(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.leads.get(site.id, id);
  }

  @Patch(':id/status')
  @RequirePermission(Permission.LEADS_UPDATE)
  @Audit('lead.status_changed', 'lead')
  setStatus(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.setStatus(site.id, id, dto.status, user);
  }

  @Post(':id/notes')
  @RequirePermission(Permission.LEADS_UPDATE)
  @Audit('lead.note_added', 'lead')
  addNote(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLeadNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.addNote(site.id, id, dto.body, user);
  }

  @Delete(':id')
  @RequirePermission(Permission.LEADS_DELETE)
  @Audit('lead.deleted', 'lead')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.leads.remove(site.id, id);
  }
}

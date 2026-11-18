import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission } from '../common/decorators';
import { Permission } from '../common/permissions';
import type { AuthUser } from '../common/types';
import { presentAdminSite, SitesService } from './sites.service';
import { CreateSiteDto, ListSitesQueryDto, UpdateSiteDto } from './dto/sites.dto';

@ApiTags('Websites')
@ApiBearerAuth()
@Controller('sites')
@RequirePermission(Permission.SITES_MANAGE)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  list(@Query() q: ListSitesQueryDto) {
    return this.sites.list(q);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return presentAdminSite(await this.sites.get(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a website. The public API key is returned once.' })
  create(@Body() dto: CreateSiteDto, @CurrentUser() actor: AuthUser) {
    return this.sites.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto, @CurrentUser() actor: AuthUser) {
    return this.sites.update(id, dto, actor);
  }

  @Post(':id/regenerate-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the public API key (old key stops working immediately)' })
  regenerate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.sites.regenerateKey(id, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiQuery({ name: 'confirm', description: 'Must equal the website name' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('confirm') confirm: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    await this.sites.remove(id, confirm, actor);
  }
}

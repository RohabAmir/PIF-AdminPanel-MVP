import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Site } from '@prisma/client';
import { Audit, CurrentSite, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { FormsService } from './forms.service';
import { CreateFormDto, UpdateFormDto } from './forms.dto';

@ApiTags('CMS · Forms')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list(@CurrentSite() site: Site) {
    return this.forms.list(site.id);
  }

  @Get(':id')
  get(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.get(site.id, id);
  }

  @Post()
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('form.created', 'form')
  create(@CurrentSite() site: Site, @Body() dto: CreateFormDto) {
    return this.forms.create(site.id, dto);
  }

  @Patch(':id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('form.updated', 'form')
  update(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.forms.update(site.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('form.deleted', 'form')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.remove(site.id, id);
  }
}

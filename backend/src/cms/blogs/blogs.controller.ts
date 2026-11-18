import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Site } from '@prisma/client';
import { Audit, CurrentSite, CurrentUser, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import type { AuthUser } from '../../common/types';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, ListBlogsQueryDto, PublishBlogDto, UpdateBlogDto } from './blogs.dto';

@ApiTags('CMS · Blogs')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogs: BlogsService) {}

  @Get()
  list(@CurrentSite() site: Site, @Query() q: ListBlogsQueryDto) {
    return this.blogs.list(site.id, q);
  }

  @Get(':id')
  get(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.get(site.id, id);
  }

  @Post()
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('blog.created', 'blog')
  create(@CurrentSite() site: Site, @Body() dto: CreateBlogDto, @CurrentUser() user: AuthUser) {
    return this.blogs.create(site.id, dto, user);
  }

  @Patch(':id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('blog.updated', 'blog')
  update(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlogDto) {
    return this.blogs.update(site.id, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CONTENT_PUBLISH)
  @Audit('blog.published', 'blog')
  publish(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishBlogDto) {
    return this.blogs.publish(site.id, id, dto.publishedAt);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CONTENT_PUBLISH)
  @Audit('blog.unpublished', 'blog')
  unpublish(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.unpublish(site.id, id);
  }

  @Delete(':id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('blog.deleted', 'blog')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.blogs.remove(site.id, id);
  }
}

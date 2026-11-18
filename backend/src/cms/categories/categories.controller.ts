import {
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Site } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Audit, CurrentSite, RequirePermission, SiteScoped } from '../../common/decorators';
import { Permission } from '../../common/permissions';
import { setAuditHints } from '../../common/context/request-context';
import { slugify } from '../../common/utils/slug';
import { CategoryDto } from '../blogs/blogs.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(siteId: string) {
    return this.prisma.forSite(siteId).blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  private async assertFree(siteId: string, slug: string, excludeId?: string) {
    const clash = await this.prisma
      .forSite(siteId)
      .blogCategory.findFirst({ where: { slug, id: { not: excludeId } } });
    if (clash) {
      throw new ConflictException({
        message: 'A category with this name already exists.',
        details: [{ field: 'name', errors: ['A category with this name already exists.'] }],
      });
    }
  }

  async create(siteId: string, name: string) {
    const slug = slugify(name);
    await this.assertFree(siteId, slug);
    return this.prisma.forSite(siteId).blogCategory.create({ data: { siteId, name, slug } });
  }

  async get(siteId: string, id: string) {
    const c = await this.prisma.forSite(siteId).blogCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Category not found.');
    return c;
  }

  async update(siteId: string, id: string, name: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    const slug = slugify(name);
    await this.assertFree(siteId, slug, id);
    return this.prisma.forSite(siteId).blogCategory.update({ where: { id }, data: { name, slug } });
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    await this.prisma.forSite(siteId).blogCategory.delete({ where: { id } });
    return { id, name: before.name };
  }
}

@ApiTags('CMS · Blog categories')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('blog-categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentSite() site: Site) {
    return this.categories.list(site.id);
  }

  @Post()
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('category.created', 'category')
  create(@CurrentSite() site: Site, @Body() dto: CategoryDto) {
    return this.categories.create(site.id, dto.name);
  }

  @Patch(':id')
  @RequirePermission(Permission.CONTENT_WRITE)
  @Audit('category.updated', 'category')
  update(
    @CurrentSite() site: Site,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryDto,
  ) {
    return this.categories.update(site.id, id, dto.name);
  }

  @Delete(':id')
  @RequirePermission(Permission.CONTENT_DELETE)
  @Audit('category.deleted', 'category')
  remove(@CurrentSite() site: Site, @Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(site.id, id);
  }
}

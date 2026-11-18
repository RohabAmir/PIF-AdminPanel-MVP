import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { setAuditHints } from '../../common/context/request-context';
import { uniqueSlug } from '../../common/utils/slug';
import type { AuthUser } from '../../common/types';
import { CreatePageDto, ListPagesQueryDto, UpdatePageDto } from './pages.dto';

const PAGE_INCLUDE = {
  parent: { select: { id: true, title: true, slug: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { sections: true, children: true } },
} as const;

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(siteId: string, q: ListPagesQueryDto) {
    const db = this.prisma.forSite(siteId);
    const where: Prisma.PageWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { slug: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortOrder = q.sortOrder ?? (q.sortBy === 'order' || q.sortBy === 'title' ? 'asc' : 'desc');
    const [rows, total] = await Promise.all([
      db.page.findMany({
        where,
        include: PAGE_INCLUDE,
        orderBy: [{ [q.sortBy]: sortOrder }, { createdAt: 'asc' }],
        ...skipTake(q),
      }),
      db.page.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async get(siteId: string, id: string) {
    const page = await this.prisma.forSite(siteId).page.findUnique({ where: { id }, include: PAGE_INCLUDE });
    if (!page) throw new NotFoundException('Page not found.');
    return page;
  }

  private slugTaken(siteId: string, excludeId?: string) {
    return async (slug: string) =>
      !!(await this.prisma.forSite(siteId).page.findFirst({ where: { slug, id: { not: excludeId } }, select: { id: true } }));
  }

  private async assertParent(siteId: string, parentId: string | null | undefined, selfId?: string) {
    if (!parentId) return;
    if (parentId === selfId) throw new BadRequestException('A page cannot be its own parent.');
    const parent = await this.prisma.forSite(siteId).page.findUnique({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Parent page not found on this website.');
    if (selfId && parent.parentId === selfId) {
      throw new BadRequestException('A page cannot be nested under one of its own children.');
    }
  }

  async create(siteId: string, dto: CreatePageDto, user: AuthUser) {
    const db = this.prisma.forSite(siteId);
    await this.assertParent(siteId, dto.parentId);
    let slug: string;
    if (dto.slug) {
      if (await this.slugTaken(siteId)(dto.slug)) throw this.slugConflict();
      slug = dto.slug;
    } else {
      slug = await uniqueSlug(dto.title, this.slugTaken(siteId));
    }
    const max = await db.page.aggregate({ _max: { order: true } });
    return db.page.create({
      data: {
        siteId,
        title: dto.title,
        slug,
        parentId: dto.parentId ?? null,
        seo: (dto.seo ?? {}) as Prisma.InputJsonValue,
        order: (max._max.order ?? -1) + 1,
        createdById: user.id,
      },
      include: PAGE_INCLUDE,
    });
  }

  private slugConflict() {
    return new ConflictException({
      message: 'Another page on this website already uses this slug.',
      details: [{ field: 'slug', errors: ['Another page on this website already uses this slug.'] }],
    });
  }

  async update(siteId: string, id: string, dto: UpdatePageDto) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    if (dto.slug && dto.slug !== before.slug && (await this.slugTaken(siteId, id)(dto.slug))) throw this.slugConflict();
    if (dto.parentId !== undefined) await this.assertParent(siteId, dto.parentId, id);
    return this.prisma.forSite(siteId).page.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        parentId: dto.parentId,
        order: dto.order,
        seo: dto.seo ? ({ ...((before.seo as object) ?? {}), ...dto.seo } as Prisma.InputJsonValue) : undefined,
      },
      include: PAGE_INCLUDE,
    });
  }

  async setStatus(siteId: string, id: string, status: PageStatus) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    if (before.status === status) return before;
    return this.prisma.forSite(siteId).page.update({
      where: { id },
      data: {
        status,
        publishedAt: status === PageStatus.PUBLISHED ? (before.publishedAt ?? new Date()) : before.publishedAt,
      },
      include: PAGE_INCLUDE,
    });
  }

  async duplicate(siteId: string, id: string, user: AuthUser) {
    const db = this.prisma.forSite(siteId);
    const source = await db.page.findUnique({ where: { id }, include: { sections: { orderBy: { order: 'asc' } } } });
    if (!source) throw new NotFoundException('Page not found.');
    const slug = await uniqueSlug(`${source.slug}-copy`, this.slugTaken(siteId));
    const max = await db.page.aggregate({ _max: { order: true } });
    const copy = await this.prisma.$transaction(async (tx) => {
      const page = await tx.page.create({
        data: {
          siteId,
          title: `${source.title} (Copy)`.slice(0, 150),
          slug,
          status: PageStatus.DRAFT,
          parentId: source.parentId,
          seo: (source.seo ?? {}) as Prisma.InputJsonValue,
          order: (max._max.order ?? -1) + 1,
          createdById: user.id,
        },
      });
      if (source.sections.length) {
        await tx.section.createMany({
          data: source.sections.map((s) => ({
            siteId,
            pageId: page.id,
            type: s.type,
            name: s.name,
            content: s.content as Prisma.InputJsonValue,
            order: s.order,
            isVisible: s.isVisible,
          })),
        });
      }
      return page;
    });
    setAuditHints({ summary: `${user.name} duplicated page "${source.title}" as "${copy.title}"` });
    return this.get(siteId, copy.id);
  }

  async reorder(siteId: string, ids: string[]) {
    const db = this.prisma.forSite(siteId);
    const count = await db.page.count({ where: { id: { in: ids } } });
    if (count !== new Set(ids).size) throw new BadRequestException('Some pages do not belong to this website.');
    await this.prisma.$transaction(
      ids.map((pid, index) => this.prisma.page.update({ where: { id: pid, siteId }, data: { order: index } })),
    );
    return { ids };
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    await this.prisma.forSite(siteId).page.delete({ where: { id } });
    return { id, title: before.title };
  }
}

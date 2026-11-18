import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BlogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { setAuditHints } from '../../common/context/request-context';
import { uniqueSlug } from '../../common/utils/slug';
import type { AuthUser } from '../../common/types';
import { readingTime, sanitizeRichText } from '../sanitize';
import { CreateBlogDto, ListBlogsQueryDto, UpdateBlogDto } from './blogs.dto';

const BLOG_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, name: true } },
} as const;

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(siteId: string, q: ListBlogsQueryDto) {
    const db = this.prisma.forSite(siteId);
    const where: Prisma.BlogPostWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { excerpt: { contains: q.search, mode: 'insensitive' } },
              { tags: { has: q.search.toLowerCase() } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        include: BLOG_INCLUDE,
        omit: { content: true },
        orderBy: [{ [q.sortBy]: { sort: q.sortOrder ?? (q.sortBy === 'title' ? 'asc' : 'desc'), nulls: 'last' } }, { id: 'asc' }],
        ...skipTake(q),
      }),
      db.blogPost.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async get(siteId: string, id: string) {
    const post = await this.prisma.forSite(siteId).blogPost.findUnique({ where: { id }, include: BLOG_INCLUDE });
    if (!post) throw new NotFoundException('Blog post not found.');
    return post;
  }

  private slugTaken(siteId: string, excludeId?: string) {
    return async (slug: string) =>
      !!(await this.prisma.forSite(siteId).blogPost.findFirst({ where: { slug, id: { not: excludeId } }, select: { id: true } }));
  }

  private async assertCategory(siteId: string, categoryId: string | null | undefined) {
    if (!categoryId) return;
    const exists = await this.prisma.forSite(siteId).blogCategory.findUnique({ where: { id: categoryId } });
    if (!exists) throw new BadRequestException('Category not found on this website.');
  }

  private slugConflict() {
    return new ConflictException({
      message: 'Another post on this website already uses this slug.',
      details: [{ field: 'slug', errors: ['Another post on this website already uses this slug.'] }],
    });
  }

  private normaliseTags(tags?: string[]) {
    return tags ? [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))] : undefined;
  }

  async create(siteId: string, dto: CreateBlogDto, user: AuthUser) {
    await this.assertCategory(siteId, dto.categoryId);
    let slug: string;
    if (dto.slug) {
      if (await this.slugTaken(siteId)(dto.slug)) throw this.slugConflict();
      slug = dto.slug;
    } else slug = await uniqueSlug(dto.title, this.slugTaken(siteId));
    const content = sanitizeRichText(dto.content ?? '');
    return this.prisma.forSite(siteId).blogPost.create({
      data: {
        siteId,
        title: dto.title,
        slug,
        excerpt: dto.excerpt ?? '',
        coverImage: dto.coverImage ?? null,
        content,
        readingTime: readingTime(content),
        categoryId: dto.categoryId ?? null,
        tags: this.normaliseTags(dto.tags) ?? [],
        seo: (dto.seo ?? {}) as Prisma.InputJsonValue,
        authorId: user.id,
      },
      include: BLOG_INCLUDE,
    });
  }

  async update(siteId: string, id: string, dto: UpdateBlogDto) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    if (dto.slug && dto.slug !== before.slug && (await this.slugTaken(siteId, id)(dto.slug))) throw this.slugConflict();
    if (dto.categoryId !== undefined) await this.assertCategory(siteId, dto.categoryId);
    const content = dto.content !== undefined ? sanitizeRichText(dto.content) : undefined;
    return this.prisma.forSite(siteId).blogPost.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        coverImage: dto.coverImage,
        content,
        readingTime: content !== undefined ? readingTime(content) : undefined,
        categoryId: dto.categoryId,
        tags: this.normaliseTags(dto.tags),
        seo: dto.seo ? ({ ...((before.seo as object) ?? {}), ...dto.seo } as Prisma.InputJsonValue) : undefined,
      },
      include: BLOG_INCLUDE,
    });
  }

  async publish(siteId: string, id: string, publishedAt?: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    const when = publishedAt ? new Date(publishedAt) : new Date();
    const scheduled = when.getTime() > Date.now() + 30_000;
    return this.prisma.forSite(siteId).blogPost.update({
      where: { id },
      data: { status: scheduled ? BlogStatus.SCHEDULED : BlogStatus.PUBLISHED, publishedAt: when },
      include: BLOG_INCLUDE,
    });
  }

  async unpublish(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    return this.prisma.forSite(siteId).blogPost.update({
      where: { id },
      data: { status: BlogStatus.DRAFT },
      include: BLOG_INCLUDE,
    });
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    await this.prisma.forSite(siteId).blogPost.delete({ where: { id } });
    return { id, title: before.title };
  }
}

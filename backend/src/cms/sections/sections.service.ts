import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SectionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { setAuditHints } from '../../common/context/request-context';
import { SECTION_DEFAULTS, validateSectionContent } from './section-schemas';
import { CreateSectionDto, UpdateSectionDto } from './sections.dto';

const TYPE_LABEL: Record<SectionType, string> = {
  HERO: 'Hero',
  RICH_TEXT: 'Rich text',
  IMAGE_TEXT: 'Image & text',
  FEATURE_CARDS: 'Feature cards',
  STATS: 'Stats',
  TESTIMONIALS: 'Testimonials',
  FAQ: 'FAQ',
  CTA: 'Call to action',
  GALLERY: 'Gallery',
};

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async page(siteId: string, pageId: string) {
    const page = await this.prisma.forSite(siteId).page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found.');
    return page;
  }

  private validate(type: SectionType, content: unknown) {
    const { value, errors } = validateSectionContent(type, content);
    if (errors) throw new BadRequestException({ message: 'Validation failed', details: errors });
    return value as Prisma.InputJsonValue;
  }

  async list(siteId: string, pageId: string) {
    await this.page(siteId, pageId);
    return this.prisma
      .forSite(siteId)
      .section.findMany({ where: { pageId }, orderBy: { order: 'asc' } });
  }

  async get(siteId: string, id: string) {
    const section = await this.prisma.forSite(siteId).section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Section not found.');
    return section;
  }

  async create(siteId: string, pageId: string, dto: CreateSectionDto) {
    const page = await this.page(siteId, pageId);
    const db = this.prisma.forSite(siteId);
    const content = this.validate(dto.type, dto.content ?? SECTION_DEFAULTS[dto.type]);
    const max = await db.section.aggregate({ where: { pageId }, _max: { order: true } });
    const section = await db.section.create({
      data: {
        siteId,
        pageId,
        type: dto.type,
        name: dto.name ?? TYPE_LABEL[dto.type],
        content,
        order: (max._max.order ?? -1) + 1,
      },
    });
    setAuditHints({ after: { ...section, page: page.title } });
    return section;
  }

  async update(siteId: string, id: string, dto: UpdateSectionDto) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    return this.prisma.forSite(siteId).section.update({
      where: { id },
      data: {
        name: dto.name,
        isVisible: dto.isVisible,
        content: dto.content ? this.validate(before.type, dto.content) : undefined,
      },
    });
  }

  async duplicate(siteId: string, id: string) {
    const source = await this.get(siteId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.section.updateMany({
        where: { siteId, pageId: source.pageId, order: { gt: source.order } },
        data: { order: { increment: 1 } },
      });
      return tx.section.create({
        data: {
          siteId,
          pageId: source.pageId,
          type: source.type,
          name: `${source.name} (Copy)`.slice(0, 100),
          content: source.content as Prisma.InputJsonValue,
          order: source.order + 1,
          isVisible: source.isVisible,
        },
      });
    });
  }

  async reorder(siteId: string, pageId: string, ids: string[]) {
    await this.page(siteId, pageId);
    const existing = await this.prisma
      .forSite(siteId)
      .section.findMany({ where: { pageId }, select: { id: true } });
    const set = new Set(existing.map((s) => s.id));
    if (ids.length !== set.size || !ids.every((i) => set.has(i))) {
      throw new BadRequestException(
        'The new order must contain every section of this page exactly once.',
      );
    }
    await this.prisma.$transaction(
      ids.map((sid, index) =>
        this.prisma.section.update({ where: { id: sid, siteId }, data: { order: index } }),
      ),
    );
    setAuditHints({ entityId: pageId, after: { order: ids } });
    return this.list(siteId, pageId);
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    await this.prisma.forSite(siteId).section.delete({ where: { id } });
    return { id, name: before.name };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Site } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { randomToken, sha256 } from '../common/utils/crypto';
import { slugify, uniqueSlug } from '../common/utils/slug';
import type { AuthUser } from '../common/types';
import { CreateSiteDto, ListSitesQueryDto, UpdateSiteDto } from './dto/sites.dto';

/** Public key format: pif_<8 char prefix>_<secret>. Only the SHA-256 hash is stored. */
export function generateApiKey() {
  const prefix = randomToken(6).replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();
  const key = `pif_${prefix}_${randomToken(24)}`;
  return { key, hash: sha256(key), prefix: `pif_${prefix}` };
}

export function presentAdminSite(s: Site & { _count?: Record<string, number> }) {
  const { apiKeyHash: _h, ...rest } = s;
  return rest;
}

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: ListSitesQueryDto) {
    const where: Prisma.SiteWhereInput = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' } },
            { slug: { contains: q.search, mode: 'insensitive' } },
            { domain: { contains: q.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.site.findMany({
        where,
        orderBy: { createdAt: q.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: { _count: { select: { pages: true, blogPosts: true, leads: true, users: true } } },
        ...skipTake(q),
      }),
      this.prisma.site.count({ where }),
    ]);
    return paginate(rows.map(presentAdminSite), total, q);
  }

  async get(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: { _count: { select: { pages: true, blogPosts: true, leads: true, users: true } } },
    });
    if (!site) throw new NotFoundException('Website not found.');
    return site;
  }

  async create(dto: CreateSiteDto, actor: AuthUser) {
    const slug =
      dto.slug ??
      (await uniqueSlug(
        dto.name,
        async (s) => !!(await this.prisma.site.findUnique({ where: { slug: s } })),
      ));
    if (dto.slug && (await this.prisma.site.findUnique({ where: { slug } }))) {
      throw new ConflictException({
        message: 'This slug is already used by another website.',
        details: [{ field: 'slug', errors: ['This slug is already used by another website.'] }],
      });
    }
    const { key, hash, prefix } = generateApiKey();
    const site = await this.prisma.site.create({
      data: {
        name: dto.name,
        slug,
        domain: dto.domain ?? null,
        logoUrl: dto.logoUrl ?? null,
        faviconUrl: dto.faviconUrl ?? null,
        primaryColor: dto.primaryColor ?? '#4A4A89',
        defaultLanguage: dto.defaultLanguage ?? 'en',
        isActive: dto.isActive ?? true,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        seoSetting: { create: { titleTemplate: `%s | ${dto.name}` } },
      },
    });
    await this.audit.log({
      action: 'site.created',
      entityType: 'site',
      entityId: site.id,
      summary: `${actor.name} created website "${site.name}"`,
      after: presentAdminSite(site),
      site: { id: site.id, name: site.name },
    });
    return { site: presentAdminSite(site), apiKey: key };
  }

  async update(id: string, dto: UpdateSiteDto, actor: AuthUser) {
    const before = await this.get(id);
    if (
      dto.slug &&
      dto.slug !== before.slug &&
      (await this.prisma.site.findUnique({ where: { slug: dto.slug } }))
    ) {
      throw new ConflictException({
        message: 'This slug is already used by another website.',
        details: [{ field: 'slug', errors: ['This slug is already used by another website.'] }],
      });
    }
    const site = await this.prisma.site.update({
      where: { id },
      data: { ...dto, slug: dto.slug ? slugify(dto.slug) : undefined },
    });
    const statusChanged = dto.isActive !== undefined && dto.isActive !== before.isActive;
    await this.audit.log({
      action: statusChanged
        ? site.isActive
          ? 'site.activated'
          : 'site.deactivated'
        : 'site.updated',
      entityType: 'site',
      entityId: id,
      summary: `${actor.name} ${statusChanged ? (site.isActive ? 'activated' : 'deactivated') : 'updated'} website "${site.name}"`,
      before: presentAdminSite(before),
      after: presentAdminSite(site),
      site: { id: site.id, name: site.name },
    });
    return presentAdminSite(site);
  }

  async regenerateKey(id: string, actor: AuthUser) {
    const site = await this.get(id);
    const { key, hash, prefix } = generateApiKey();
    await this.prisma.site.update({
      where: { id },
      data: { apiKeyHash: hash, apiKeyPrefix: prefix },
    });
    await this.audit.log({
      action: 'site.api_key_regenerated',
      entityType: 'site',
      entityId: id,
      summary: `${actor.name} regenerated the public API key of "${site.name}"`,
      site: { id: site.id, name: site.name },
    });
    return { apiKey: key, apiKeyPrefix: prefix };
  }

  async remove(id: string, confirmName: string | undefined, actor: AuthUser) {
    const site = await this.get(id);
    if (confirmName !== site.name) {
      throw new BadRequestException('Type the website name exactly to confirm deletion.');
    }
    await this.prisma.site.delete({ where: { id } });
    await this.audit.log({
      action: 'site.deleted',
      entityType: 'site',
      entityId: id,
      summary: `${actor.name} deleted website "${site.name}" and all of its content`,
      before: presentAdminSite(site),
      site: { id: site.id, name: site.name },
    });
  }
}

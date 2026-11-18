import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { BlogStatus, LeadStatus, PageStatus, Prisma, Role, Site, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentSite, CurrentUser, RequirePermission, SiteScoped } from '../common/decorators';
import { Permission } from '../common/permissions';
import type { AuthUser } from '../common/types';

export class StatsQueryDto {
  @ApiPropertyOptional({
    description: 'Browser timezone offset in minutes (Date#getTimezoneOffset)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-840)
  @Max(840)
  tzOffset = 0;
}

const DAY = 86_400_000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(site: Site, user: AuthUser, tzOffset: number) {
    const db = this.prisma.forSite(site.id);
    const now = new Date();
    // Day buckets are computed in the viewer's local time.
    const localNow = new Date(now.getTime() - tzOffset * 60_000);
    const monthStart = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1) + tzOffset * 60_000,
    );
    const lastMonthStart = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - 1, 1) + tzOffset * 60_000,
    );
    const todayStartLocal = Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
    );
    const rangeStart = new Date(todayStartLocal - 29 * DAY + tzOffset * 60_000);
    const isSuper = user.role === Role.SUPER_ADMIN;

    const [
      publishedPages,
      totalPages,
      publishedPosts,
      totalPosts,
      leadsThisMonth,
      leadsLastMonth,
      totalLeads,
      activeUsers,
      recentLeadRows,
      leadRange,
      byStatus,
      recentActivity,
    ] = await Promise.all([
      db.page.count({ where: { status: PageStatus.PUBLISHED } }),
      db.page.count(),
      db.blogPost.count({
        where: {
          status: { in: [BlogStatus.PUBLISHED, BlogStatus.SCHEDULED] },
          publishedAt: { lte: now },
        },
      }),
      db.blogPost.count(),
      db.lead.count({ where: { createdAt: { gte: monthStart } } }),
      db.lead.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
      db.lead.count(),
      this.prisma.user.count({
        where: {
          status: { not: UserStatus.INACTIVE },
          OR: [{ role: Role.SUPER_ADMIN }, { sites: { some: { siteId: site.id } } }],
        },
      }),
      db.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          email: true,
          formName: true,
          status: true,
          createdAt: true,
        },
      }),
      db.lead.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
      db.lead.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.activityLog.findMany({
        where: isSuper ? { OR: [{ siteId: site.id }, { siteId: null }] } : { actorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          action: true,
          summary: true,
          actorName: true,
          actorRole: true,
          siteName: true,
          createdAt: true,
        },
      }),
    ]);

    const buckets = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      buckets.set(new Date(todayStartLocal - (29 - i) * DAY).toISOString().slice(0, 10), 0);
    }
    for (const l of leadRange) {
      const key = new Date(l.createdAt.getTime() - tzOffset * 60_000).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const statusCounts = Object.values(LeadStatus).map((status) => ({
      status,
      count:
        (byStatus.find((b) => b.status === status)?._count as { _all: number } | undefined)?._all ??
        0,
    }));

    return {
      site: { id: site.id, name: site.name, primaryColor: site.primaryColor },
      kpis: {
        publishedPages,
        totalPages,
        publishedPosts,
        totalPosts,
        leadsThisMonth,
        leadsLastMonth,
        totalLeads,
        activeUsers,
      },
      leadsOverTime: [...buckets.entries()].map(([date, count]) => ({ date, count })),
      leadsByStatus: statusCounts,
      recentLeads: recentLeadRows,
      recentActivity,
      crossSite: isSuper ? await this.crossSite() : null,
    };
  }

  private async crossSite() {
    const sites = await this.prisma.site.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        isActive: true,
        _count: { select: { pages: true, blogPosts: true, leads: true, users: true } },
      },
    });
    const monthAgo = new Date(Date.now() - 30 * DAY);
    const recent = await this.prisma.lead.groupBy({
      by: ['siteId'],
      where: { createdAt: { gte: monthAgo } } satisfies Prisma.LeadWhereInput,
      _count: { _all: true },
      orderBy: { siteId: 'asc' },
    });
    const [totalUsers, totalSites] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.site.count(),
    ]);
    return {
      totalSites,
      totalUsers,
      sites: sites.map((s) => ({
        ...s,
        leads30d:
          (recent.find((r) => r.siteId === s.id)?._count as { _all: number } | undefined)?._all ??
          0,
      })),
    };
  }
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Site-Id', required: true })
@SiteScoped()
@RequirePermission(Permission.CONTENT_READ)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats(@CurrentSite() site: Site, @CurrentUser() user: AuthUser, @Query() q: StatsQueryDto) {
    return this.dashboard.stats(site, user, q.tzOffset);
  }
}

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}

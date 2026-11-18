import { Controller, Get, Header, Injectable, Module, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { RequirePermission } from '../common/decorators';
import { Permission } from '../common/permissions';
import { paginate, PaginationQueryDto, skipTake } from '../common/dto/pagination.dto';
import { toCsv } from '../common/utils/csv';

export class LogFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  actorId?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Website id, or "global" for actions without a website' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  siteId?: string;

  @ApiPropertyOptional({ example: 'page.published' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @ApiPropertyOptional({ example: 'page' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private where(q: LogFiltersDto): Prisma.ActivityLogWhereInput {
    const to = q.dateTo ? new Date(q.dateTo) : undefined;
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(q.dateTo!)) to.setUTCHours(23, 59, 59, 999);
    return {
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.role ? { actorRole: q.role } : {}),
      ...(q.siteId ? { siteId: q.siteId === 'global' ? null : q.siteId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.dateFrom || to
        ? { createdAt: { gte: q.dateFrom ? new Date(q.dateFrom) : undefined, lte: to } }
        : {}),
      ...(q.search
        ? {
            OR: [
              { summary: { contains: q.search, mode: 'insensitive' } },
              { actorEmail: { contains: q.search, mode: 'insensitive' } },
              { actorName: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(q: LogFiltersDto) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: [{ createdAt: q.sortOrder ?? 'desc' }, { id: 'asc' }],
        ...skipTake(q),
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async facets() {
    const [actions, entities, actors] = await Promise.all([
      this.prisma.activityLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.activityLog.findMany({
        distinct: ['entityType'],
        where: { entityType: { not: null } },
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
      this.prisma.activityLog.findMany({
        distinct: ['actorId'],
        where: { actorId: { not: null } },
        select: { actorId: true, actorName: true, actorEmail: true },
        orderBy: { actorId: 'asc' },
      }),
    ]);
    return {
      actions: actions.map((a) => a.action),
      entityTypes: entities.map((e) => e.entityType),
      actors: actors.sort((a, b) => (a.actorName ?? '').localeCompare(b.actorName ?? '')),
    };
  }

  async exportCsv(q: LogFiltersDto) {
    const rows = await this.prisma.activityLog.findMany({
      where: this.where(q),
      orderBy: { createdAt: 'desc' },
      take: 20_000,
    });
    await this.audit.log({
      action: 'activity_log.exported',
      entityType: 'activity_log',
      summary: `Exported ${rows.length} activity log entries to CSV`,
      after: { count: rows.length },
      site: null,
    });
    return toCsv(
      [
        'Timestamp (UTC)',
        'Actor',
        'Actor email',
        'Role',
        'Website',
        'Action',
        'Entity',
        'Entity id',
        'Summary',
        'IP',
        'Request id',
        'Before',
        'After',
      ],
      rows.map((r) => [
        r.createdAt,
        r.actorName,
        r.actorEmail,
        r.actorRole,
        r.siteName ?? 'Global',
        r.action,
        r.entityType,
        r.entityId,
        r.summary,
        r.ip,
        r.requestId,
        r.before,
        r.after,
      ]),
    );
  }
}

/** Activity logs are append-only: there are deliberately no update or delete endpoints. */
@ApiTags('Activity logs')
@ApiBearerAuth()
@RequirePermission(Permission.LOGS_VIEW)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly logs: ActivityLogsService) {}

  @Get()
  list(@Query() q: LogFiltersDto) {
    return this.logs.list(q);
  }

  @Get('facets')
  facets() {
    return this.logs.facets();
  }

  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async export(@Query() q: LogFiltersDto, @Res({ passthrough: true }) res: Response) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return '﻿' + (await this.logs.exportCsv(q));
  }
}

@Module({ controllers: [ActivityLogsController], providers: [ActivityLogsService] })
export class ActivityLogsModule {}

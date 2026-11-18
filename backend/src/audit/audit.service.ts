import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/context/request-context';
import { diffObjects, sanitizeForLog } from '../common/utils/object';

export interface AuditEntry {
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  /** Defaults to the authenticated actor in the request context. */
  actor?: { id: string; name: string; email: string; role: Role } | null;
  /** Defaults to the active site in the request context. Pass null for global actions. */
  site?: { id: string; name: string } | null;
}

const toJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull =>
  v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);

/** Append-only activity log writer. Never throws into the calling request. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    const ctx = getRequestContext();
    const actor = entry.actor === undefined ? ctx?.actor : entry.actor;
    const site = entry.site === undefined ? ctx?.site : entry.site;

    const before = sanitizeForLog(entry.before) as Record<string, unknown> | null;
    const after = sanitizeForLog(entry.after) as Record<string, unknown> | null;
    const isObj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
    const diff =
      isObj(before) && isObj(after) ? diffObjects(before, after) : { before, after };

    try {
      await this.prisma.activityLog.create({
        data: {
          action: entry.action,
          summary: entry.summary.slice(0, 500),
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: toJson(diff.before),
          after: toJson(diff.after),
          actorId: actor?.id,
          actorName: actor?.name,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          siteId: site?.id,
          siteName: site?.name,
          ip: ctx?.ip,
          userAgent: ctx?.userAgent,
          requestId: ctx?.requestId,
        },
      });
    } catch (err) {
      this.logger.error({ err, action: entry.action }, 'Failed to write activity log');
    }
  }
}

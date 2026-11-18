import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { setAuditHints } from '../../common/context/request-context';
import { toCsv } from '../../common/utils/csv';
import type { AuthUser } from '../../common/types';
import { LeadFiltersDto } from './leads.dto';

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  LOST: 'Lost',
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private where(q: LeadFiltersDto): Prisma.LeadWhereInput {
    const to = q.dateTo ? new Date(q.dateTo) : undefined;
    // A bare date as the upper bound means "through the end of that day".
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(q.dateTo!)) to.setUTCHours(23, 59, 59, 999);
    return {
      ...(q.formId ? { formId: q.formId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.dateFrom || to ? { createdAt: { gte: q.dateFrom ? new Date(q.dateFrom) : undefined, lte: to } } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search } },
              { formName: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(siteId: string, q: LeadFiltersDto) {
    const db = this.prisma.forSite(siteId);
    const where = this.where(q);
    const [rows, total, grouped] = await Promise.all([
      db.lead.findMany({
        where,
        include: { _count: { select: { notes: true } } },
        orderBy: [{ [q.sortBy]: { sort: q.sortOrder ?? (q.sortBy === 'name' ? 'asc' : 'desc'), nulls: 'last' } }, { id: 'asc' }],
        ...skipTake(q),
      }),
      db.lead.count({ where }),
      db.lead.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
    ]);
    const counts = Object.fromEntries(Object.keys(STATUS_LABEL).map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const g of grouped) counts[g.status] = (g._count as { _all: number })._all;
    return { ...paginate(rows, total, q), counts };
  }

  async get(siteId: string, id: string) {
    const lead = await this.prisma.forSite(siteId).lead.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        form: { select: { id: true, name: true, fields: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found.');
    return lead;
  }

  async setStatus(siteId: string, id: string, status: LeadStatus, user: AuthUser) {
    const before = await this.get(siteId, id);
    const lead = await this.prisma.forSite(siteId).lead.update({ where: { id }, data: { status } });
    setAuditHints({
      before: { status: before.status },
      after: { id, status },
      summary: `${user.name} moved lead ${before.name ?? before.email ?? id.slice(0, 8)} from ${STATUS_LABEL[before.status]} to ${STATUS_LABEL[status]}`,
    });
    return lead;
  }

  async addNote(siteId: string, id: string, body: string, user: AuthUser) {
    const lead = await this.get(siteId, id);
    const note = await this.prisma.forSite(siteId).leadNote.create({
      data: { siteId, leadId: id, authorId: user.id, authorName: user.name, body },
    });
    setAuditHints({
      entityId: id,
      summary: `${user.name} added a note to lead ${lead.name ?? lead.email ?? id.slice(0, 8)}`,
    });
    return note;
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before: { ...before, notes: before.notes.length } });
    await this.prisma.forSite(siteId).lead.delete({ where: { id } });
    return { id, name: before.name ?? before.email ?? 'lead' };
  }

  async exportCsv(siteId: string, siteName: string, q: LeadFiltersDto): Promise<{ csv: string; count: number }> {
    const rows = await this.prisma.forSite(siteId).lead.findMany({
      where: this.where(q),
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });
    const dataKeys = [...new Set(rows.flatMap((r) => Object.keys((r.data as Record<string, unknown>) ?? {})))];
    const csv = toCsv(
      ['Submitted at (UTC)', 'Form', 'Status', 'Name', 'Email', 'Phone', 'Source page', ...dataKeys],
      rows.map((r) => {
        const d = (r.data as Record<string, unknown>) ?? {};
        return [r.createdAt, r.formName, STATUS_LABEL[r.status], r.name, r.email, r.phone, r.sourcePage, ...dataKeys.map((k) => d[k])];
      }),
    );
    await this.audit.log({
      action: 'lead.exported',
      entityType: 'lead',
      summary: `Exported ${rows.length} lead${rows.length === 1 ? '' : 's'} from ${siteName} to CSV`,
      after: { filters: { ...q, page: undefined, pageSize: undefined }, count: rows.length },
    });
    return { csv, count: rows.length };
  }
}

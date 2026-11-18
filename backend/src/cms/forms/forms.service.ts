import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { setAuditHints } from '../../common/context/request-context';
import { CreateFormDto, FormFieldDto, UpdateFormDto } from './forms.dto';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  list(siteId: string) {
    return this.prisma.forSite(siteId).form.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { leads: true } } },
    });
  }

  async get(siteId: string, id: string) {
    const form = await this.prisma.forSite(siteId).form.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } } },
    });
    if (!form) throw new NotFoundException('Form not found.');
    return form;
  }

  private validateFields(fields: FormFieldDto[]) {
    const errors: { field: string; errors: string[] }[] = [];
    const seen = new Set<string>();
    fields.forEach((f, i) => {
      if (seen.has(f.name))
        errors.push({ field: `fields.${i}.name`, errors: [`Duplicate field key "${f.name}".`] });
      seen.add(f.name);
      if ((f.type === 'select' || f.type === 'radio') && !(f.options?.length ?? 0)) {
        errors.push({
          field: `fields.${i}.options`,
          errors: [`"${f.label}" needs at least one option.`],
        });
      }
      if (f.minLength && f.maxLength && f.minLength > f.maxLength) {
        errors.push({
          field: `fields.${i}.minLength`,
          errors: ['Minimum length cannot exceed maximum length.'],
        });
      }
      if (f.pattern) {
        try {
          new RegExp(f.pattern);
        } catch {
          errors.push({ field: `fields.${i}.pattern`, errors: ['Invalid regular expression.'] });
        }
      }
    });
    if (errors.length)
      throw new BadRequestException({ message: 'Validation failed', details: errors });
    return fields.map((f) => ({
      ...f,
      options: f.options?.map((o) => o.trim()),
    })) as unknown as Prisma.InputJsonValue;
  }

  private async assertKeyFree(siteId: string, key: string, excludeId?: string) {
    const clash = await this.prisma
      .forSite(siteId)
      .form.findFirst({ where: { key, id: { not: excludeId } } });
    if (clash) {
      throw new ConflictException({
        message: 'Another form on this website already uses this key.',
        details: [
          { field: 'key', errors: ['Another form on this website already uses this key.'] },
        ],
      });
    }
  }

  async create(siteId: string, dto: CreateFormDto) {
    await this.assertKeyFree(siteId, dto.key);
    return this.prisma.forSite(siteId).form.create({
      data: {
        siteId,
        name: dto.name,
        key: dto.key,
        description: dto.description ?? '',
        fields: this.validateFields(dto.fields),
        successMessage: dto.successMessage,
        notificationEmail: dto.notificationEmail ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(siteId: string, id: string, dto: UpdateFormDto) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    if (dto.key && dto.key !== before.key) await this.assertKeyFree(siteId, dto.key, id);
    return this.prisma.forSite(siteId).form.update({
      where: { id },
      data: {
        name: dto.name,
        key: dto.key,
        description: dto.description,
        fields: dto.fields ? this.validateFields(dto.fields) : undefined,
        successMessage: dto.successMessage,
        notificationEmail: dto.notificationEmail,
        isActive: dto.isActive,
      },
    });
  }

  async remove(siteId: string, id: string) {
    const before = await this.get(siteId, id);
    setAuditHints({ before });
    await this.prisma.forSite(siteId).form.delete({ where: { id } });
    return { id, name: before.name };
  }
}

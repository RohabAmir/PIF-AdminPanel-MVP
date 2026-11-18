import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BlogStatus, PageStatus, Prisma, Site } from '@prisma/client';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { getRequestContext } from '../common/context/request-context';
import { paginate, PaginationQueryDto, skipTake } from '../common/dto/pagination.dto';
import { extractContact, FormField, validateSubmission } from '../cms/forms/form-fields';

type SeoJson = {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
};

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  /** Uploaded files are stored as `/uploads/...`; external consumers need absolute URLs. */
  private abs<T>(value: T): T {
    const base = this.config.get('API_PUBLIC_URL').replace(/\/$/, '');
    const walk = (v: unknown): unknown => {
      if (typeof v === 'string') return v.startsWith('/uploads/') ? `${base}${v}` : v;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      }
      return v;
    };
    return walk(value) as T;
  }

  private publishedBlogWhere(): Prisma.BlogPostWhereInput {
    return {
      status: { in: [BlogStatus.PUBLISHED, BlogStatus.SCHEDULED] },
      publishedAt: { lte: new Date() },
    };
  }

  async pages(site: Site) {
    const pages = await this.prisma.forSite(site.id).page.findMany({
      where: { status: PageStatus.PUBLISHED },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        parentId: true,
        order: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return { data: pages };
  }

  async page(site: Site, slug: string) {
    const page = await this.prisma.forSite(site.id).page.findFirst({
      where: { slug, status: PageStatus.PUBLISHED },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
          select: { id: true, type: true, name: true, content: true, order: true },
        },
      },
    });
    if (!page) throw new NotFoundException('Page not found.');
    const { createdById: _c, siteId: _s, ...rest } = page;
    return this.abs({
      ...rest,
      seo: await this.seoFor(site, page.title, page.seo as SeoJson | null, `/${page.slug}`),
    });
  }

  async blogs(site: Site, q: PaginationQueryDto & { category?: string }) {
    const db = this.prisma.forSite(site.id);
    const where: Prisma.BlogPostWhereInput = {
      ...this.publishedBlogWhere(),
      ...(q.category ? { category: { slug: q.category } } : {}),
    };
    const [rows, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          tags: true,
          readingTime: true,
          publishedAt: true,
          category: { select: { name: true, slug: true } },
          author: { select: { name: true } },
        },
        ...skipTake(q),
      }),
      db.blogPost.count({ where }),
    ]);
    return this.abs(paginate(rows, total, q));
  }

  async blog(site: Site, slug: string) {
    const post = await this.prisma.forSite(site.id).blogPost.findFirst({
      where: { slug, ...this.publishedBlogWhere() },
      include: {
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });
    if (!post) throw new NotFoundException('Blog post not found.');
    const { siteId: _s, authorId: _a, categoryId: _c, status: _st, ...rest } = post;
    return this.abs({
      ...rest,
      seo: await this.seoFor(
        site,
        post.title,
        post.seo as SeoJson | null,
        `/blog/${post.slug}`,
        post.excerpt,
      ),
    });
  }

  async socialLinks(site: Site) {
    const links = await this.prisma.forSite(site.id).socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { platform: true, url: true, order: true },
    });
    return { data: links };
  }

  private async seoFor(
    site: Site,
    title: string,
    seo: SeoJson | null,
    path: string,
    fallbackDescription?: string,
  ) {
    const settings = await this.prisma.forSite(site.id).seoSetting.findFirst();
    const s = seo ?? {};
    const template = settings?.titleTemplate ?? '%s';
    const metaTitle = template.replace('%s', s.metaTitle || title);
    const description =
      s.metaDescription || fallbackDescription || settings?.defaultMetaDescription || '';
    const base = settings?.canonicalBaseUrl?.replace(/\/$/, '');
    return this.abs({
      title: metaTitle,
      description,
      canonical: s.canonicalUrl || (base ? `${base}${path === '/home' ? '/' : path}` : null),
      robots: s.noindex ? 'noindex, nofollow' : 'index, follow',
      og: {
        title: s.ogTitle || s.metaTitle || title,
        description: s.ogDescription || description,
        image: s.ogImage || settings?.defaultOgImage || null,
      },
      googleSiteVerification: settings?.googleVerification ?? null,
    });
  }

  async seo(site: Site, pageSlug: string) {
    const page = await this.prisma
      .forSite(site.id)
      .page.findFirst({ where: { slug: pageSlug, status: PageStatus.PUBLISHED } });
    if (!page) throw new NotFoundException('Page not found.');
    return this.seoFor(site, page.title, page.seo as SeoJson | null, `/${page.slug}`);
  }

  private async activeForm(site: Site, key: string) {
    const form = await this.prisma
      .forSite(site.id)
      .form.findFirst({ where: { key, isActive: true } });
    if (!form) throw new NotFoundException('Form not found.');
    return form;
  }

  async form(site: Site, key: string) {
    const f = await this.activeForm(site, key);
    return {
      key: f.key,
      name: f.name,
      description: f.description,
      fields: f.fields,
      successMessage: f.successMessage,
    };
  }

  async submit(
    site: Site,
    key: string,
    data: Record<string, unknown>,
    sourcePage?: string,
    honeypot?: string,
  ) {
    const form = await this.activeForm(site, key);
    // Bots fill hidden fields: pretend success, store nothing.
    if (honeypot) return { success: true, message: form.successMessage };
    const fields = form.fields as unknown as FormField[];
    const { values, errors } = validateSubmission(fields, data);
    if (errors.length)
      throw new BadRequestException({
        message: 'Please correct the highlighted fields.',
        details: errors,
      });
    const contact = extractContact(fields, values);
    const ctx = getRequestContext();
    const lead = await this.prisma.forSite(site.id).lead.create({
      data: {
        siteId: site.id,
        formId: form.id,
        formName: form.name,
        data: values as Prisma.InputJsonValue,
        ...contact,
        sourcePage: sourcePage?.slice(0, 500),
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
    await this.audit.log({
      action: 'lead.created',
      entityType: 'lead',
      entityId: lead.id,
      summary: `New lead from ${contact.name ?? contact.email ?? 'a visitor'} via "${form.name}"`,
      after: { formName: form.name, name: contact.name, email: contact.email, sourcePage },
      actor: null,
    });
    if (form.notificationEmail) {
      const sent = await this.mail.send(
        form.notificationEmail,
        `New lead: ${form.name} — ${site.name}`,
        'lead-notification',
        {
          formName: form.name,
          siteName: site.name,
          fields: fields.map((f) => ({
            label: f.label,
            value: Array.isArray(values[f.name])
              ? (values[f.name] as string[]).join(', ')
              : String(values[f.name] ?? ''),
          })),
          leadsUrl: `${this.config.get('FRONTEND_URL')}/leads`,
        },
      );
      if (!sent) this.logger.warn({ formId: form.id }, 'Lead notification email not delivered');
    }
    return { success: true, message: form.successMessage, id: lead.id };
  }
}

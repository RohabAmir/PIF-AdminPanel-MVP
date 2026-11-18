/**
 * Idempotent demo seed: safe to run repeatedly. Users and websites are upserted;
 * content is only created for websites that have no pages yet; activity logs only
 * when the log table is empty.
 */
import { BlogStatus, Prisma, PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { DAN, FORMS, IMAGES, LEAD_MESSAGES, LEAD_PEOPLE, LEAD_STATUS_POOL, SeedSite, TUAJA } from './seed-data';

const prisma = new PrismaClient();
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const DAY = 86_400_000;
const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@12345';

// Deterministic PRNG so every fresh seed produces the same demo data.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pickOne = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function upsertSite(s: SeedSite) {
  const apiKey = process.env[`SEED_${s.slug.split('-')[0].toUpperCase()}_API_KEY`] ?? s.apiKey;
  return prisma.site.upsert({
    where: { slug: s.slug },
    update: {},
    create: {
      name: s.name,
      slug: s.slug,
      domain: s.domain,
      primaryColor: s.primaryColor,
      defaultLanguage: 'en',
      apiKeyHash: sha256(apiKey),
      apiKeyPrefix: apiKey.split('_').slice(0, 2).join('_'),
      seoSetting: {
        create: { ...s.seo, robotsTxt: 'User-agent: *\nAllow: /\nSitemap: ' + s.seo.canonicalBaseUrl + '/sitemap.xml' },
      },
    },
  });
}

async function seedContent(siteId: string, s: SeedSite, authors: Record<string, string>) {
  if ((await prisma.page.count({ where: { siteId } })) > 0) return false;

  for (const [order, p] of s.pages.entries()) {
    await prisma.page.create({
      data: {
        siteId,
        title: p.title,
        slug: p.slug,
        status: p.status,
        order,
        seo: (p.seo ?? {}) as Prisma.InputJsonValue,
        publishedAt: p.status === 'PUBLISHED' ? new Date(Date.now() - (30 - order) * DAY) : null,
        createdById: authors.admin,
        sections: {
          create: p.sections.map((sec, i) => ({
            siteId,
            type: sec.type,
            name: sec.name,
            content: sec.content as Prisma.InputJsonValue,
            order: i,
            isVisible: sec.isVisible ?? true,
          })),
        },
      },
    });
  }

  const categories = new Map<string, string>();
  for (const name of s.categories) {
    const c = await prisma.blogCategory.create({ data: { siteId, name, slug: slugify(name) } });
    categories.set(name, c.id);
  }
  for (const b of s.blogs) {
    const html = b.paragraphs.map((p) => `<p>${p}</p>`).join('') + '<blockquote><p>Demo content — all names and places are fictional.</p></blockquote>';
    const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    await prisma.blogPost.create({
      data: {
        siteId,
        title: b.title,
        slug: slugify(b.title),
        excerpt: b.excerpt,
        coverImage: b.cover,
        content: html,
        readingTime: Math.max(1, Math.ceil(words / 200)),
        tags: b.tags,
        categoryId: categories.get(b.category),
        authorId: authors[b.author],
        status: b.status,
        publishedAt: b.status === BlogStatus.DRAFT ? null : new Date(Date.now() - b.daysAgo * DAY),
        seo: { metaTitle: b.title.slice(0, 60), metaDescription: b.excerpt } as Prisma.InputJsonValue,
      },
    });
  }

  const forms = [];
  for (const f of FORMS) {
    forms.push(
      await prisma.form.create({
        data: {
          siteId,
          key: f.key,
          name: f.name,
          description: f.description,
          successMessage: f.successMessage,
          fields: f.fields as unknown as Prisma.InputJsonValue,
          notificationEmail: `leads@${s.domain}`,
        },
      }),
    );
  }

  const leadCount = s === TUAJA ? 30 : 26;
  const domain = ['example.com', 'mail.example.org', 'demo.example.net'];
  for (let i = 0; i < leadCount; i++) {
    const [name, handle] = LEAD_PEOPLE[(i * 7 + (s === TUAJA ? 0 : 3)) % LEAD_PEOPLE.length];
    const form = i % 3 === 0 ? forms[1] : forms[0];
    const email = `${handle}@${pickOne(domain)}`;
    const phone = `+971 5${Math.floor(rand() * 10)} ${String(Math.floor(rand() * 9_000_000) + 1_000_000)}`;
    const createdAt = new Date(Date.now() - Math.floor(rand() * 29 * DAY) - Math.floor(rand() * 8 * 3_600_000));
    const data =
      form.key === 'contact'
        ? { name, email, phone, topic: pickOne(['General', 'Bookings', 'Partnerships', 'Media']), message: pickOne(LEAD_MESSAGES), consent: true }
        : { name, email, phone, guests: pickOne(['1', '2', '3-4', '5+']), interests: ['Hiking', 'Spa'].slice(0, 1 + Math.floor(rand() * 2)), notes: pickOne(LEAD_MESSAGES) };
    const status = pickOne(LEAD_STATUS_POOL);
    await prisma.lead.create({
      data: {
        siteId,
        formId: form.id,
        formName: form.name,
        data: data as Prisma.InputJsonValue,
        name,
        email,
        phone,
        status,
        sourcePage: form.key === 'contact' ? '/contact' : pickOne(['/eco-resorts', '/adventure-resorts', '/']),
        createdAt,
        updatedAt: createdAt,
        notes:
          status !== 'NEW'
            ? { create: [{ siteId, authorId: authors.editor, authorName: 'Lina Farouk', body: 'Called the guest — sent brochure and rates.', createdAt: new Date(createdAt.getTime() + DAY / 2) }] }
            : undefined,
      },
    });
  }

  await prisma.socialLink.createMany({
    data: s.social.map((l, order) => ({ siteId, platform: l.platform, url: l.url, order })),
  });
  await prisma.mediaAsset.createMany({
    data: Object.entries(IMAGES)
      .slice(0, s === TUAJA ? 9 : 6)
      .map(([key, url], i) => ({
        siteId,
        url,
        storage: 'external',
        filename: `${key}.jpg`,
        mimeType: 'image/jpeg',
        alt: key.charAt(0).toUpperCase() + key.slice(1),
        uploadedById: authors.admin,
        createdAt: new Date(Date.now() - (20 - i) * DAY),
      })),
  });
  return true;
}

async function seedLogs(users: { id: string; name: string; email: string; role: Role }[], sites: { id: string; name: string }[]) {
  if ((await prisma.activityLog.count()) > 0) return;
  const [sa, admin, editor, viewer] = users;
  const templates: [typeof sa, string, string, string, boolean][] = [
    [sa, 'auth.login', 'user', '{a} signed in', false],
    [admin, 'auth.login', 'user', '{a} signed in', false],
    [editor, 'auth.login', 'user', '{a} signed in', false],
    [viewer, 'auth.login', 'user', '{a} signed in', false],
    [editor, 'page.updated', 'page', '{a} updated page "About Us"', true],
    [admin, 'page.published', 'page', '{a} published page "Eco Resorts"', true],
    [editor, 'blog.created', 'blog', '{a} created blog "Five valley trails for every fitness level"', true],
    [admin, 'blog.published', 'blog', '{a} published blog "Stargazing season opens this month"', true],
    [editor, 'section.reordered', 'section', '{a} reordered sections on "Home"', true],
    [editor, 'lead.status_changed', 'lead', '{a} moved a lead from New to Contacted', true],
    [admin, 'lead.exported', 'lead', 'Exported 24 leads to CSV', true],
    [admin, 'seo.updated', 'seo_settings', '{a} updated SEO settings', true],
    [admin, 'social.updated', 'social_link', '{a} updated social link "INSTAGRAM"', true],
    [sa, 'user.created', 'user', '{a} added Editor Hana Saleh (hana.saleh@pifdemo.com)', false],
    [sa, 'user.role_changed', 'user', "{a} changed Khalid Nasser's role from Editor to Viewer", false],
    [sa, 'user.deactivated', 'user', '{a} deactivated Khalid Nasser', false],
    [editor, 'media.uploaded', 'media', '{a} uploaded media "lodge-suite.jpg"', true],
    [viewer, 'auth.logout', 'user', '{a} signed out', false],
    [admin, 'auth.login_failed', 'user', 'Failed sign-in attempt for admin@pifdemo.com (1/5)', false],
  ];
  const rows: Prisma.ActivityLogCreateManyInput[] = [];
  for (let i = 0; i < 56; i++) {
    const [actor, action, entityType, summary, scoped] = templates[i % templates.length];
    const site = scoped ? sites[i % sites.length] : null;
    rows.push({
      createdAt: new Date(Date.now() - (56 - i) * 12 * 3_600_000 - Math.floor(rand() * 3_600_000)),
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      siteId: site?.id,
      siteName: site?.name,
      action,
      entityType,
      summary: summary.replace('{a}', actor.name),
      before: action.endsWith('updated') || action.endsWith('status_changed') ? { status: 'DRAFT' } : undefined,
      after: action.endsWith('updated') || action.endsWith('status_changed') ? { status: 'PUBLISHED' } : undefined,
      ip: '127.0.0.1',
      userAgent: 'Seed script',
      requestId: `seed-${i}`,
    });
  }
  await prisma.activityLog.createMany({ data: rows });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, ROUNDS);
  const tuaja = await upsertSite(TUAJA);
  const dan = await upsertSite(DAN);

  const demo = [
    { email: 'superadmin@pifdemo.com', name: 'Sara Al-Mansour', role: Role.SUPER_ADMIN, sites: [], color: '#4A4A89' },
    { email: 'admin@pifdemo.com', name: 'Omar Haddad', role: Role.ADMIN, sites: [tuaja.id, dan.id], color: '#7549AD' },
    { email: 'editor@pifdemo.com', name: 'Lina Farouk', role: Role.EDITOR, sites: [tuaja.id], color: '#26BF94' },
    { email: 'viewer@pifdemo.com', name: 'Yousef Karim', role: Role.VIEWER, sites: [dan.id], color: '#824703' },
  ];
  const users = [];
  for (const u of demo) {
    users.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          name: u.name,
          role: u.role,
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
          passwordHash,
          avatarColor: u.color,
          lastLoginAt: new Date(Date.now() - Math.floor(rand() * 5 * DAY)),
          sites: { create: u.sites.map((siteId) => ({ siteId })) },
        },
      }),
    );
  }
  // Two extra users so the Users screen shows every status.
  const unusable = await bcrypt.hash(`unused-${Date.now()}-Aa1!`, ROUNDS);
  await prisma.user.upsert({
    where: { email: 'hana.saleh@pifdemo.com' },
    update: {},
    create: {
      email: 'hana.saleh@pifdemo.com',
      name: 'Hana Saleh',
      role: Role.EDITOR,
      status: UserStatus.PENDING,
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(Date.now() + 7 * DAY),
      passwordHash: unusable,
      avatarColor: '#23B7E5',
      sites: { create: [{ siteId: dan.id }] },
    },
  });
  await prisma.user.upsert({
    where: { email: 'khalid.nasser@pifdemo.com' },
    update: {},
    create: {
      email: 'khalid.nasser@pifdemo.com',
      name: 'Khalid Nasser',
      role: Role.VIEWER,
      status: UserStatus.INACTIVE,
      mustChangePassword: false,
      passwordHash: unusable,
      avatarColor: '#E6533C',
      lastLoginAt: new Date(Date.now() - 20 * DAY),
      sites: { create: [{ siteId: tuaja.id }, { siteId: dan.id }] },
    },
  });

  const authors = { superadmin: users[0].id, admin: users[1].id, editor: users[2].id };
  const seededT = await seedContent(tuaja.id, TUAJA, authors);
  const seededD = await seedContent(dan.id, DAN, authors);
  await seedLogs(users, [tuaja, dan]);

  console.log('Seed complete.');
  console.log(`  Content: Tuaja Demo ${seededT ? 'created' : 'already present'}, Dan Demo ${seededD ? 'created' : 'already present'}`);
  console.log(`  Demo logins (password ${DEMO_PASSWORD}): ${demo.map((d) => d.email).join(', ')}`);
  console.log(`  Public API keys: Tuaja Demo → ${TUAJA.apiKey} | Dan Demo → ${DAN.apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import request from 'supertest';
import {
  bearer,
  closeTestApp,
  createTestApp,
  DAN_KEY,
  login,
  siteIds,
  TestCtx,
  TUAJA_KEY,
} from './helpers';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('CMS, public API & activity logs (e2e)', () => {
  let ctx: TestCtx;
  let admin: string;
  let editor: string;
  let sa: string;
  let sites: { tuaja: string; dan: string };
  const as = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string,
    site?: string,
  ) => {
    const r = request(ctx.http)[method](url).set(bearer(token));
    return r.set('X-Site-Id', site ?? sites.tuaja);
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    sites = await siteIds(ctx);
    admin = (await login(ctx, 'admin@pifdemo.com')).token;
    editor = (await login(ctx, 'editor@pifdemo.com')).token;
    sa = (await login(ctx, 'superadmin@pifdemo.com')).token;
  });
  afterAll(() => closeTestApp(ctx));

  describe('pages', () => {
    let pageId: string;
    it('creates with an auto slug, de-duplicates slugs, rejects explicit collisions', async () => {
      const a = await as(editor, 'post', '/api/pages').send({ title: 'Spa & Wellness Retreat' });
      expect(a.status).toBe(201);
      expect(a.body.slug).toBe('spa-and-wellness-retreat');
      const b = await as(editor, 'post', '/api/pages').send({ title: 'Spa & Wellness Retreat' });
      expect(b.body.slug).toBe('spa-and-wellness-retreat-2');
      const c = await as(editor, 'post', '/api/pages').send({ title: 'X', slug: 'home' });
      expect(c.status).toBe(409);
      const bad = await as(editor, 'post', '/api/pages').send({ title: 'X', slug: 'Bad Slug!' });
      expect(bad.status).toBe(400);
      pageId = a.body.id;
    });

    it('updates SEO, logs a before/after diff with actor, role and website', async () => {
      const res = await as(editor, 'patch', `/api/pages/${pageId}`).send({
        title: 'Spa Retreat',
        seo: { metaTitle: 'Spa', noindex: true },
      });
      expect(res.status).toBe(200);
      expect(res.body.seo).toMatchObject({ metaTitle: 'Spa', noindex: true });
      const log = await ctx.prisma.activityLog.findFirstOrThrow({
        where: { action: 'page.updated', entityId: pageId },
      });
      expect(log).toMatchObject({
        actorEmail: 'editor@pifdemo.com',
        actorRole: 'EDITOR',
        siteName: 'Tuaja Demo',
      });
      expect(log.before).toMatchObject({ title: 'Spa & Wellness Retreat' });
      expect(log.after).toMatchObject({ title: 'Spa Retreat' });
    });

    it('publishes, unpublishes, duplicates (with sections) and deletes', async () => {
      await as(editor, 'post', `/api/pages/${pageId}/sections`)
        .send({ type: 'HERO', content: { heading: 'Relax' } })
        .expect(201);
      expect((await as(admin, 'post', `/api/pages/${pageId}/publish`)).body.status).toBe(
        'PUBLISHED',
      );
      expect((await as(admin, 'post', `/api/pages/${pageId}/unpublish`)).body.status).toBe('DRAFT');
      const dup = await as(editor, 'post', `/api/pages/${pageId}/duplicate`);
      expect(dup.status).toBe(201);
      expect(dup.body.status).toBe('DRAFT');
      expect(dup.body._count.sections).toBe(1);
      expect((await as(admin, 'delete', `/api/pages/${dup.body.id}`)).status).toBe(200);
      for (const action of ['page.published', 'page.unpublished', 'page.deleted']) {
        expect(await ctx.prisma.activityLog.findFirst({ where: { action } })).not.toBeNull();
      }
    });

    it('lists with search, status filter and pagination envelope', async () => {
      const res = await as(editor, 'get', '/api/pages').query({ status: 'PUBLISHED', pageSize: 2 });
      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2 });
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(res.body.data.every((p: { status: string }) => p.status === 'PUBLISHED')).toBe(true);
    });
  });

  describe('sections', () => {
    it('validates content per block type', async () => {
      const page = await ctx.prisma.page.findFirstOrThrow({
        where: { siteId: sites.tuaja, slug: 'home' },
      });
      const res = await as(editor, 'post', `/api/pages/${page.id}/sections`).send({
        type: 'FAQ',
        content: { heading: 'Q', items: [] },
      });
      expect(res.status).toBe(400);
      expect(res.body.details[0].field).toBe('content.items');
    });

    it('creates website blocks (form, latest posts, image cards) with normalised content', async () => {
      const page = await ctx.prisma.page.findFirstOrThrow({
        where: { siteId: sites.tuaja, slug: 'contact-us' },
      });
      const form = await as(editor, 'post', `/api/pages/${page.id}/sections`).send({
        type: 'FORM',
        content: { heading: 'Book a visit', formKey: 'booking-enquiry' },
      });
      expect(form.status).toBe(201);
      expect(form.body.content).toMatchObject({ formKey: 'booking-enquiry', background: 'light' });
      const posts = await as(editor, 'post', `/api/pages/${page.id}/sections`).send({
        type: 'LATEST_POSTS',
        content: { heading: 'News', count: 4 },
      });
      expect(posts.body.content).toMatchObject({ count: 4, category: '' });
      const cards = await as(editor, 'post', `/api/pages/${page.id}/sections`).send({
        type: 'IMAGE_CARDS',
        content: { items: [{ title: 'Eco', image: '/websites/tuaja/exp-2.jpg', color: 'teal' }] },
      });
      expect(cards.status).toBe(400);
      expect(cards.body.details[0].field).toBe('content.items.0.color');
      await ctx.prisma.section.deleteMany({ where: { id: { in: [form.body.id, posts.body.id] } } });
    });

    it('sanitises rich text and persists drag-and-drop order', async () => {
      const page = await ctx.prisma.page.findFirstOrThrow({
        where: { siteId: sites.tuaja, slug: 'about-us' },
      });
      const rt = await as(editor, 'post', `/api/pages/${page.id}/sections`).send({
        type: 'RICH_TEXT',
        content: {
          html: '<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a>',
        },
      });
      expect(rt.status).toBe(201);
      expect(rt.body.content.html).not.toMatch(/script|onclick|javascript/);
      const list = (await as(editor, 'get', `/api/pages/${page.id}/sections`)).body as {
        id: string;
      }[];
      const reversed = list.map((s) => s.id).reverse();
      const res = await as(editor, 'put', `/api/pages/${page.id}/sections/order`).send({
        ids: reversed,
      });
      expect(res.status).toBe(200);
      const after = (await as(editor, 'get', `/api/pages/${page.id}/sections`)).body as {
        id: string;
      }[];
      expect(after.map((s) => s.id)).toEqual(reversed);
      const partial = await as(editor, 'put', `/api/pages/${page.id}/sections/order`).send({
        ids: reversed.slice(1),
      });
      expect(partial.status).toBe(400);
    });

    it('toggles visibility and duplicates', async () => {
      const s = await ctx.prisma.section.findFirstOrThrow({ where: { siteId: sites.tuaja } });
      expect(
        (await as(editor, 'patch', `/api/sections/${s.id}`).send({ isVisible: false })).body
          .isVisible,
      ).toBe(false);
      const dup = await as(editor, 'post', `/api/sections/${s.id}/duplicate`);
      expect(dup.body.order).toBe(s.order + 1);
      await as(editor, 'patch', `/api/sections/${s.id}`).send({ isVisible: true }).expect(200);
    });
  });

  describe('blogs', () => {
    it('stores sanitised rich text, computes reading time, schedules and publishes', async () => {
      const cat = await as(editor, 'post', '/api/blog-categories').send({ name: 'Wellness' });
      expect(cat.status).toBe(201);
      const words = Array.from({ length: 450 }, () => 'word').join(' ');
      const res = await as(editor, 'post', '/api/blogs').send({
        title: 'A guide to slow mornings',
        content: `<h2>Intro</h2><p>${words}</p><img src="x" onerror="alert(1)">`,
        categoryId: cat.body.id,
        tags: ['Calm', 'calm', 'Mornings'],
      });
      expect(res.status).toBe(201);
      expect(res.body.readingTime).toBe(3);
      expect(res.body.content).not.toMatch(/onerror/);
      expect(res.body.tags).toEqual(['calm', 'mornings']);
      expect(res.body.author.name).toBe('Lina Farouk');
      const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const sched = await as(admin, 'post', `/api/blogs/${res.body.id}/publish`).send({
        publishedAt: future,
      });
      expect(sched.body.status).toBe('SCHEDULED');
      const pub = await request(ctx.http)
        .get('/api/public/blogs/a-guide-to-slow-mornings')
        .set('X-API-Key', TUAJA_KEY);
      expect(pub.status).toBe(404);
      const now = await as(admin, 'post', `/api/blogs/${res.body.id}/publish`).send({});
      expect(now.body.status).toBe('PUBLISHED');
      const live = await request(ctx.http)
        .get('/api/public/blogs/a-guide-to-slow-mornings')
        .set('X-API-Key', TUAJA_KEY);
      expect(live.status).toBe(200);
      expect(live.body.seo.title).toMatch(/\| Tuaja Luxury Resorts$/);
    });

    it('filters by status and category', async () => {
      const res = await as(editor, 'get', '/api/blogs').query({ status: 'DRAFT' });
      expect(res.body.data.every((b: { status: string }) => b.status === 'DRAFT')).toBe(true);
      expect(res.body.data[0].content).toBeUndefined();
    });
  });

  describe('public content API', () => {
    it('requires a valid API key', async () => {
      expect((await request(ctx.http).get('/api/public/pages')).status).toBe(401);
      expect(
        (
          await request(ctx.http)
            .get('/api/public/pages')
            .set('X-API-Key', 'pif_aaaaaaaa_' + 'x'.repeat(30))
        ).status,
      ).toBe(401);
    });

    it('returns only published content of the key’s own site, with visible sections and caching headers', async () => {
      const res = await request(ctx.http).get('/api/public/pages').set('X-API-Key', TUAJA_KEY);
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toMatch(/max-age=60/);
      const slugs = res.body.data.map((p: { slug: string }) => p.slug);
      expect(slugs).not.toContain('careers');
      expect(
        (await request(ctx.http).get('/api/public/pages/careers').set('X-API-Key', TUAJA_KEY))
          .status,
      ).toBe(404);
      // Dan's pages are invisible with Tuaja's key
      expect(
        (await request(ctx.http).get('/api/public/pages/our-brands').set('X-API-Key', TUAJA_KEY))
          .status,
      ).toBe(404);
      expect(
        (await request(ctx.http).get('/api/public/pages/our-brands').set('X-API-Key', DAN_KEY))
          .status,
      ).toBe(200);
      const home = await request(ctx.http)
        .get('/api/public/pages/home')
        .set('X-API-Key', TUAJA_KEY);
      expect(home.body.sections.every((s: { type: string }) => !!s.type)).toBe(true);
      // Bundled website assets come back as absolute URLs on the admin/web origin.
      const hero = home.body.sections[0];
      expect(hero.content.backgroundVideo).toBe(
        `${process.env.FRONTEND_URL}/websites/tuaja/hero.mp4`,
      );
      expect(home.body.sections.map((s: { type: string }) => s.type)).toEqual(
        expect.arrayContaining(['IMAGE_CARDS', 'GALLERY', 'LATEST_POSTS']),
      );
      // Child pages carry their parent for two-level navigation.
      const nav = res.body.data as { id: string; slug: string; parentId: string | null }[];
      const brand = nav.find((p) => p.slug === 'the-brand')!;
      expect(nav.find((p) => p.slug === 'about-us')!.parentId).toBe(brand.id);
      expect(home.body.seo).toMatchObject({ robots: 'index, follow' });
      const blogs = await request(ctx.http).get('/api/public/blogs').set('X-API-Key', TUAJA_KEY);
      expect(
        blogs.body.data.some((b: { title: string }) =>
          /Draft|Gallery: experience nature/.test(b.title),
        ),
      ).toBe(false);
      expect(
        (await request(ctx.http).get('/api/public/social-links').set('X-API-Key', TUAJA_KEY)).body
          .data.length,
      ).toBeGreaterThan(0);
      expect(
        (await request(ctx.http).get('/api/public/seo/home').set('X-API-Key', TUAJA_KEY)).body
          .title,
      ).toBe('Experience nature. Heartfully. | Tuaja Luxury Resorts');
    });

    it('allows any origin on the public API without credentials', async () => {
      const res = await request(ctx.http)
        .options('/api/public/pages')
        .set('Origin', 'https://some-site.example')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-origin']).toBe('https://some-site.example');
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
      const admin = await request(ctx.http)
        .options('/api/pages')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'GET');
      expect(admin.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('form submission creates a lead, increments dashboard counters, logs it; honeypot is silently dropped', async () => {
      const before = (await as(admin, 'get', '/api/dashboard/stats')).body.kpis.leadsThisMonth;
      const form = await request(ctx.http)
        .get('/api/public/forms/contact')
        .set('X-API-Key', TUAJA_KEY);
      expect(form.body.fields.length).toBeGreaterThan(0);
      const res = await request(ctx.http)
        .post('/api/public/forms/contact/submit')
        .set('X-API-Key', TUAJA_KEY)
        .send({
          data: {
            name: 'Rania Test',
            email: 'rania@example.com',
            topic: 'Bookings',
            message: 'Do you have rooms in May?',
            consent: true,
          },
          sourcePage: '/contact',
        });
      expect(res.status).toBe(201);
      const after = (await as(admin, 'get', '/api/dashboard/stats')).body.kpis.leadsThisMonth;
      expect(after).toBe(before + 1);
      const lead = await ctx.prisma.lead.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(lead).toMatchObject({
        siteId: sites.tuaja,
        name: 'Rania Test',
        email: 'rania@example.com',
        status: 'NEW',
      });
      expect(
        await ctx.prisma.activityLog.findFirst({
          where: { action: 'lead.created', entityId: lead.id },
        }),
      ).not.toBeNull();
      expect(ctx.mail.last('leads@tuaja-demo.example.com', 'lead-notification')).toBeDefined();

      const count = await ctx.prisma.lead.count();
      const bot = await request(ctx.http)
        .post('/api/public/forms/contact/submit')
        .set('X-API-Key', TUAJA_KEY)
        .send({ data: { name: 'Bot' }, _hp: 'http://spam' });
      expect(bot.status).toBe(201);
      expect(await ctx.prisma.lead.count()).toBe(count);
    });
  });

  describe('leads', () => {
    it('filters, changes status with a diff log, adds notes and exports filtered CSV', async () => {
      const list = await as(editor, 'get', '/api/leads').query({ status: 'NEW', search: 'Rania' });
      expect(list.body.data).toHaveLength(1);
      expect(list.body.counts.NEW).toBeGreaterThan(0);
      const id = list.body.data[0].id;
      await as(editor, 'patch', `/api/leads/${id}/status`)
        .send({ status: 'QUALIFIED' })
        .expect(200);
      const log = await ctx.prisma.activityLog.findFirstOrThrow({
        where: { action: 'lead.status_changed', entityId: id },
      });
      expect(log.before).toEqual({ status: 'NEW' });
      expect(log.after).toEqual({ status: 'QUALIFIED' });
      await as(editor, 'post', `/api/leads/${id}/notes`)
        .send({ body: 'Sent May availability.' })
        .expect(201);
      const detail = await as(editor, 'get', `/api/leads/${id}`);
      expect(detail.body.notes[0]).toMatchObject({
        body: 'Sent May availability.',
        authorName: 'Lina Farouk',
      });
      const csv = await as(admin, 'get', '/api/leads/export').query({ search: 'Rania' });
      expect(csv.text).toMatch(/Rania Test/);
      expect(csv.text.trim().split('\r\n')).toHaveLength(2);
      expect(
        await ctx.prisma.activityLog.findFirst({ where: { action: 'lead.exported' } }),
      ).not.toBeNull();
      const range = await as(editor, 'get', '/api/leads').query({
        dateFrom: '2000-01-01',
        dateTo: '2000-01-02',
      });
      expect(range.body.meta.total).toBe(0);
    });
  });

  describe('forms, social, SEO & media', () => {
    it('validates form definitions', async () => {
      const dupKey = await as(editor, 'post', '/api/forms').send({
        name: 'X',
        key: 'contact',
        fields: [{ name: 'a', label: 'A', type: 'text', required: true }],
      });
      expect(dupKey.status).toBe(409);
      const noOptions = await as(editor, 'post', '/api/forms').send({
        name: 'X',
        key: 'x-form',
        fields: [{ name: 'a', label: 'A', type: 'select', required: true }],
      });
      expect(noOptions.status).toBe(400);
      const ok = await as(editor, 'post', '/api/forms').send({
        name: 'Newsletter',
        key: 'newsletter',
        fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
      });
      expect(ok.status).toBe(201);
    });

    it('validates social URLs per platform', async () => {
      const wrongHost = await as(admin, 'post', '/api/social-links').send({
        platform: 'TIKTOK',
        url: 'https://instagram.com/x',
      });
      expect(wrongHost.status).toBe(400);
      const ok = await as(admin, 'post', '/api/social-links').send({
        platform: 'TIKTOK',
        url: 'https://www.tiktok.com/@tuajademo',
      });
      expect(ok.status).toBe(201);
      expect(
        (
          await as(admin, 'post', '/api/social-links').send({
            platform: 'TIKTOK',
            url: 'https://tiktok.com/@x',
          })
        ).status,
      ).toBe(409);
    });

    it('updates global SEO settings with validation', async () => {
      const bad = await as(admin, 'put', '/api/seo/settings').send({
        titleTemplate: 'No placeholder',
        defaultMetaDescription: '',
        robotsTxt: '',
      });
      expect(bad.status).toBe(400);
      const ok = await as(admin, 'put', '/api/seo/settings').send({
        titleTemplate: '%s · Tuaja',
        defaultMetaDescription: 'Desc',
        robotsTxt: 'User-agent: *',
        googleVerification: 'abcdefghij1234',
      });
      expect(ok.status).toBe(200);
      expect(
        await ctx.prisma.activityLog.findFirst({ where: { action: 'seo.updated' } }),
      ).not.toBeNull();
    });

    it('uploads images (magic-byte check), rejects other files, deletes', async () => {
      const up = await as(editor, 'post', '/api/media/upload').attach('file', PNG, {
        filename: 'pixel.png',
        contentType: 'image/png',
      });
      expect(up.status).toBe(201);
      expect(up.body.url).toMatch(/^\/uploads\/.+\.png$/);
      const served = await request(ctx.http).get(up.body.url);
      expect(served.status).toBe(200);
      const fake = await as(editor, 'post', '/api/media/upload').attach(
        'file',
        Buffer.from('<svg onload=alert(1)>'),
        { filename: 'x.png', contentType: 'image/png' },
      );
      expect(fake.status).toBe(415);
      const log = await ctx.prisma.activityLog.findFirstOrThrow({
        where: { action: 'media.uploaded', entityId: up.body.id },
      });
      expect(log.siteName).toBe('Tuaja Demo');
      expect((await as(editor, 'delete', `/api/media/${up.body.id}`)).status).toBe(403);
      expect((await as(admin, 'delete', `/api/media/${up.body.id}`)).status).toBe(200);
    });
  });

  describe('activity logs API', () => {
    it('filters by action, role and website; exports CSV', async () => {
      const res = await request(ctx.http)
        .get('/api/activity-logs')
        .query({ action: 'page.updated', role: 'EDITOR', siteId: sites.tuaja })
        .set(bearer(sa));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every(
          (l: { action: string; actorRole: string }) =>
            l.action === 'page.updated' && l.actorRole === 'EDITOR',
        ),
      ).toBe(true);
      const global = await request(ctx.http)
        .get('/api/activity-logs')
        .query({ siteId: 'global', action: 'auth.login' })
        .set(bearer(sa));
      expect(global.body.data.every((l: { siteId: string | null }) => l.siteId === null)).toBe(
        true,
      );
      const facets = await request(ctx.http).get('/api/activity-logs/facets').set(bearer(sa));
      expect(facets.body.actions).toContain('auth.login');
      const csv = await request(ctx.http)
        .get('/api/activity-logs/export')
        .query({ action: 'auth.login' })
        .set(bearer(sa));
      expect(csv.status).toBe(200);
      expect(csv.text).toMatch(/Timestamp \(UTC\)/);
    });
  });
});

import { Role } from '@prisma/client';
import request from 'supertest';
import { bearer, closeTestApp, createTestApp, login, makeUser, siteIds, TestCtx } from './helpers';

type Tokens = Record<'superadmin' | 'admin' | 'editor' | 'viewer', string>;

describe('RBAC & multi-tenancy (e2e)', () => {
  let ctx: TestCtx;
  let sites: { tuaja: string; dan: string };
  const t = {} as Tokens;

  beforeAll(async () => {
    ctx = await createTestApp();
    sites = await siteIds(ctx);
    for (const r of ['superadmin', 'admin', 'editor', 'viewer'] as const)
      t[r] = (await login(ctx, `${r}@pifdemo.com`)).token;
  });
  afterAll(() => closeTestApp(ctx));

  const call = (
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string,
    token: string,
    site?: string,
    body?: object,
  ) => {
    const r = request(ctx.http)[method](url).set(bearer(token));
    if (site) r.set('X-Site-Id', site);
    return body ? r.send(body) : r;
  };

  describe('global admin areas are Super Admin only', () => {
    it.each(['/api/users', '/api/sites', '/api/activity-logs'])('%s', async (url) => {
      expect((await call('get', url, t.superadmin)).status).toBe(200);
      for (const r of ['admin', 'editor', 'viewer'] as const) {
        const res = await call('get', url, t[r]);
        expect(res.status).toBe(403);
      }
    });

    it('activity logs are append-only (no update or delete endpoints)', async () => {
      const log = await ctx.prisma.activityLog.findFirstOrThrow();
      expect(
        (
          await call('patch', `/api/activity-logs/${log.id}`, t.superadmin, undefined, {
            summary: 'x',
          })
        ).status,
      ).toBe(404);
      expect((await call('delete', `/api/activity-logs/${log.id}`, t.superadmin)).status).toBe(404);
    });
  });

  describe('CMS permission matrix (Tuaja Demo)', () => {
    it('everyone with access can read', async () => {
      for (const r of ['superadmin', 'admin', 'editor'] as const) {
        expect((await call('get', '/api/pages', t[r], sites.tuaja)).status).toBe(200);
      }
      expect((await call('get', '/api/pages', t.viewer, sites.dan)).status).toBe(200);
    });

    it('viewer cannot create content', async () => {
      const res = await call('post', '/api/pages', t.viewer, sites.dan, { title: 'Nope' });
      expect(res.status).toBe(403);
    });

    it('editor can create & edit but not publish or delete', async () => {
      const created = await call('post', '/api/pages', t.editor, sites.tuaja, {
        title: 'Editor page',
      });
      expect(created.status).toBe(201);
      const id = created.body.id;
      expect(
        (
          await call('patch', `/api/pages/${id}`, t.editor, sites.tuaja, {
            title: 'Editor page v2',
          })
        ).status,
      ).toBe(200);
      expect((await call('post', `/api/pages/${id}/publish`, t.editor, sites.tuaja)).status).toBe(
        403,
      );
      expect((await call('delete', `/api/pages/${id}`, t.editor, sites.tuaja)).status).toBe(403);
      expect((await call('post', `/api/pages/${id}/publish`, t.admin, sites.tuaja)).status).toBe(
        200,
      );
      expect((await call('delete', `/api/pages/${id}`, t.admin, sites.tuaja)).status).toBe(200);
    });

    it('global SEO & social settings are Admin+', async () => {
      const seo = (await call('get', '/api/seo/settings', t.editor, sites.tuaja)).body;
      const body = {
        titleTemplate: seo.titleTemplate,
        defaultMetaDescription: seo.defaultMetaDescription,
        robotsTxt: seo.robotsTxt,
      };
      expect((await call('put', '/api/seo/settings', t.editor, sites.tuaja, body)).status).toBe(
        403,
      );
      expect((await call('put', '/api/seo/settings', t.admin, sites.tuaja, body)).status).toBe(200);
      expect(
        (
          await call('post', '/api/social-links', t.editor, sites.tuaja, {
            platform: 'WHATSAPP',
            url: 'https://wa.me/10000000000',
          })
        ).status,
      ).toBe(403);
    });

    it('leads: editor can update status, only admin+ can export or delete', async () => {
      const lead = await ctx.prisma.lead.findFirstOrThrow({ where: { siteId: sites.tuaja } });
      expect(
        (
          await call('patch', `/api/leads/${lead.id}/status`, t.editor, sites.tuaja, {
            status: 'CONTACTED',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await call('patch', `/api/leads/${lead.id}/status`, t.viewer, sites.dan, {
            status: 'WON',
          })
        ).status,
      ).toBe(403);
      expect((await call('get', '/api/leads/export', t.editor, sites.tuaja)).status).toBe(403);
      expect((await call('delete', `/api/leads/${lead.id}`, t.editor, sites.tuaja)).status).toBe(
        403,
      );
      const csv = await call('get', '/api/leads/export', t.admin, sites.tuaja);
      expect(csv.status).toBe(200);
      expect(csv.headers['content-type']).toMatch(/text\/csv/);
    });

    it('everyone can manage their own profile', async () => {
      const res = await call('patch', '/api/profile', t.viewer, undefined, {
        avatarColor: '#26BF94',
      });
      expect(res.status).toBe(200);
    });
  });

  describe('tenant isolation', () => {
    it('a user assigned only to Tuaja Demo cannot use the Dan Demo header', async () => {
      for (const url of [
        '/api/pages',
        '/api/blogs',
        '/api/leads',
        '/api/forms',
        '/api/dashboard/stats',
      ]) {
        const res = await call('get', url, t.editor, sites.dan);
        expect(res.status).toBe(403);
      }
    });

    it('guessing another tenant’s record id through your own site returns 404, never data', async () => {
      const danPage = await ctx.prisma.page.findFirstOrThrow({ where: { siteId: sites.dan } });
      const danLead = await ctx.prisma.lead.findFirstOrThrow({ where: { siteId: sites.dan } });
      const danBlog = await ctx.prisma.blogPost.findFirstOrThrow({ where: { siteId: sites.dan } });
      expect((await call('get', `/api/pages/${danPage.id}`, t.editor, sites.tuaja)).status).toBe(
        404,
      );
      expect(
        (
          await call('patch', `/api/pages/${danPage.id}`, t.editor, sites.tuaja, {
            title: 'hijack',
          })
        ).status,
      ).toBe(404);
      expect((await call('get', `/api/leads/${danLead.id}`, t.editor, sites.tuaja)).status).toBe(
        404,
      );
      expect(
        (
          await call('patch', `/api/leads/${danLead.id}/status`, t.editor, sites.tuaja, {
            status: 'LOST',
          })
        ).status,
      ).toBe(404);
      expect((await call('delete', `/api/blogs/${danBlog.id}`, t.admin, sites.tuaja)).status).toBe(
        404,
      );
      expect(
        (await call('get', `/api/pages/${danPage.id}/sections`, t.editor, sites.tuaja)).status,
      ).toBe(404);
      const unchanged = await ctx.prisma.page.findUniqueOrThrow({ where: { id: danPage.id } });
      expect(unchanged.title).toBe(danPage.title);
      expect(await ctx.prisma.blogPost.findUnique({ where: { id: danBlog.id } })).not.toBeNull();
    });

    it('reordering cannot pull in another tenant’s rows', async () => {
      const danPage = await ctx.prisma.page.findFirstOrThrow({ where: { siteId: sites.dan } });
      const res = await call('put', '/api/pages/order', t.admin, sites.tuaja, {
        ids: [danPage.id],
      });
      expect(res.status).toBe(400);
    });

    it('missing or malformed site header is rejected', async () => {
      expect((await call('get', '/api/pages', t.admin)).status).toBe(400);
      expect((await call('get', '/api/pages', t.admin, 'not-a-uuid')).status).toBe(400);
    });

    it('a deactivated site is hidden from non-super-admins', async () => {
      const u = await makeUser(ctx, Role.ADMIN, [sites.dan]);
      const token = (await login(ctx, u.email, u.password)).token;
      await ctx.prisma.site.update({ where: { id: sites.dan }, data: { isActive: false } });
      expect((await call('get', '/api/pages', token, sites.dan)).status).toBe(403);
      expect((await call('get', '/api/pages', t.superadmin, sites.dan)).status).toBe(200);
      await ctx.prisma.site.update({ where: { id: sites.dan }, data: { isActive: true } });
    });
  });

  describe('websites are fully dynamic', () => {
    it('a third website created through the API is immediately manageable and isolated', async () => {
      const created = await call('post', '/api/sites', t.superadmin, undefined, {
        name: 'Oasis Demo',
        domain: 'oasis-demo.example.com',
        primaryColor: '#26BF94',
      });
      expect(created.status).toBe(201);
      expect(created.body.apiKey).toMatch(/^pif_[a-z0-9]{8}_/);
      expect(created.body.site.apiKeyHash).toBeUndefined();
      const oasis = created.body.site.id;
      const page = await call('post', '/api/pages', t.superadmin, oasis, { title: 'Welcome' });
      expect(page.status).toBe(201);
      await call('post', `/api/pages/${page.body.id}/publish`, t.superadmin, oasis).expect(200);
      const seo = await call('get', '/api/seo/settings', t.superadmin, oasis);
      expect(seo.body.titleTemplate).toBe('%s | Oasis Demo');
      // Admin has no assignment to the new site.
      expect((await call('get', '/api/pages', t.admin, oasis)).status).toBe(403);
      const pub = await request(ctx.http)
        .get('/api/public/pages')
        .set('X-API-Key', created.body.apiKey);
      expect(pub.body.data.map((p: { slug: string }) => p.slug)).toEqual(['welcome']);
      const log = await ctx.prisma.activityLog.findFirst({
        where: { action: 'site.created', entityId: oasis },
      });
      expect(log).toMatchObject({ siteName: 'Oasis Demo', actorRole: 'SUPER_ADMIN' });
    });

    it('slugs are unique and delete requires typing the name', async () => {
      expect(
        (
          await call('post', '/api/sites', t.superadmin, undefined, {
            name: 'Dup',
            slug: 'tuaja-demo',
          })
        ).status,
      ).toBe(409);
      const s = await call('post', '/api/sites', t.superadmin, undefined, { name: 'Temp Site' });
      expect(
        (await call('delete', `/api/sites/${s.body.site.id}?confirm=wrong`, t.superadmin)).status,
      ).toBe(400);
      expect(
        (await call('delete', `/api/sites/${s.body.site.id}?confirm=Temp%20Site`, t.superadmin))
          .status,
      ).toBe(204);
    });

    it('regenerating the API key disables the old key', async () => {
      const s = await call('post', '/api/sites', t.superadmin, undefined, { name: 'Key Site' });
      const fresh = await call('post', `/api/sites/${s.body.site.id}/regenerate-key`, t.superadmin);
      expect(fresh.status).toBe(200);
      expect(
        (await request(ctx.http).get('/api/public/pages').set('X-API-Key', s.body.apiKey)).status,
      ).toBe(401);
      expect(
        (await request(ctx.http).get('/api/public/pages').set('X-API-Key', fresh.body.apiKey))
          .status,
      ).toBe(200);
    });
  });
});

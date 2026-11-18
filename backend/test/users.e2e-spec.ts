import { Role } from '@prisma/client';
import request from 'supertest';
import { bearer, closeTestApp, createTestApp, login, makeUser, siteIds, TestCtx } from './helpers';

describe('User management & first-login flow (e2e)', () => {
  let ctx: TestCtx;
  let sa: string;
  let sites: { tuaja: string; dan: string };

  beforeAll(async () => {
    ctx = await createTestApp();
    sites = await siteIds(ctx);
    sa = (await login(ctx, 'superadmin@pifdemo.com')).token;
  });
  afterAll(() => closeTestApp(ctx));

  const createUser = (email: string, role = 'EDITOR', siteIdList = [sites.tuaja]) =>
    request(ctx.http)
      .post('/api/users')
      .set(bearer(sa))
      .send({ name: 'Nadia Rahman', email, role, siteIds: siteIdList });

  it('adds a user, emails a temp password (never returned by the API) and logs it', async () => {
    const res = await createUser('Nadia.Rahman@Example.com');
    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(true);
    expect(res.body.user).toMatchObject({
      email: 'nadia.rahman@example.com',
      status: 'PENDING',
      mustChangePassword: true,
      role: 'EDITOR',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/"tempPassword"|passwordHash/);
    const mail = ctx.mail.last('nadia.rahman@example.com', 'welcome');
    expect(String(mail.data.tempPassword)).toMatch(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12}$/,
    );
    expect(mail.data.sites).toEqual(['Tuaja Demo']);
    const log = await ctx.prisma.activityLog.findFirst({
      where: { action: 'user.created', entityId: res.body.user.id },
    });
    expect(log).toMatchObject({ actorEmail: 'superadmin@pifdemo.com', actorRole: 'SUPER_ADMIN' });
    expect(JSON.stringify(log?.after)).not.toMatch(/"tempPassword"/);
  });

  it('rejects duplicate emails (case-insensitive), super-admin creation and missing sites', async () => {
    expect((await createUser('NADIA.rahman@example.com')).status).toBe(409);
    expect((await createUser('x1@example.com', 'SUPER_ADMIN')).status).toBe(400);
    expect((await createUser('x2@example.com', 'VIEWER', [])).status).toBe(400);
  });

  it('still creates the user when the email fails, and reports it', async () => {
    ctx.mail.failNext = true;
    const res = await createUser('mail.fails@example.com');
    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(false);
    const log = await ctx.prisma.activityLog.findFirst({
      where: { action: 'user.welcome_email_failed', entityId: res.body.user.id },
    });
    expect(log).not.toBeNull();
  });

  it('forces a password change on first login, blocks every other route until then, then logs in normally', async () => {
    const temp = String(ctx.mail.last('nadia.rahman@example.com', 'welcome').data.tempPassword);
    const first = await login(ctx, 'nadia.rahman@example.com', temp);
    expect(first.user.mustChangePassword).toBe(true);

    const blocked = await request(ctx.http)
      .get('/api/pages')
      .set(bearer(first.token))
      .set('X-Site-Id', sites.tuaja);
    expect(blocked.status).toBe(403);
    expect(blocked.body.details.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await request(ctx.http).get('/api/auth/me').set(bearer(first.token))).status).toBe(200);

    const sameAsTemp = await request(ctx.http)
      .post('/api/auth/change-password')
      .set(bearer(first.token))
      .send({ newPassword: temp });
    expect(sameAsTemp.status).toBe(400);
    expect(sameAsTemp.body.message).toMatch(/different from the temporary password/);

    const changed = await request(ctx.http)
      .post('/api/auth/change-password')
      .set(bearer(first.token))
      .send({ newPassword: 'Nadia#Secure1' });
    expect(changed.status).toBe(200);
    expect(changed.body.user).toMatchObject({ mustChangePassword: false, status: 'ACTIVE' });
    const pages = await request(ctx.http)
      .get('/api/pages')
      .set(bearer(changed.body.accessToken))
      .set('X-Site-Id', sites.tuaja);
    expect(pages.status).toBe(200);

    const second = await login(ctx, 'nadia.rahman@example.com', 'Nadia#Secure1');
    expect(second.user.mustChangePassword).toBe(false);
    expect(
      (
        await request(ctx.http)
          .post('/api/auth/login')
          .send({ email: 'nadia.rahman@example.com', password: temp })
      ).status,
    ).toBe(401);
  });

  it('resend-welcome issues a new temp password and invalidates the old one', async () => {
    const created = await createUser('resend.me@example.com', 'VIEWER', [sites.dan]);
    const oldTemp = String(ctx.mail.last('resend.me@example.com', 'welcome').data.tempPassword);
    const res = await request(ctx.http)
      .post(`/api/users/${created.body.user.id}/resend-welcome`)
      .set(bearer(sa));
    expect(res.status).toBe(200);
    const newTemp = String(ctx.mail.last('resend.me@example.com', 'welcome').data.tempPassword);
    expect(newTemp).not.toEqual(oldTemp);
    expect(
      (
        await request(ctx.http)
          .post('/api/auth/login')
          .send({ email: 'resend.me@example.com', password: oldTemp })
      ).status,
    ).toBe(401);
    await login(ctx, 'resend.me@example.com', newTemp);
  });

  it('rejects an expired temporary password', async () => {
    const created = await createUser('expired.temp@example.com', 'VIEWER', [sites.dan]);
    const temp = String(ctx.mail.last('expired.temp@example.com', 'welcome').data.tempPassword);
    await ctx.prisma.user.update({
      where: { id: created.body.user.id },
      data: { tempPasswordExpiresAt: new Date(Date.now() - 1000) },
    });
    const res = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: 'expired.temp@example.com', password: temp });
    expect(res.status).toBe(401);
    expect(res.body.details.code).toBe('TEMP_PASSWORD_EXPIRED');
  });

  it('changes role and sites with dedicated log entries', async () => {
    const u = await makeUser(ctx, Role.VIEWER, [sites.dan]);
    const res = await request(ctx.http)
      .patch(`/api/users/${u.id}`)
      .set(bearer(sa))
      .send({ role: 'EDITOR', siteIds: [sites.dan, sites.tuaja] });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('EDITOR');
    expect(res.body.sites.map((s: { name: string }) => s.name).sort()).toEqual([
      'Dan Demo',
      'Tuaja Demo',
    ]);
    const role = await ctx.prisma.activityLog.findFirst({
      where: { action: 'user.role_changed', entityId: u.id },
    });
    expect(role?.before).toEqual({ role: 'VIEWER' });
    expect(role?.after).toEqual({ role: 'EDITOR' });
    expect(
      await ctx.prisma.activityLog.findFirst({
        where: { action: 'user.sites_changed', entityId: u.id },
      }),
    ).not.toBeNull();
  });

  it('deactivation revokes sessions immediately', async () => {
    const u = await makeUser(ctx, Role.EDITOR, [sites.tuaja]);
    const s = await login(ctx, u.email, u.password);
    const res = await request(ctx.http)
      .patch(`/api/users/${u.id}/status`)
      .set(bearer(sa))
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(200);
    expect((await request(ctx.http).get('/api/auth/me').set(bearer(s.token))).status).toBe(401);
    expect((await request(ctx.http).post('/api/auth/refresh').set('Cookie', s.cookie)).status).toBe(
      401,
    );
    expect(
      await ctx.prisma.activityLog.findFirst({
        where: { action: 'user.deactivated', entityId: u.id },
      }),
    ).not.toBeNull();
  });

  it('protects against self-deletion and removing the last super admin', async () => {
    const me = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'superadmin@pifdemo.com' },
    });
    expect((await request(ctx.http).delete(`/api/users/${me.id}`).set(bearer(sa))).status).toBe(
      403,
    );
    expect(
      (
        await request(ctx.http)
          .patch(`/api/users/${me.id}/status`)
          .set(bearer(sa))
          .send({ status: 'INACTIVE' })
      ).status,
    ).toBe(403);
    expect(
      (await request(ctx.http).patch(`/api/users/${me.id}`).set(bearer(sa)).send({ role: 'ADMIN' }))
        .status,
    ).toBe(403);
  });

  it('lists users with search, filters, sort and the pagination envelope', async () => {
    const res = await request(ctx.http)
      .get('/api/users')
      .query({ search: 'pifdemo', role: 'EDITOR', sortBy: 'name', sortOrder: 'asc', pageSize: 5 })
      .set(bearer(sa));
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 5 });
    expect(res.body.data.every((u: { role: string }) => u.role === 'EDITOR')).toBe(true);
    const bySite = await request(ctx.http)
      .get('/api/users')
      .query({ siteId: sites.dan, pageSize: 100 })
      .set(bearer(sa));
    expect(
      bySite.body.data.every((u: { sites: { id: string }[] }) =>
        u.sites.some((s) => s.id === sites.dan),
      ),
    ).toBe(true);
  });

  it('deletes a user and keeps the audit trail', async () => {
    const u = await makeUser(ctx, Role.VIEWER, [sites.dan]);
    expect((await request(ctx.http).delete(`/api/users/${u.id}`).set(bearer(sa))).status).toBe(204);
    expect(await ctx.prisma.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(
      await ctx.prisma.activityLog.findFirst({ where: { action: 'user.deleted', entityId: u.id } }),
    ).not.toBeNull();
  });
});

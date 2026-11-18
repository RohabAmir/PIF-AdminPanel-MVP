import { Role } from '@prisma/client';
import request from 'supertest';
import {
  bearer,
  closeTestApp,
  cookieFrom,
  createTestApp,
  login,
  makeUser,
  siteIds,
  startLogin,
  TestCtx,
} from './helpers';

describe('Auth (e2e)', () => {
  let ctx: TestCtx;
  let sites: { tuaja: string; dan: string };

  beforeAll(async () => {
    ctx = await createTestApp();
    sites = await siteIds(ctx);
  });
  afterAll(() => closeTestApp(ctx));

  describe('login', () => {
    it('rejects a wrong password and an unknown email with the same generic message', async () => {
      const a = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: 'admin@pifdemo.com', password: 'Wrong#123' });
      const b = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: 'nobody@pifdemo.com', password: 'Wrong#123' });
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
      expect(a.body.message).toBe('Invalid email or password.');
      expect(b.body.message).toBe(a.body.message);
      expect(a.body).toMatchObject({ statusCode: 401, error: 'Unauthorized' });
      expect(a.body.requestId).toBeDefined();
      await ctx.prisma.user.update({
        where: { email: 'admin@pifdemo.com' },
        data: { failedLoginAttempts: 0 },
      });
    });

    it('validates the request body', async () => {
      const res = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', extra: 1 });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });

    it('locks the account for 15 minutes after 5 failed attempts and logs it', async () => {
      const u = await makeUser(ctx, Role.EDITOR, [sites.tuaja]);
      for (let i = 0; i < 4; i++) {
        const r = await request(ctx.http)
          .post('/api/auth/login')
          .send({ email: u.email, password: 'Nope#1234' });
        expect(r.status).toBe(401);
      }
      const fifth = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: u.email, password: 'Nope#1234' });
      expect(fifth.status).toBe(423);
      expect(fifth.body.message).toMatch(/locked for 15 minutes/);
      // Even the correct password is refused while locked.
      const correct = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: u.email, password: u.password });
      expect(correct.status).toBe(423);
      expect(correct.body.message).toMatch(/locked for \d+ more minute/);
      const logs = await ctx.prisma.activityLog.findMany({ where: { entityId: u.id } });
      expect(logs.map((l) => l.action)).toEqual(
        expect.arrayContaining(['auth.login_failed', 'auth.account_locked']),
      );
      expect(logs[0].actorRole).toBe(Role.EDITOR);
    });

    it('issues no access token before the OTP is verified', async () => {
      const { body } = await startLogin(ctx, 'viewer@pifdemo.com');
      expect(body.accessToken).toBeUndefined();
      expect(body.otpSessionToken).toBeDefined();
      expect(body.email).toMatch(/^vi\*+@pifdemo\.com$/);
      const me = await request(ctx.http).get('/api/auth/me').set(bearer(body.otpSessionToken));
      expect(me.status).toBe(401);
    });

    it('refuses deactivated users', async () => {
      const u = await makeUser(ctx, Role.VIEWER, [sites.dan]);
      await ctx.prisma.user.update({ where: { id: u.id }, data: { status: 'INACTIVE' } });
      const res = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: u.email, password: u.password });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/);
    });
  });

  describe('OTP', () => {
    it('verifies a correct code and sets an httpOnly refresh cookie', async () => {
      const { otpSessionToken, code } = await startLogin(ctx, 'editor@pifdemo.com');
      const res = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.permissions).toContain('content:write');
      const raw = (res.headers['set-cookie'] as unknown as string[]).join(';');
      expect(raw).toMatch(/pif_rt=/);
      expect(raw).toMatch(/HttpOnly/i);
      expect(raw).toMatch(/Path=\/api\/auth/);
      // single use
      const again = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code });
      expect(again.status).toBe(401);
    });

    it('counts wrong codes and invalidates the session after 5 attempts', async () => {
      const { otpSessionToken, code } = await startLogin(ctx, 'viewer@pifdemo.com');
      const wrong = code === '000000' ? '111111' : '000000';
      for (let remaining = 4; remaining >= 1; remaining--) {
        const r = await request(ctx.http)
          .post('/api/auth/verify-otp')
          .send({ otpSessionToken, code: wrong });
        expect(r.status).toBe(400);
        expect(r.body.details).toMatchObject({ code: 'OTP_INVALID', attemptsRemaining: remaining });
      }
      const fifth = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code: wrong });
      expect(fifth.status).toBe(401);
      expect(fifth.body.details.code).toBe('OTP_LOCKED');
      const correctAfter = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code });
      expect(correctAfter.status).toBe(401);
    });

    it('rejects an expired code', async () => {
      const { otpSessionToken, code } = await startLogin(ctx, 'viewer@pifdemo.com');
      await ctx.prisma.otpCode.updateMany({
        where: { user: { email: 'viewer@pifdemo.com' }, consumedAt: null, invalidatedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const res = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code });
      expect(res.status).toBe(400);
      expect(res.body.details.code).toBe('OTP_EXPIRED');
    });

    it('enforces the resend cooldown and the 3-resend limit; a resent code replaces the old one', async () => {
      const { otpSessionToken, code: first } = await startLogin(ctx, 'viewer@pifdemo.com');
      const tooSoon = await request(ctx.http)
        .post('/api/auth/resend-otp')
        .send({ otpSessionToken });
      expect(tooSoon.status).toBe(429);
      expect(tooSoon.body.message).toMatch(/wait \d+ seconds/);

      const backdate = () =>
        ctx.prisma.otpCode.updateMany({
          where: { user: { email: 'viewer@pifdemo.com' }, consumedAt: null, invalidatedAt: null },
          data: { lastSentAt: new Date(Date.now() - 31_000) },
        });
      for (let i = 1; i <= 3; i++) {
        await backdate();
        const r = await request(ctx.http).post('/api/auth/resend-otp').send({ otpSessionToken });
        expect(r.status).toBe(200);
        expect(r.body.resendsRemaining).toBe(3 - i);
      }
      await backdate();
      const fourth = await request(ctx.http).post('/api/auth/resend-otp').send({ otpSessionToken });
      expect(fourth.status).toBe(429);
      expect(fourth.body.details.code).toBe('OTP_RESEND_LIMIT');

      const latest = String(ctx.mail.last('viewer@pifdemo.com', 'otp').data.code);
      if (latest !== first) {
        const old = await request(ctx.http)
          .post('/api/auth/verify-otp')
          .send({ otpSessionToken, code: first });
        expect(old.status).toBe(400);
      }
      const ok = await request(ctx.http)
        .post('/api/auth/verify-otp')
        .send({ otpSessionToken, code: latest });
      expect(ok.status).toBe(200);
    });
  });

  describe('refresh tokens', () => {
    it('rotates the refresh token and detects reuse by revoking the whole family', async () => {
      const { cookie } = await login(ctx, 'admin@pifdemo.com');
      const r1 = await request(ctx.http).post('/api/auth/refresh').set('Cookie', cookie);
      expect(r1.status).toBe(200);
      expect(r1.body.accessToken).toBeDefined();
      const cookie2 = cookieFrom(r1)!;
      expect(cookie2).not.toEqual(cookie);

      // Re-using the first (already rotated) token = theft signal.
      const reuse = await request(ctx.http).post('/api/auth/refresh').set('Cookie', cookie);
      expect(reuse.status).toBe(401);
      // …which also kills the legitimately rotated token.
      const r2 = await request(ctx.http).post('/api/auth/refresh').set('Cookie', cookie2);
      expect(r2.status).toBe(401);
      const log = await ctx.prisma.activityLog.findFirst({
        where: { action: 'auth.refresh_token_reuse' },
      });
      expect(log).not.toBeNull();
    });

    it('refuses refresh without a cookie', async () => {
      const res = await request(ctx.http).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token so it cannot be reused, and logs the event', async () => {
      const { cookie } = await login(ctx, 'editor@pifdemo.com');
      const out = await request(ctx.http).post('/api/auth/logout').set('Cookie', cookie);
      expect(out.status).toBe(204);
      expect((out.headers['set-cookie'] as unknown as string[]).join(';')).toMatch(/pif_rt=;/);
      const after = await request(ctx.http).post('/api/auth/refresh').set('Cookie', cookie);
      expect(after.status).toBe(401);
      const log = await ctx.prisma.activityLog.findFirst({
        where: { action: 'auth.logout' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log?.actorEmail).toBe('editor@pifdemo.com');
    });

    it('logout-all invalidates existing access tokens immediately', async () => {
      const u = await makeUser(ctx, Role.VIEWER, [sites.dan]);
      const a = await login(ctx, u.email, u.password);
      const b = await login(ctx, u.email, u.password);
      expect(
        (await request(ctx.http).post('/api/auth/logout-all').set(bearer(a.token))).status,
      ).toBe(204);
      expect((await request(ctx.http).get('/api/auth/me').set(bearer(b.token))).status).toBe(401);
      expect(
        (await request(ctx.http).post('/api/auth/refresh').set('Cookie', b.cookie)).status,
      ).toBe(401);
    });
  });

  describe('forgot / reset password', () => {
    it('returns the same response for unknown emails and sends nothing', async () => {
      const before = ctx.mail.sent.length;
      const unknown = await request(ctx.http)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@pifdemo.com' });
      const known = await request(ctx.http)
        .post('/api/auth/forgot-password')
        .send({ email: 'viewer@pifdemo.com' });
      expect(unknown.status).toBe(200);
      expect(known.status).toBe(200);
      expect(unknown.body).toEqual(known.body);
      expect(ctx.mail.sent.length).toBe(before + 1);
    });

    it('resets with a single-use link, revokes sessions, and the new password works', async () => {
      const u = await makeUser(ctx, Role.EDITOR, [sites.tuaja]);
      const session = await login(ctx, u.email, u.password);
      await request(ctx.http)
        .post('/api/auth/forgot-password')
        .send({ email: u.email })
        .expect(200);
      const url = String(ctx.mail.last(u.email, 'reset-password').data.resetUrl);
      const token = decodeURIComponent(url.split('token=')[1]);

      const same = await request(ctx.http)
        .post('/api/auth/reset-password')
        .send({ token, password: u.password });
      expect(same.status).toBe(400);
      const weak = await request(ctx.http)
        .post('/api/auth/reset-password')
        .send({ token, password: 'weakpass' });
      expect(weak.status).toBe(400);

      const ok = await request(ctx.http)
        .post('/api/auth/reset-password')
        .send({ token, password: 'Brand#New456' });
      expect(ok.status).toBe(200);
      const reused = await request(ctx.http)
        .post('/api/auth/reset-password')
        .send({ token, password: 'Other#New789' });
      expect(reused.status).toBe(400);
      expect(reused.body.details.code).toBe('RESET_TOKEN_INVALID');

      expect(
        (await request(ctx.http).post('/api/auth/refresh').set('Cookie', session.cookie)).status,
      ).toBe(401);
      expect((await request(ctx.http).get('/api/auth/me').set(bearer(session.token))).status).toBe(
        401,
      );
      await login(ctx, u.email, 'Brand#New456');
    });

    it('rejects expired reset links', async () => {
      const u = await makeUser(ctx, Role.EDITOR, [sites.tuaja]);
      await request(ctx.http)
        .post('/api/auth/forgot-password')
        .send({ email: u.email })
        .expect(200);
      const token = decodeURIComponent(
        String(ctx.mail.last(u.email, 'reset-password').data.resetUrl).split('token=')[1],
      );
      await ctx.prisma.passwordResetToken.updateMany({
        where: { userId: u.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const res = await request(ctx.http)
        .post('/api/auth/reset-password')
        .send({ token, password: 'Brand#New456' });
      expect(res.status).toBe(400);
    });
  });

  describe('change password', () => {
    it('requires the correct current password and a different new one', async () => {
      const u = await makeUser(ctx, Role.VIEWER, [sites.dan]);
      const { token } = await login(ctx, u.email, u.password);
      const wrong = await request(ctx.http)
        .post('/api/auth/change-password')
        .set(bearer(token))
        .send({ currentPassword: 'Bad#12345', newPassword: 'Fresh#Pass99' });
      expect(wrong.status).toBe(400);
      const same = await request(ctx.http)
        .post('/api/auth/change-password')
        .set(bearer(token))
        .send({ currentPassword: u.password, newPassword: u.password });
      expect(same.status).toBe(400);
      const ok = await request(ctx.http)
        .post('/api/auth/change-password')
        .set(bearer(token))
        .send({ currentPassword: u.password, newPassword: 'Fresh#Pass99' });
      expect(ok.status).toBe(200);
      expect(ok.body.accessToken).toBeDefined();
      // the old access token is no longer valid; the new one is
      expect((await request(ctx.http).get('/api/auth/me').set(bearer(token))).status).toBe(401);
      expect(
        (await request(ctx.http).get('/api/auth/me').set(bearer(ok.body.accessToken))).status,
      ).toBe(200);
      const log = await ctx.prisma.activityLog.findFirst({
        where: { action: 'auth.password_changed', entityId: u.id },
      });
      expect(log).not.toBeNull();
    });
  });
});

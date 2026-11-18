import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@12345';
export const TUAJA_KEY = 'pif_tuajadem_PublicDemoKey-TuajaDemo-2026';
export const DAN_KEY = 'pif_dandemo1_PublicDemoKey-DanDemo-2026xx';

export interface SentMail {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

/** Captures outgoing email instead of delivering it, so tests can read OTPs and temp passwords. */
export class FakeMail {
  sent: SentMail[] = [];
  enabled = true;
  failNext = false;
  async send(
    to: string,
    subject: string,
    template: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.failNext) {
      this.failNext = false;
      return false;
    }
    this.sent.push({ to, subject, template, data });
    return true;
  }
  last(to: string, template?: string): SentMail {
    const m = [...this.sent]
      .reverse()
      .find((x) => x.to === to && (!template || x.template === template));
    if (!m) throw new Error(`No ${template ?? ''} email sent to ${to}`);
    return m;
  }
}

export interface TestCtx {
  app: NestExpressApplication;
  http: App;
  mail: FakeMail;
  prisma: PrismaClient;
}

export async function createTestApp(): Promise<TestCtx> {
  const mail = new FakeMail();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  const prisma = new PrismaClient();
  return { app, http: app.getHttpServer() as App, mail, prisma };
}

export async function closeTestApp(ctx: TestCtx): Promise<void> {
  await ctx.prisma.$disconnect();
  await ctx.app.close();
}

export function cookieFrom(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const c = raw?.find((x) => x.startsWith('pif_rt='));
  return c?.split(';')[0];
}

export async function startLogin(ctx: TestCtx, email: string, password = DEMO_PASSWORD) {
  const res = await request(ctx.http).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed ${res.status} ${JSON.stringify(res.body)}`);
  const code = String(ctx.mail.last(email, 'otp').data.code);
  return { otpSessionToken: res.body.otpSessionToken as string, code, body: res.body };
}

export async function login(ctx: TestCtx, email: string, password = DEMO_PASSWORD) {
  const { otpSessionToken, code } = await startLogin(ctx, email, password);
  const res = await request(ctx.http).post('/api/auth/verify-otp').send({ otpSessionToken, code });
  if (res.status !== 200)
    throw new Error(`verify failed ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken as string, cookie: cookieFrom(res)!, user: res.body.user };
}

export async function siteIds(ctx: TestCtx) {
  const sites = await ctx.prisma.site.findMany();
  return {
    tuaja: sites.find((s) => s.slug === 'tuaja-demo')!.id,
    dan: sites.find((s) => s.slug === 'dan-demo')!.id,
  };
}

let counter = 0;
/** Creates an ACTIVE user directly in the database with a known password. */
export async function makeUser(
  ctx: TestCtx,
  role: Role,
  siteIdsList: string[],
  password = 'Start#Pass123',
) {
  counter += 1;
  const email = `test-${role.toLowerCase()}-${Date.now()}-${counter}@example.com`;
  const user = await ctx.prisma.user.create({
    data: {
      email,
      name: `Test ${role} ${counter}`,
      role,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
      passwordHash: await bcrypt.hash(password, 4),
      sites: { create: siteIdsList.map((siteId) => ({ siteId })) },
    },
  });
  return { ...user, password };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

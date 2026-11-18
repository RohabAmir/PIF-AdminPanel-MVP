#!/usr/bin/env node
/**
 * Captures the README screenshots with Playwright against a running local stack.
 *   node scripts/capture-screenshots.mjs   (frontend :5173, API :3000, Mailpit :8025)
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

async function otp(email, since) {
  for (let i = 0; i < 40; i++) {
    const { messages } = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const m = messages.find((x) => x.To[0].Address === email && /verification code/.test(x.Subject) && new Date(x.Created) >= since);
    if (m) return m.Subject.match(/\d{6}/)[0];
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('OTP not received');
}

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('saved', name);
};

await page.goto(`${BASE}/login`);
await shot('login');
const since = new Date(Date.now() - 1000);
await page.getByLabel('Email').fill('superadmin@pifdemo.com');
await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD ?? 'Demo@12345');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL('**/verify-otp');
const code = await otp('superadmin@pifdemo.com', since);
await page.getByLabel('Digit 1').click();
await page.keyboard.type(code.slice(0, 3));
await shot('otp');
await page.keyboard.type(code.slice(3));
await page.waitForURL('**/dashboard');

// Work on the Tuaja Demo website.
await page.getByTestId('site-switcher').click();
await page.getByRole('menuitem', { name: /Tuaja Demo/ }).click();
await page.waitForTimeout(600);
await page.goto(`${BASE}/dashboard`);
await shot('dashboard');

await page.goto(`${BASE}/pages`);
await page.getByRole('link', { name: 'Home', exact: true }).click();
await page.getByRole('button', { name: /Toggle JSON view/ }).waitFor();
await shot('page-editor');

await page.goto(`${BASE}/blogs`);
await page.getByRole('link', { name: /Five valley trails/ }).click();
await page.locator('.ProseMirror').waitFor();
await shot('blog-editor');

await page.goto(`${BASE}/leads`);
await shot('leads');

await page.goto(`${BASE}/users`);
await shot('users');

await page.goto(`${BASE}/activity-logs`);
await page.getByLabel('Filter by action').selectOption('page.updated').catch(() => undefined);
await page.locator('tbody tr').first().getByRole('button', { name: 'Show details' }).click().catch(() => undefined);
await shot('activity-logs');

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard`);
await shot('mobile');

await browser.close();

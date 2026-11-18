import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test of the main user journeys against a running stack
 * (frontend on E2E_BASE_URL, API behind it, Mailpit on MAILPIT_URL).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    // Locally reuse the installed Google Chrome; CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : 'chrome',
  },
});

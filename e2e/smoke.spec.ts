import { expect, test, type Page } from '@playwright/test';
import { otpFrom, tempPasswordFrom, waitForEmail } from './mailpit';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@12345';

async function signIn(page: Page, email: string, password: string) {
  const since = new Date();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign In to Dashboard' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/verify-otp/);
  const { subject } = await waitForEmail(email, /verification code/, since);
  await page.getByLabel('Digit 1').click();
  await page.keyboard.type(otpFrom(subject));
}

async function signOut(page: Page) {
  await page.getByTestId('user-menu').click();
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL(/\/login/);
}

test('login → OTP → dashboard → add user → logout → first login → forced reset → dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Existing user: password + OTP.
  await signIn(page, 'superadmin@pifdemo.com', DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Welcome Back, Sara/ })).toBeVisible();

  // Add a user — they receive a welcome email with a temporary password.
  const email = `smoke.${Date.now()}@example.com`;
  await page.goto('/users');
  await page.getByRole('button', { name: 'Add user' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Smoke Tester');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Role').selectOption('EDITOR');
  await dialog.getByRole('checkbox', { name: 'Tuaja Demo' }).click();
  const sentAfter = new Date();
  await dialog.getByRole('button', { name: /Add user & send invite/ }).click();
  await expect(page.getByText(/welcome email with a temporary password is on its way/)).toBeVisible();
  await expect(page.getByRole('row', { name: /Smoke Tester/ })).toContainText('Pending first login');
  const welcome = await waitForEmail(email, /account is ready/, sentAfter);
  const temp = tempPasswordFrom(welcome.html);

  await signOut(page);

  // New user: temp password + OTP → forced to set a new password, no other route reachable.
  await signIn(page, email, temp);
  await expect(page).toHaveURL(/\/reset-password/);
  await page.goto('/pages');
  await expect(page).toHaveURL(/\/reset-password/);
  await page.getByLabel('New password', { exact: true }).fill('Smoke#Pass2026');
  await page.getByLabel('Confirm new password').fill('Smoke#Pass2026');
  await page.getByRole('button', { name: /Save password/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Welcome Back, Smoke/ })).toBeVisible();

  await signOut(page);
  expect(errors).toEqual([]);
});

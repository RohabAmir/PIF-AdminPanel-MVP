import { expect, test, type Page } from '@playwright/test';
import { otpFrom, waitForEmail } from './mailpit';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@12345';

async function signIn(page: Page, email: string) {
  const since = new Date();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/verify-otp/);
  const { subject } = await waitForEmail(email, /verification code/, since);
  await page.getByLabel('Digit 1').click();
  await page.keyboard.type(otpFrom(subject));
  await expect(page).toHaveURL(/\/dashboard/);
}

test('the Tuaja and Dan websites render their CMS content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/websites/tuaja');
  await expect(page).toHaveTitle('Experience nature. Heartfully. | Tuaja Luxury Resorts');
  await expect(page.getByRole('heading', { name: 'Tuaja Resorts Experiences' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Al-Ahsa Eco Resort' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Al-Ahsa Eco Resort' }).first().click();
  await expect(page).toHaveURL(/\/websites\/tuaja\/eco-resort$/);
  await expect(page.getByRole('heading', { name: 'Plan your stay' })).toBeVisible();

  await page.goto('/websites/dan');
  await expect(page).toHaveTitle('Let Nature Be | Dan Company');
  await expect(page.getByRole('heading', { name: 'About Dan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Our Partners' })).toBeVisible();
  await page.getByRole('link', { name: /Dan Company CEO and Governor of Al-Ahsa meet/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dan Company CEO and Governor of Al-Ahsa meet');

  await page.goto('/websites/dan/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('website contact form submits a lead', async ({ page }) => {
  await page.goto('/websites/dan/contact-us');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Please correct the highlighted fields.')).toBeVisible();
  await page.getByLabel(/Full name/).fill('Website Visitor');
  await page.getByLabel(/Email/).fill(`visitor.${Date.now()}@example.com`);
  await page.getByLabel(/Topic/).selectOption('Partnerships');
  await page.getByLabel(/Message/).fill('We would like to discuss a franchise partnership.');
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you');
});

test('dashboard edits appear on the open website instantly, without a reload', async ({ page, context }) => {
  await signIn(page, 'editor@pifdemo.com'); // Editor of Tuaja Demo only

  const site = await context.newPage();
  await site.goto('/websites/tuaja');
  await expect(site.getByRole('heading', { name: 'Tuaja Resorts Experiences' })).toBeVisible();
  await site.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

  // Edit the "Resort experiences" heading of the Home page.
  await page.goto('/pages');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Resort experiences Image cards' }).click();
  const original = 'Tuaja Resorts Experiences';
  const edited = `Experiences, edited live ${Date.now()}`;
  await page.getByLabel('Heading', { exact: true }).fill(edited);
  await page.getByRole('button', { name: 'Save section' }).click();
  await expect(page.getByText('Section saved.')).toBeVisible();

  await expect(site.getByRole('heading', { name: edited })).toBeVisible({ timeout: 5_000 });
  expect(await site.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

  // Hide a section from the Website preview tab; the embedded website updates.
  await page.getByRole('tab', { name: 'Website preview' }).click();
  const preview = page.frameLocator('[data-testid="website-preview"]');
  await expect(preview.getByRole('heading', { name: 'Press Center' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('switch', { name: 'Hide Press center' }).click();
  await expect(preview.getByRole('heading', { name: 'Press Center' })).toHaveCount(0, { timeout: 5_000 });
  await expect(site.getByRole('heading', { name: 'Press Center' })).toHaveCount(0, { timeout: 5_000 });

  await page.getByRole('switch', { name: 'Show Press center' }).click();
  await expect(preview.getByRole('heading', { name: 'Press Center' })).toBeVisible({ timeout: 5_000 });

  // Drag "Press center" one place up (dnd-kit keyboard drag) — the website order follows.
  const order = () => site.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
  const before = await order();
  expect(before.slice(-2)).toEqual(['experience-nature-gallery', 'press-center']);
  // dnd-kit's keyboard sensor needs a frame between pick-up, move and drop.
  const keyboardDrag = async (label: string) => {
    await page.getByRole('button', { name: `Drag to reorder ${label}` }).focus();
    for (const key of ['Space', 'ArrowUp', 'Space']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(250);
    }
  };
  await keyboardDrag('Press center');
  await expect(page.getByText('Section order saved.').first()).toBeVisible();
  await expect.poll(order, { timeout: 5_000 }).toEqual([...before.slice(0, -2), 'press-center', 'experience-nature-gallery']);

  // Restore the demo content.
  await keyboardDrag('Experience nature gallery');
  await expect.poll(order, { timeout: 5_000 }).toEqual(before);
  await page.getByRole('tab', { name: /Sections/ }).click();
  await page.getByRole('button', { name: 'Resort experiences Image cards' }).click();
  await page.getByLabel('Heading', { exact: true }).fill(original);
  await page.getByRole('button', { name: 'Save section' }).click();
  await expect(site.getByRole('heading', { name: original })).toBeVisible({ timeout: 5_000 });
});

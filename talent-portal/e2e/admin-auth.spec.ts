import { test, expect, type Page } from '@playwright/test';

const PM_EMAIL = 'placement.manager@talentportal.uat';
const PO_EMAIL = 'placement.officer@talentportal.uat';
const CANDIDATE_EMAIL = 'ada.okafor@talentportal.uat';
const PASSWORD = 'Password123!';

async function loginAsAdmin(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/admin', { timeout: 15000 });
}

test.describe('Admin Authentication', () => {
  test('Placement Manager can log in via Admin tab and lands on /admin', async ({ page }) => {
    await loginAsAdmin(page, PM_EMAIL);
    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('Placement Officer can log in via Admin tab and lands on /admin', async ({ page }) => {
    await loginAsAdmin(page, PO_EMAIL);
    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('Admin tab is visible on login page', async ({ page }) => {
    await page.goto('/auth/login');
    const adminTab = page.getByRole('button', { name: /admin/i });
    await expect(adminTab).toBeVisible();
  });

  test('Forgot password and Register links hidden for Admin tab', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /admin/i }).click();
    await expect(page.getByText('Forgot password?')).not.toBeVisible();
    await expect(page.getByText('Register')).not.toBeVisible();
  });

  test('Non-admin user cannot access /admin pages', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder('you@example.com').fill(CANDIDATE_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15000 });

    await page.goto('/admin');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/admin');
  });

  test('Placement Manager sees full sidebar navigation', async ({ page }) => {
    await loginAsAdmin(page, PM_EMAIL);

    // Use the sidebar (aside/complementary) to scope nav item checks
    const sidebar = page.getByRole('complementary');

    const expectedItems = [
      'Dashboard',
      'Candidates',
      'Employers',
      'Jobs',
      'Intro Requests',
      'Placements',
      'Reports',
      'Taxonomy',
      'Audit Logs',
    ];

    for (const item of expectedItems) {
      await expect(sidebar.getByRole('link', { name: item, exact: true })).toBeVisible();
    }
  });

  test('Placement Officer sees limited sidebar navigation', async ({ page }) => {
    await loginAsAdmin(page, PO_EMAIL);

    const sidebar = page.getByRole('complementary');

    const visibleItems = ['Dashboard', 'Candidates', 'Intro Requests', 'Placements', 'Reports'];
    for (const item of visibleItems) {
      await expect(sidebar.getByRole('link', { name: item, exact: true })).toBeVisible();
    }

    const hiddenItems = ['Taxonomy', 'Audit Logs', 'Settings'];
    for (const item of hiddenItems) {
      await expect(sidebar.getByRole('link', { name: item, exact: true })).not.toBeVisible();
    }
  });

  test('Role badge shows correct role for Manager', async ({ page }) => {
    await loginAsAdmin(page, PM_EMAIL);
    await expect(page.getByText('Manager', { exact: true })).toBeVisible();
  });

  test('Role badge shows correct role for Officer', async ({ page }) => {
    await loginAsAdmin(page, PO_EMAIL);
    await expect(page.getByText('Officer', { exact: true })).toBeVisible();
  });

  test('Admin can sign out and return to login page', async ({ page }) => {
    await loginAsAdmin(page, PM_EMAIL);
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('/auth/login', { timeout: 10000 });
    await expect(page.getByText('Sign in to Talent Portal')).toBeVisible();
  });
});

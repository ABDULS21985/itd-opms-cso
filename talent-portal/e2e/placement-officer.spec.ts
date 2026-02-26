import { test, expect, type Page } from '@playwright/test';

const PO_EMAIL = 'placement.officer@talentportal.uat';
const PASSWORD = 'Password123!';

async function loginAsOfficer(page: Page) {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('you@example.com').fill(PO_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/admin', { timeout: 15000 });
}

test.describe('Placement Officer Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOfficer(page);
  });

  // ──────────────────────────────────────
  // Dashboard
  // ──────────────────────────────────────

  test('Dashboard loads for Placement Officer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByText('Officer', { exact: true })).toBeVisible();
  });

  // ──────────────────────────────────────
  // Permitted pages load
  // ──────────────────────────────────────

  test('Candidates page loads for Officer', async ({ page }) => {
    await page.goto('/admin/candidates');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Candidate Review Queue' })).toBeVisible();
  });

  test('Intro Requests page loads for Officer', async ({ page }) => {
    await page.goto('/admin/intro-requests');
    await page.waitForLoadState('networkidle');
    // Check via heading in main content
    await expect(page.getByRole('main').locator('h1')).toBeVisible();
  });

  test('Placements page loads for Officer', async ({ page }) => {
    await page.goto('/admin/placements');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Placement Pipeline' })).toBeVisible();
  });

  test('Reports page loads for Officer (view-only)', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible();
  });

  // ──────────────────────────────────────
  // Restricted pages
  // ──────────────────────────────────────

  test('Officer sees Employers and Jobs (has those permissions)', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: 'Employers', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Jobs', exact: true })).toBeVisible();
  });

  test('Taxonomy link not visible in sidebar for Officer', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: 'Taxonomy', exact: true })).not.toBeVisible();
  });

  test('Audit Logs link not visible in sidebar for Officer', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: 'Audit Logs', exact: true })).not.toBeVisible();
  });

  test('Settings link not visible in sidebar for Officer', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: 'Settings', exact: true })).not.toBeVisible();
  });

  // ──────────────────────────────────────
  // Navigate permitted pages without errors
  // ──────────────────────────────────────

  test('Navigate all permitted pages without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const permittedPages = [
      '/admin',
      '/admin/candidates',
      '/admin/intro-requests',
      '/admin/placements',
      '/admin/reports',
    ];

    for (const url of permittedPages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // No API errors on permitted pages
  // ──────────────────────────────────────

  test('No 4xx/5xx API errors on Officer permitted pages', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/') && res.status() >= 400) {
        if (!url.includes('/me/profile') && !url.includes('/settings')) {
          failedRequests.push(`${res.status()} ${url}`);
        }
      }
    });

    const permittedPages = [
      '/admin',
      '/admin/candidates',
      '/admin/intro-requests',
      '/admin/placements',
      '/admin/reports',
    ];

    for (const url of permittedPages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    expect(failedRequests).toHaveLength(0);
  });
});

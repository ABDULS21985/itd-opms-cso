import { test, expect, type Page } from '@playwright/test';

const PM_EMAIL = 'placement.manager@talentportal.uat';
const PASSWORD = 'Password123!';

async function loginAsManager(page: Page) {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('you@example.com').fill(PM_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/admin', { timeout: 15000 });
}

test.describe('Placement Manager Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  // ──────────────────────────────────────
  // Dashboard
  // ──────────────────────────────────────

  test('Admin dashboard loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Candidates')).toBeVisible();
    await expect(page.getByText('Total Employers')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // Candidates
  // ──────────────────────────────────────

  test('Candidates page loads with data', async ({ page }) => {
    await page.goto('/admin/candidates');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Candidate Review Queue' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or email...')).toBeVisible();
  });

  test('Candidates page loads without API errors', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/admin/candidates') && res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/admin/candidates');
    await page.waitForLoadState('networkidle');
    expect(failedRequests).toHaveLength(0);
  });

  test('Can navigate to candidate detail page', async ({ page }) => {
    await page.goto('/admin/candidates');
    await page.waitForLoadState('networkidle');

    const viewBtn = page.locator('a[href^="/admin/candidates/"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForURL(/\/admin\/candidates\/.+/);
      await expect(page.getByText('Internal Notes')).toBeVisible();
    }
  });

  // ──────────────────────────────────────
  // Employers
  // ──────────────────────────────────────

  test('Employers page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/employers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Employer Verification Queue' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('Can navigate to employer detail page', async ({ page }) => {
    await page.goto('/admin/employers');
    await page.waitForLoadState('networkidle');

    const viewLink = page.locator('a[href^="/admin/employers/"]').first();
    if (await viewLink.isVisible()) {
      await viewLink.click();
      await page.waitForURL(/\/admin\/employers\/.+/);
      await expect(page.getByText('Organization Info')).toBeVisible();
    }
  });

  // ──────────────────────────────────────
  // Jobs
  // ──────────────────────────────────────

  test('Jobs page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/jobs');
    await page.waitForLoadState('networkidle');

    // Use heading role for specificity
    await expect(page.getByRole('main').locator('h1')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // Intro Requests
  // ──────────────────────────────────────

  test('Intro Requests page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/intro-requests');
    await page.waitForLoadState('networkidle');

    // Use the heading in the main content area
    await expect(page.getByRole('main').locator('h1')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // Placements
  // ──────────────────────────────────────

  test('Placements page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/placements');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Placement Pipeline' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('Create Placement page loads', async ({ page }) => {
    await page.goto('/admin/placements/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Create Placement' })).toBeVisible();
    await expect(page.getByPlaceholder('UUID of the candidate')).toBeVisible();
    await expect(page.getByPlaceholder('UUID of the employer')).toBeVisible();
  });

  // ──────────────────────────────────────
  // Reports
  // ──────────────────────────────────────

  test('Reports page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('Export Report button is visible', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /export report/i })).toBeVisible();
  });

  // ──────────────────────────────────────
  // Taxonomy
  // ──────────────────────────────────────

  test('Taxonomy page loads with CRUD capabilities', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/taxonomy');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Taxonomy Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Can switch taxonomy tabs', async ({ page }) => {
    await page.goto('/admin/taxonomy');
    await page.waitForLoadState('networkidle');

    for (const tab of ['Tracks', 'Cohorts', 'Locations', 'Skills']) {
      await page.getByRole('button', { name: tab }).click();
      await page.waitForTimeout(500);
    }
  });

  // ──────────────────────────────────────
  // Audit Logs
  // ──────────────────────────────────────

  test('Audit Logs page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // User Management
  // ──────────────────────────────────────

  test('Users page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  // Note: Settings page requires admin.manage_settings (Super Admin only)
  // PM doesn't have this permission, so Settings is not tested here.

  // ──────────────────────────────────────
  // Full navigation sweep
  // ──────────────────────────────────────

  test('Navigate all admin pages without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const pages = [
      '/admin',
      '/admin/candidates',
      '/admin/employers',
      '/admin/jobs',
      '/admin/intro-requests',
      '/admin/placements',
      '/admin/reports',
      '/admin/taxonomy',
      '/admin/audit-logs',
      '/admin/users',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

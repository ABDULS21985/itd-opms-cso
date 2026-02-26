import { test, expect } from '@playwright/test';

const CANDIDATE_EMAIL = 'ada.okafor@talentportal.uat';
const CANDIDATE_PASSWORD = 'Password123!';

test.describe('Candidate Intro Requests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as candidate
    await page.goto('/auth/login');
    await page.getByPlaceholder('you@example.com').fill(CANDIDATE_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(CANDIDATE_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('dashboard loads intro requests count without errors', async ({ page }) => {
    // Verify dashboard loaded
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Check no network errors for intro-requests
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/intro-requests') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // The intro requests card should be visible (in main content, not sidebar)
    await expect(page.getByRole('main').getByText('Intro Requests')).toBeVisible();

    expect(failedRequests).toHaveLength(0);
  });

  test('intro requests page loads without 400 errors', async ({ page }) => {
    // Track failed requests
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/intro-requests') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to intro requests page
    await page.goto('/dashboard/intro-requests');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Intro Requests' })).toBeVisible();

    // No 400 errors should occur
    expect(failedRequests).toHaveLength(0);
  });

  test('status filter tabs work without errors', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/intro-requests') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/dashboard/intro-requests');
    await page.waitForLoadState('networkidle');

    // Click each filter tab and verify no errors
    const filters = ['Pending', 'Approved', 'Accepted', 'Declined'];
    for (const filter of filters) {
      await page.getByRole('button', { name: filter, exact: true }).click();
      await page.waitForTimeout(1000);
    }

    // Click "All" to reset
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.waitForTimeout(1000);

    // No 400 errors should have occurred
    expect(failedRequests).toHaveLength(0);
  });

  test('no JavaScript errors on intro requests page', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/dashboard/intro-requests');
    await page.waitForLoadState('networkidle');

    // Click through filters
    const filters = ['Pending', 'Approved', 'Accepted', 'Declined', 'All'];
    for (const filter of filters) {
      await page.getByRole('button', { name: filter, exact: true }).click();
      await page.waitForTimeout(1000);
    }

    // No JS errors should have occurred
    expect(jsErrors).toHaveLength(0);
  });
});

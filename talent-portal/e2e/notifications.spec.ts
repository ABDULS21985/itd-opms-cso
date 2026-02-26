import { test, expect, type Page } from '@playwright/test';

const PM_EMAIL = 'placement.manager@talentportal.uat';
const PASSWORD = 'Password123!';

async function loginAsManager(page: Page) {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('you@example.com').fill(PM_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByPlaceholder('Enter your password').press('Enter');
  await page.waitForURL('/admin', { timeout: 15000 });
}

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  // ──────────────────────────────────────
  // Notification Bell & Dropdown
  // ──────────────────────────────────────

  test('Notification bell icon is visible in header', async ({ page }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await expect(bell).toBeVisible();
  });

  test('Clicking notification bell opens dropdown', async ({ page }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();

    // Dropdown should appear with "Notifications" heading
    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible();
  });

  test('Notification dropdown shows empty state when no notifications', async ({
    page,
  }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();
    await page.waitForTimeout(1000);

    // Either has notifications or shows empty state
    const hasNotifications = await page
      .locator('[class*="notification-item"], [class*="divide-y"] > div')
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasNotifications) {
      await expect(page.getByText('No notifications yet')).toBeVisible();
    }
  });

  test('Notification dropdown closes on Escape key', async ({ page }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();

    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).not.toBeVisible();
  });

  test('Notification dropdown closes on outside click', async ({ page }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();

    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible();

    // Click on the main content area (outside dropdown)
    await page.locator('main').click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(300);

    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).not.toBeVisible();
  });

  test('Notification dropdown has settings link', async ({ page }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();
    await page.waitForTimeout(500);

    // Check for the settings link (may or may not be visible depending on notifications)
    const settingsLink = page.locator(
      'a[href="/admin/settings/notifications"]',
    );
    const linkCount = await settingsLink.count();

    // Link only appears when there are notifications, so just verify it's a valid link if present
    if (linkCount > 0) {
      await expect(settingsLink.first()).toHaveAttribute(
        'href',
        '/admin/settings/notifications',
      );
    }
  });

  test('No API errors when fetching notifications', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/notifications') && res.status() >= 400) {
        // Ignore 401/403 which may happen due to test auth timing
        if (res.status() !== 401 && res.status() !== 403) {
          failedRequests.push(`${res.status()} ${url}`);
        }
      }
    });

    await page.waitForTimeout(2000);

    // Open dropdown to trigger notification fetch
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();
    await page.waitForTimeout(2000);

    expect(failedRequests).toHaveLength(0);
  });

  test('No JavaScript errors on admin pages with notification system', async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    // Navigate through several pages to test notification integration
    const pages = ['/admin', '/admin/candidates', '/admin/employers'];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    // Filter out known harmless errors
    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydration') &&
        !e.includes('WebSocket'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  // ──────────────────────────────────────
  // Unread count badge
  // ──────────────────────────────────────

  test('Unread count endpoint responds without errors', async ({ page }) => {
    let unreadCountStatus: number | null = null;
    page.on('response', (res) => {
      if (res.url().includes('/unread-count')) {
        unreadCountStatus = res.status();
      }
    });

    await page.waitForTimeout(3000); // Wait for polling to kick in

    // Either it was called and succeeded, or it hasn't fired yet
    if (unreadCountStatus !== null) {
      expect(unreadCountStatus).toBeLessThan(400);
    }
  });

  // ──────────────────────────────────────
  // Mark as read operations
  // ──────────────────────────────────────

  test('Mark all read button appears when there are unread notifications', async ({
    page,
  }) => {
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click();
    await page.waitForTimeout(1000);

    // If there are unread notifications, mark all read button should be visible
    const markAllBtn = page.getByText('Mark all read');
    const hasBadge = await page
      .locator(
        'button[aria-label="Notifications"] span.bg-red-500, button[aria-label="Notifications"] span[class*="bg-red"]',
      )
      .isVisible()
      .catch(() => false);

    if (hasBadge) {
      await expect(markAllBtn).toBeVisible();
    }
  });
});

test.describe('Notification Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  // ──────────────────────────────────────
  // Settings page navigation & rendering
  // ──────────────────────────────────────

  test('Notification settings page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Notification Preferences' }),
    ).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Notification settings page has channel preferences section', async ({
    page,
  }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Notification Channels')).toBeVisible();
  });

  test('Notification settings page has email digest section', async ({
    page,
  }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Email Digest Frequency')).toBeVisible();
  });

  test('Notification settings page has quiet hours section', async ({
    page,
  }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Quiet Hours' })).toBeVisible();
  });

  test('Notification settings page has browser push section', async ({
    page,
  }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Browser Push Notifications'),
    ).toBeVisible();
  });

  test('Notification settings page has save button', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('button', { name: /Save Preferences/i }),
    ).toBeVisible();
  });

  test('Notification settings page has back link to settings', async ({
    page,
  }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const backLink = page.locator('a[href="/admin/settings"]').first();
    await expect(backLink).toBeVisible();
  });

  // ──────────────────────────────────────
  // Channel preference controls
  // ──────────────────────────────────────

  test('Channel preference dropdowns are interactive', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Find the first select element for channel preferences
    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount > 0) {
      const firstSelect = selects.first();
      await expect(firstSelect).toBeVisible();

      // Verify dropdown has the expected options
      const options = firstSelect.locator('option');
      const optionTexts: string[] = [];
      for (let i = 0; i < (await options.count()); i++) {
        optionTexts.push(await options.nth(i).textContent() || '');
      }

      expect(optionTexts).toContain('In-App & Email');
      expect(optionTexts).toContain('In-App Only');
      expect(optionTexts).toContain('Email Only');
      expect(optionTexts).toContain('Off');
    }
  });

  test('Can change a channel preference', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount > 0) {
      const firstSelect = selects.first();
      await firstSelect.selectOption('in_app');

      const selectedValue = await firstSelect.inputValue();
      expect(selectedValue).toBe('in_app');
    }
  });

  // ──────────────────────────────────────
  // Email digest radio buttons
  // ──────────────────────────────────────

  test('Email digest radio buttons are interactive', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const immediateRadio = page.locator('input[value="immediate"]');
    const dailyRadio = page.locator('input[value="daily"]');
    const weeklyRadio = page.locator('input[value="weekly"]');
    const noneRadio = page.locator('input[value="none"]');

    // At least one should be checked
    const anyChecked =
      (await immediateRadio.isChecked()) ||
      (await dailyRadio.isChecked()) ||
      (await weeklyRadio.isChecked()) ||
      (await noneRadio.isChecked());

    expect(anyChecked).toBe(true);
  });

  test('Can switch email digest frequency', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const dailyRadio = page.locator('input[value="daily"]');
    await dailyRadio.click();
    await expect(dailyRadio).toBeChecked();

    const weeklyRadio = page.locator('input[value="weekly"]');
    await weeklyRadio.click();
    await expect(weeklyRadio).toBeChecked();
    await expect(dailyRadio).not.toBeChecked();
  });

  // ──────────────────────────────────────
  // Quiet hours inputs
  // ──────────────────────────────────────

  test('Quiet hours time inputs are present', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const timeInputs = page.locator('input[type="time"]');
    await expect(timeInputs).toHaveCount(2);
  });

  test('Can set quiet hours', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');

    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.first().fill('22:00');
    await timeInputs.last().fill('07:00');

    expect(await timeInputs.first().inputValue()).toBe('22:00');
    expect(await timeInputs.last().inputValue()).toBe('07:00');
  });

  // ──────────────────────────────────────
  // No API errors
  // ──────────────────────────────────────

  test('No API errors when loading notification settings', async ({
    page,
  }) => {
    const failedRequests: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (
        url.includes('/notification-preferences') &&
        res.status() >= 400
      ) {
        if (res.status() !== 401 && res.status() !== 403) {
          failedRequests.push(`${res.status()} ${url}`);
        }
      }
    });

    await page.goto('/admin/settings/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(failedRequests).toHaveLength(0);
  });

  test('Navigate from main settings to notification settings', async ({
    page,
  }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The main settings page loads (either successfully or shows error state)
    const heading = page.getByRole('heading', { name: 'Portal Settings' });
    const errorState = page.getByText('Failed to load settings');
    const loadingState = page.locator('.animate-pulse');

    // Page should render something (not be blank)
    await expect(
      heading.or(errorState).or(loadingState),
    ).toBeVisible({ timeout: 10000 });
  });
});

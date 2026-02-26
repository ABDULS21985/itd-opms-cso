import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const PM_EMAIL = 'placement.manager@talentportal.uat';
const PASSWORD = 'Password123!';

test('Debug login flow', async ({ page }) => {
  // Intercept API requests
  const apiRequests: string[] = [];
  const apiResponses: { url: string; status: number; body: string }[] = [];

  page.on('request', (req) => {
    if (req.url().includes('/auth') || req.url().includes('/login') || req.url().includes('/api')) {
      apiRequests.push(`${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/auth') || url.includes('/login')) {
      let body = '';
      try {
        body = await res.text();
      } catch { body = '(no body)'; }
      apiResponses.push({ url, status: res.status(), body: body.substring(0, 500) });
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[${msg.type()}]`, msg.text());
    }
  });

  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // Check the page content
  const bodyText = await page.locator('body').innerText();
  console.log('Page text (first 500 chars):', bodyText.substring(0, 500));

  const adminBtn = page.getByRole('button', { name: /admin/i });
  await adminBtn.click();
  await page.waitForTimeout(500);

  await page.getByPlaceholder('you@example.com').fill(PM_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);

  await page.getByRole('button', { name: /sign in/i }).click({ force: true });
  await page.waitForTimeout(8000);

  console.log('\n=== API Requests ===');
  apiRequests.forEach((r) => console.log(r));

  console.log('\n=== API Responses ===');
  apiResponses.forEach((r) => console.log(`${r.status} ${r.url}\n  body: ${r.body.substring(0, 200)}`));

  console.log('\nFinal URL:', page.url());

  // Check visible text after login attempt
  const afterText = await page.locator('body').innerText();
  console.log('After text (first 500 chars):', afterText.substring(0, 500));
});

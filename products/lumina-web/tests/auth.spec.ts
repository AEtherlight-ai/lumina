/**
 * DESIGN DECISION: Comprehensive auth flow testing
 * WHY: Auth is critical path - must ensure sign-up, sign-in, sign-out work flawlessly
 *
 * REASONING CHAIN:
 * 1. Test sign-up flow (email + password)
 * 2. Test sign-in flow (existing user)
 * 3. Test sign-out flow
 * 4. Test protected route access (dashboard requires auth)
 * 5. Test redirect after sign-in (back to intended page)
 *
 * PATTERN: Pattern-TEST-002 (Auth Flow Testing)
 * RELATED: app/(auth)/, middleware.ts
 * FUTURE: Add OAuth flow tests, password reset tests
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('should sign up new user', async ({ page }) => {
    await page.goto('/sign-up');

    // Fill sign-up form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after sign-up
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
  });

  test('should sign in existing user', async ({ page }) => {
    await page.goto('/sign-in');

    // Fill sign-in form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should protect dashboard routes', async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto('/dashboard');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('should sign out user', async ({ page }) => {
    // Sign in first
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Sign out
    await page.click('button:has-text("Sign Out")');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should redirect to intended page after sign-in', async ({ page }) => {
    // Try to access settings (protected)
    await page.goto('/dashboard/settings');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/);

    // Sign in
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect back to settings
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});

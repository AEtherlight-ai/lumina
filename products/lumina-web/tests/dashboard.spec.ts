/**
 * DESIGN DECISION: Dashboard feature testing
 * WHY: Ensure all dashboard features work after authentication
 *
 * REASONING CHAIN:
 * 1. Test dashboard overview displays correctly
 * 2. Test navigation between dashboard pages
 * 3. Test device management CRUD
 * 4. Test invite generation
 * 5. Test subscription display
 * 6. Test settings updates
 *
 * PATTERN: Pattern-TEST-003 (Dashboard Testing)
 * RELATED: app/dashboard/*, Supabase database
 * FUTURE: Add performance tests, accessibility tests
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
  const testEmail = `test-dashboard-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    // Sign up and authenticate
    await page.goto('/sign-up');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for key elements
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('text=Storage Used')).toBeVisible();
    await expect(page.locator('text=Devices')).toBeVisible();
    await expect(page.locator('text=Active Invites')).toBeVisible();
  });

  test('should navigate to devices page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/dashboard/devices"]');

    await expect(page).toHaveURL('/dashboard/devices');
    await expect(page.locator('text=My Devices')).toBeVisible();
  });

  test('should add new device', async ({ page }) => {
    await page.goto('/dashboard/devices');

    // Click add device button
    await page.click('button:has-text("Add Device")');

    // Fill device form
    await page.fill('input[placeholder*="device"]', 'Test Laptop');
    await page.selectOption('select', 'laptop');
    await page.fill('input[type="number"]', '1000');
    await page.click('button:has-text("Add Device")');

    // Should show success message
    await expect(page.locator('text=Device added successfully')).toBeVisible({ timeout: 5000 });

    // Device should appear in list
    await expect(page.locator('text=Test Laptop')).toBeVisible();
  });

  test('should navigate to invites page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/dashboard/invites"]');

    await expect(page).toHaveURL('/dashboard/invites');
    await expect(page.locator('text=Invite Friends')).toBeVisible();
  });

  test('should generate invite code', async ({ page }) => {
    await page.goto('/dashboard/invites');

    // Click generate invite button
    await page.click('button:has-text("Generate")');

    // Should show success message
    await expect(page.locator('text=Invite generated')).toBeVisible({ timeout: 5000 });

    // Invite code should appear
    await expect(page.locator('text=/LUM-[A-Z0-9]+/')).toBeVisible();
  });

  test('should navigate to subscription page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/dashboard/subscription"]');

    await expect(page).toHaveURL('/dashboard/subscription');
    await expect(page.locator('text=Subscription')).toBeVisible();
    await expect(page.locator('text=Free')).toBeVisible(); // Default tier
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/dashboard/settings"]');

    await expect(page).toHaveURL('/dashboard/settings');
    await expect(page.locator('text=Account Settings')).toBeVisible();
  });

  test('should update profile in settings', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Update full name
    await page.fill('input#fullName', 'John Doe Updated');
    await page.click('button:has-text("Save Changes")');

    // Should show success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should sign out from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Click sign out button
    await page.click('button:has-text("Sign Out")');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});

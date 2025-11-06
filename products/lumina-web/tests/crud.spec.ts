/**
 * DESIGN DECISION: CRUD operation testing for all entities
 * WHY: Ensure Create, Read, Update, Delete operations work correctly
 *
 * REASONING CHAIN:
 * 1. Test device CRUD (add, view, update, delete)
 * 2. Test invite CRUD (generate, view, copy, revoke)
 * 3. Test profile updates
 * 4. Test password changes
 * 5. Verify data persistence across sessions
 *
 * PATTERN: Pattern-TEST-004 (CRUD Testing)
 * RELATED: Supabase database, RLS policies
 * FUTURE: Add bulk operation tests, concurrent update tests
 */

import { test, expect } from '@playwright/test';

test.describe('CRUD Operations', () => {
  const testEmail = `test-crud-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    // Sign up and authenticate
    await page.goto('/sign-up');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Device CRUD', () => {
    test('should create device', async ({ page }) => {
      await page.goto('/dashboard/devices');

      await page.click('button:has-text("Add Device")');
      await page.fill('input[placeholder*="device"]', 'Test Desktop');
      await page.selectOption('select', 'desktop');
      await page.fill('input[type="number"]', '5000');
      await page.click('button:has-text("Add Device")');

      await expect(page.locator('text=Device added successfully')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Test Desktop')).toBeVisible();
    });

    test('should read device list', async ({ page }) => {
      await page.goto('/dashboard/devices');

      // Should show devices table
      await expect(page.locator('text=Device Name')).toBeVisible();
      await expect(page.locator('text=Type')).toBeVisible();
      await expect(page.locator('text=Storage')).toBeVisible();
    });

    test('should delete device', async ({ page }) => {
      await page.goto('/dashboard/devices');

      // Add device first
      await page.click('button:has-text("Add Device")');
      await page.fill('input[placeholder*="device"]', 'Device To Delete');
      await page.selectOption('select', 'desktop');
      await page.fill('input[type="number"]', '1000');
      await page.click('button:has-text("Add Device")');
      await expect(page.locator('text=Device added successfully')).toBeVisible({ timeout: 5000 });

      // Delete device
      const deleteButton = page.locator('button:has-text("Remove")').first();
      await deleteButton.click();

      await expect(page.locator('text=Device removed')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Invite CRUD', () => {
    test('should create invite', async ({ page }) => {
      await page.goto('/dashboard/invites');

      await page.click('button:has-text("Generate")');

      await expect(page.locator('text=Invite generated')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/LUM-[A-Z0-9]+/')).toBeVisible();
    });

    test('should read invite list', async ({ page }) => {
      await page.goto('/dashboard/invites');

      // Should show invites table headers
      await expect(page.locator('text=Code')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Created')).toBeVisible();
    });

    test('should copy invite code', async ({ page }) => {
      await page.goto('/dashboard/invites');

      // Generate invite first
      await page.click('button:has-text("Generate")');
      await expect(page.locator('text=Invite generated')).toBeVisible({ timeout: 5000 });

      // Copy invite code
      await page.click('button:has-text("Copy")');

      await expect(page.locator('text=Copied')).toBeVisible({ timeout: 3000 });
    });

    test('should revoke invite', async ({ page }) => {
      await page.goto('/dashboard/invites');

      // Generate invite first
      await page.click('button:has-text("Generate")');
      await expect(page.locator('text=Invite generated')).toBeVisible({ timeout: 5000 });

      // Revoke invite
      await page.click('button:has-text("Revoke")');

      await expect(page.locator('text=Invite revoked')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=revoked')).toBeVisible();
    });
  });

  test.describe('Profile CRUD', () => {
    test('should update profile name', async ({ page }) => {
      await page.goto('/dashboard/settings');

      const newName = 'Updated Name ' + Date.now();
      await page.fill('input#fullName', newName);
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 5000 });

      // Verify update persists
      await page.reload();
      await expect(page.locator(`input#fullName[value="${newName}"]`)).toBeVisible();
    });

    test('should update email with verification notice', async ({ page }) => {
      await page.goto('/dashboard/settings');

      const newEmail = `updated-${Date.now()}@example.com`;
      await page.fill('input#email', newEmail);
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Email update sent')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Check your inbox')).toBeVisible();
    });
  });

  test.describe('Password CRUD', () => {
    test('should change password', async ({ page }) => {
      await page.goto('/dashboard/settings');

      await page.fill('input#currentPassword', testPassword);
      await page.fill('input#newPassword', 'NewPassword123!');
      await page.fill('input#confirmPassword', 'NewPassword123!');
      await page.click('button:has-text("Change Password")');

      await expect(page.locator('text=Password changed successfully')).toBeVisible({ timeout: 5000 });

      // Verify password fields cleared
      await expect(page.locator('input#newPassword')).toHaveValue('');
      await expect(page.locator('input#confirmPassword')).toHaveValue('');
    });

    test('should validate password mismatch', async ({ page }) => {
      await page.goto('/dashboard/settings');

      await page.fill('input#newPassword', 'NewPassword123!');
      await page.fill('input#confirmPassword', 'DifferentPassword123!');
      await page.click('button:has-text("Change Password")');

      await expect(page.locator('text=Passwords don\'t match')).toBeVisible({ timeout: 5000 });
    });

    test('should validate password length', async ({ page }) => {
      await page.goto('/dashboard/settings');

      await page.fill('input#newPassword', 'short');
      await page.fill('input#confirmPassword', 'short');
      await page.click('button:has-text("Change Password")');

      await expect(page.locator('text=at least 8 characters')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist data across sessions', async ({ page, context }) => {
      // Add device
      await page.goto('/dashboard/devices');
      await page.click('button:has-text("Add Device")');
      await page.fill('input[placeholder*="device"]', 'Persistent Device');
      await page.selectOption('select', 'desktop');
      await page.fill('input[type="number"]', '2000');
      await page.click('button:has-text("Add Device")');
      await expect(page.locator('text=Device added successfully')).toBeVisible({ timeout: 5000 });

      // Sign out
      await page.goto('/dashboard');
      await page.click('button:has-text("Sign Out")');
      await expect(page).toHaveURL('/');

      // Sign back in
      await page.goto('/sign-in');
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Check device still exists
      await page.goto('/dashboard/devices');
      await expect(page.locator('text=Persistent Device')).toBeVisible();
    });
  });
});

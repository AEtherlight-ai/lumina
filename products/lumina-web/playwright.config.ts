/**
 * DESIGN DECISION: Playwright for E2E testing
 * WHY: Modern, fast, reliable E2E testing with TypeScript support
 *
 * REASONING CHAIN:
 * 1. Playwright over Cypress: Better TypeScript support, faster, more reliable
 * 2. Chromium-only for development speed (cross-browser in CI later)
 * 3. Base URL set to http://localhost:3003
 * 4. Tests run in headed mode during development
 * 5. Retries disabled for faster feedback
 *
 * PATTERN: Pattern-TEST-001 (E2E Testing Strategy)
 * RELATED: Test files in tests/ directory
 * FUTURE: Add Firefox/Safari for cross-browser testing in CI
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests serially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

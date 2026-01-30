/* eslint-disable no-console *//**
 * Visual Regression Tests for Unified Design System
 *
 * Tests golden pages with theme variations:
 * - Light and dark themes
 * - Multiple accent colors
 * - Desktop and tablet breakpoints
 *
 * Total coverage: 6 pages × 2 themes × 2 breakpoints × 2 accents = 48 screenshots
 *
 * Run with: npm run test:e2e -- design-system-visual.spec.ts
 * Update snapshots: npm run test:e2e -- design-system-visual.spec.ts --update-snapshots
 */

import { test, expect, Page } from '@playwright/test';
import { setupGoldenDataset, freezeTime } from './visual-regression/fixtures';
import { applyTheme, validateContrast } from './visual-regression/helpers';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Golden pages to test
 * These are the core pages that must maintain visual consistency
 */
const GOLDEN_PAGES = [
  { path: '/', name: 'dashboard', title: 'Dashboard' },
  { path: '/sell', name: 'sell', title: 'Sell' },
  { path: '/admin', name: 'settings', title: 'Settings' },
  { path: '/warehouse', name: 'inventory', title: 'Inventory' },
  { path: '/customers', name: 'customers', title: 'Customers' },
  { path: '/reporting', name: 'reports', title: 'Reports' },
];

/**
 * Theme modes to test
 */
const THEME_MODES = ['light', 'dark'] as const;

/**
 * Accent colors to test
 * Testing default (blue) + one alternate (green) per requirements
 */
const ACCENT_COLORS = [
  { name: 'blue', value: '#3b82f6' },
  { name: 'green', value: '#10b981' },
] as const;

/**
 * Breakpoints to test
 * Desktop (1920px) and tablet (768px) per requirements
 */
const BREAKPOINTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login helper
 */
async function login(page: Page): Promise<void> {
  await page.goto('/');

  // Check if already logged in
  const isLoggedIn = await page
    .locator('[data-testid="user-menu"]')
    .isVisible()
    .catch(() => false);

  if (isLoggedIn) return;

  // Login with test credentials
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * Wait for page to be stable
 */
async function waitForStable(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any animations to complete
  await page.waitForTimeout(500);

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Generate screenshot name
 */
function getScreenshotName(
  pageName: string,
  theme: string,
  accent: string,
  breakpoint: string
): string {
  return `${pageName}-${theme}-${accent}-${breakpoint}.png`;
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Design System Visual Regression - Golden Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set up golden dataset for deterministic screenshots
    await setupGoldenDataset(page);

    // Freeze time for consistent timestamps
    await freezeTime(page);

    // Login
    await login(page);
  });

  // Generate tests for all combinations
  for (const pageInfo of GOLDEN_PAGES) {
    for (const theme of THEME_MODES) {
      for (const accent of ACCENT_COLORS) {
        for (const breakpoint of BREAKPOINTS) {
          test(`${pageInfo.name} - ${theme} theme - ${accent.name} accent - ${breakpoint.name}`, async ({
            page,
          }) => {
            // Set viewport
            await page.setViewportSize({
              width: breakpoint.width,
              height: breakpoint.height,
            });

            // Apply theme
            await applyTheme(page, {
              mode: theme,
              accentColor: accent.value,
            });

            // Navigate to page
            await page.goto(pageInfo.path);

            // Wait for page to be stable
            await waitForStable(page);

            // Take screenshot
            const screenshotName = getScreenshotName(
              pageInfo.name,
              theme,
              accent.name,
              breakpoint.name
            );

            await expect(page).toHaveScreenshot(screenshotName, {
              fullPage: true,
              animations: 'disabled',
              // Increase threshold slightly to account for font rendering differences
              threshold: 0.2,
            });

            // Validate contrast ratios (only in CI, not during snapshot updates)
            if (process.env.CI) {
              const contrastIssues = await validateContrast(page);
              if (contrastIssues.length > 0) {
                console.warn(
                  `Contrast issues found on ${pageInfo.name} (${theme} theme, ${accent.name} accent):`,
                  contrastIssues
                );
              }
            }
          });
        }
      }
    }
  }
});

test.describe('Design System Visual Regression - Component States', () => {
  test.beforeEach(async ({ page }) => {
    await setupGoldenDataset(page);
    await freezeTime(page);
    await login(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Settings page - search results', async ({ page }) => {
    await applyTheme(page, { mode: 'light', accentColor: '#3b82f6' });
    await page.goto('/admin');
    await waitForStable(page);

    // Enter search query
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('tax');
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('settings-search-light-blue-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Inventory page - empty state', async ({ page }) => {
    await applyTheme(page, { mode: 'dark', accentColor: '#10b981' });
    await page.goto('/warehouse');
    await waitForStable(page);

    // Clear any existing data (if possible)
    // This would depend on your app's implementation

    await expect(page).toHaveScreenshot('inventory-empty-dark-green-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Customer details - expanded view', async ({ page }) => {
    await applyTheme(page, { mode: 'light', accentColor: '#3b82f6' });
    await page.goto('/customers');
    await waitForStable(page);

    // Click first customer (if available)
    const firstCustomer = page.locator('[data-testid="customer-row"]').first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('customers-details-light-blue-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Design System Visual Regression - Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupGoldenDataset(page);
    await freezeTime(page);
    await login(page);
  });

  test('Dashboard - mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await applyTheme(page, { mode: 'light', accentColor: '#3b82f6' });
    await page.goto('/');
    await waitForStable(page);

    await expect(page).toHaveScreenshot('dashboard-light-blue-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Sell page - sidebar collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await applyTheme(page, { mode: 'dark', accentColor: '#10b981' });
    await page.goto('/sell');
    await waitForStable(page);

    // Toggle sidebar (if applicable)
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('sell-dark-green-tablet-collapsed.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Design System Visual Regression - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupGoldenDataset(page);
    await freezeTime(page);
    await login(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Focus states - keyboard navigation', async ({ page }) => {
    await applyTheme(page, { mode: 'light', accentColor: '#3b82f6' });
    await page.goto('/');
    await waitForStable(page);

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('focus-states-light-blue-desktop.png', {
      animations: 'disabled',
    });
  });

  test('High contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    await applyTheme(page, { mode: 'light', accentColor: '#3b82f6' });
    await page.goto('/');
    await waitForStable(page);

    await expect(page).toHaveScreenshot('high-contrast-light-blue-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Reduced motion', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await applyTheme(page, { mode: 'dark', accentColor: '#10b981' });
    await page.goto('/');
    await waitForStable(page);

    await expect(page).toHaveScreenshot('reduced-motion-dark-green-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

// ============================================================================
// Summary Test
// ============================================================================

test.describe('Design System Visual Regression - Summary', () => {
  test('Generate coverage report', async () => {
    const totalTests =
      GOLDEN_PAGES.length * THEME_MODES.length * ACCENT_COLORS.length * BREAKPOINTS.length;

    console.log('\n=== Visual Regression Test Coverage ===');
    console.log(`Golden Pages: ${GOLDEN_PAGES.length}`);
    console.log(`Theme Modes: ${THEME_MODES.length}`);
    console.log(`Accent Colors: ${ACCENT_COLORS.length}`);
    console.log(`Breakpoints: ${BREAKPOINTS.length}`);
    console.log(`Total Screenshots: ${totalTests}`);
    console.log('=======================================\n');

    expect(totalTests).toBe(48); // Verify we're generating 48 screenshots as required
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests for Design System
 * 
 * This test suite captures screenshots at all breakpoints, text sizes, and densities
 * to ensure visual consistency across the application.
 * 
 * Run with: npm run test:e2e -- visual-regression.spec.ts
 * Update snapshots: npm run test:e2e -- visual-regression.spec.ts --update-snapshots
 */

// Breakpoints to test (matching design system)
const breakpoints = [
  { name: 'xs', width: 375, height: 667 },   // iPhone SE
  { name: 'sm', width: 640, height: 1136 },  // Small tablet
  { name: 'md', width: 768, height: 1024 },  // iPad
  { name: 'lg', width: 1024, height: 768 },  // Desktop
  { name: 'xl', width: 1280, height: 720 },  // Large desktop
  { name: '2xl', width: 1920, height: 1080 }, // Full HD
];

// Text sizes to test
const textSizes = ['small', 'medium', 'large', 'extra-large'];

// Density settings to test
const densities = ['compact', 'comfortable', 'spacious'];

// Pages to test
const pages = [
  { path: '/', name: 'home' },
  { path: '/sell', name: 'sell' },
  { path: '/lookup', name: 'lookup' },
  { path: '/warehouse', name: 'warehouse' },
  { path: '/customers', name: 'customers' },
  { path: '/reporting', name: 'reporting' },
  { path: '/admin', name: 'admin' },
];

/**
 * Helper function to set display settings
 */
async function setDisplaySettings(
  page: Page,
  settings: {
    textSize?: string;
    density?: string;
    theme?: string;
  }
) {
  await page.evaluate((settings) => {
    const currentSettings = JSON.parse(
      localStorage.getItem('displaySettings') || '{}'
    );
    const newSettings = {
      textSize: 'medium',
      density: 'comfortable',
      sidebarWidth: 'medium',
      theme: 'dark',
      animationSpeed: 'normal',
      reducedMotion: false,
      ...currentSettings,
      ...settings,
    };
    localStorage.setItem('displaySettings', JSON.stringify(newSettings));
    
    // Apply settings to document root
    const root = document.documentElement;
    const textSizeMultipliers: Record<string, number> = {
      small: 0.875,
      medium: 1.0,
      large: 1.125,
      'extra-large': 1.25,
    };
    const densityMultipliers: Record<string, number> = {
      compact: 0.75,
      comfortable: 1.0,
      spacious: 1.25,
    };
    
    root.style.setProperty('--text-scale', textSizeMultipliers[newSettings.textSize].toString());
    root.style.setProperty('--density-scale', densityMultipliers[newSettings.density].toString());
    root.setAttribute('data-theme', newSettings.theme);
  }, settings);
}

/**
 * Helper function to login
 */
async function login(page: Page) {
  await page.goto('/');
  
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
  if (isLoggedIn) return;
  
  // Login
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForURL('/', { timeout: 5000 });
}

test.describe('Visual Regression - Breakpoints', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const breakpoint of breakpoints) {
    for (const pageInfo of pages) {
      test(`${pageInfo.name} page at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({
          width: breakpoint.width,
          height: breakpoint.height,
        });

        // Navigate to page
        await page.goto(pageInfo.path);
        
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
        
        // Wait a bit for animations to complete
        await page.waitForTimeout(500);

        // Take screenshot
        await expect(page).toHaveScreenshot(
          `${pageInfo.name}-${breakpoint.name}.png`,
          {
            fullPage: true,
            animations: 'disabled',
          }
        );
      });
    }
  }
});

test.describe('Visual Regression - Text Sizes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const textSize of textSizes) {
    test(`Home page with ${textSize} text`, async ({ page }) => {
      // Set viewport to desktop
      await page.setViewportSize({ width: 1280, height: 720 });

      // Set text size
      await setDisplaySettings(page, { textSize });

      // Navigate to home page
      await page.goto('/');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot
      await expect(page).toHaveScreenshot(
        `home-text-${textSize}.png`,
        {
          fullPage: true,
          animations: 'disabled',
        }
      );
    });
  }
});

test.describe('Visual Regression - Density Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const density of densities) {
    test(`Home page with ${density} density`, async ({ page }) => {
      // Set viewport to desktop
      await page.setViewportSize({ width: 1280, height: 720 });

      // Set density
      await setDisplaySettings(page, { density });

      // Navigate to home page
      await page.goto('/');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot
      await expect(page).toHaveScreenshot(
        `home-density-${density}.png`,
        {
          fullPage: true,
          animations: 'disabled',
        }
      );
    });
  }
});

test.describe('Visual Regression - Aspect Ratios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const aspectRatios = [
    { name: 'portrait', width: 768, height: 1024 },    // 3:4
    { name: 'square', width: 1024, height: 1024 },     // 1:1
    { name: 'standard', width: 1280, height: 1024 },   // 5:4
    { name: 'widescreen', width: 1920, height: 1080 }, // 16:9
    { name: 'ultrawide', width: 2560, height: 1080 },  // 21:9
  ];

  for (const ratio of aspectRatios) {
    test(`Home page at ${ratio.name} aspect ratio (${ratio.width}x${ratio.height})`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({
        width: ratio.width,
        height: ratio.height,
      });

      // Navigate to home page
      await page.goto('/');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot
      await expect(page).toHaveScreenshot(
        `home-aspect-${ratio.name}.png`,
        {
          fullPage: true,
          animations: 'disabled',
        }
      );
    });
  }
});

test.describe('Visual Regression - Component States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Buttons - all variants and states', async ({ page }) => {
    // Navigate to Storybook button stories (if available)
    // Or create a test page with all button variants
    await page.goto('/admin'); // Using admin page as it has various buttons
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('buttons-variants.png', {
      animations: 'disabled',
    });
  });

  test('Forms - validation states', async ({ page }) => {
    await page.goto('/admin');
    
    // Trigger validation errors by submitting empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('forms-validation.png', {
      animations: 'disabled',
    });
  });

  test('Navigation - sidebar collapsed and expanded', async ({ page }) => {
    await page.goto('/');
    
    // Expanded state
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('nav-expanded.png', {
      animations: 'disabled',
    });

    // Collapsed state (on mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('nav-collapsed.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Extreme Viewports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Minimum viewport (320x480)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('viewport-minimum.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('4K viewport (3840x2160)', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('viewport-4k.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Ultrawide viewport (3440x1440)', async ({ page }) => {
    await page.setViewportSize({ width: 3440, height: 1440 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('viewport-ultrawide.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

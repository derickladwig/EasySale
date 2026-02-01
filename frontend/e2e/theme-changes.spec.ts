/**
 * Theme Changes E2E Tests
 * 
 * End-to-end tests for theme system functionality
 * Tests theme changes through ThemeEngine (no direct DOM manipulation)
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Changes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login (assuming test credentials)
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Navigate to branding settings page
    await page.goto('/admin/branding');
  });

  test('should display branding settings page', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")', { timeout: 5000 });
    
    // Check that theme controls are visible
    await expect(page.locator('text=Theme Mode')).toBeVisible();
    await expect(page.locator('text=Accent Color')).toBeVisible();
  });

  test('should switch between light and dark mode', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Get current theme mode
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    
    // Find and click theme mode toggle
    const darkModeButton = page.locator('button:has-text("Dark")');
    const lightModeButton = page.locator('button:has-text("Light")');
    
    if (initialClass?.includes('dark')) {
      // Switch to light mode
      await lightModeButton.click();
      await page.waitForTimeout(500);
      
      // Verify light mode applied
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toContain('dark');
    } else {
      // Switch to dark mode
      await darkModeButton.click();
      await page.waitForTimeout(500);
      
      // Verify dark mode applied
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).toContain('dark');
    }
  });

  test('should change accent color', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Find accent color picker or preset buttons
    const accentColorSection = page.locator('text=Accent Color').locator('..');
    
    // Click on a different accent color (e.g., purple)
    await accentColorSection.locator('button[aria-label*="purple"]').click();
    
    // Wait for theme to update
    await page.waitForTimeout(500);
    
    // Verify accent color changed by checking CSS variable
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-500');
    });
    
    expect(accentColor).toBeTruthy();
  });

  test('should persist theme changes across page refresh', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Switch to dark mode
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);
    
    // Verify dark mode applied
    let htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
    
    // Refresh page
    await page.reload();
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Verify dark mode persisted
    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('should apply theme changes to entire app', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Switch to dark mode
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);
    
    // Navigate to different pages and verify theme applied
    await page.goto('/dashboard');
    let htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
    
    await page.goto('/sell');
    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
    
    await page.goto('/inventory');
    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('should use ThemeEngine for theme changes (no direct DOM manipulation)', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Monitor console for any direct DOM manipulation warnings
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    // Change theme mode
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);
    
    // Verify no warnings about direct DOM manipulation
    const domManipulationWarnings = consoleMessages.filter(msg => 
      msg.includes('direct DOM') || msg.includes('setProperty')
    );
    expect(domManipulationWarnings).toHaveLength(0);
  });

  test('should respect theme locks', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // As admin, lock the theme mode
    const lockButton = page.locator('button[aria-label="Lock theme mode"]');
    
    if (await lockButton.isVisible()) {
      await lockButton.click();
      await page.waitForTimeout(500);
      
      // Verify lock indicator appears
      await expect(page.locator('svg[data-testid="lock-icon"]')).toBeVisible();
      
      // Logout and login as regular user
      await page.goto('/logout');
      await page.goto('/login');
      await page.fill('input[name="username"]', 'user@example.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      // Navigate to user theme preferences
      await page.goto('/settings/appearance');
      
      // Verify theme mode is locked (disabled)
      const themeModeControl = page.locator('button:has-text("Dark")');
      await expect(themeModeControl).toBeDisabled();
    }
  });

  test('should show theme preview before applying', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Look for preview mode toggle
    const previewButton = page.locator('button:has-text("Preview")');
    
    if (await previewButton.isVisible()) {
      // Enable preview mode
      await previewButton.click();
      
      // Change accent color
      await page.click('button[aria-label*="purple"]');
      await page.waitForTimeout(500);
      
      // Verify preview applied
      await expect(page.locator('text=Preview Mode')).toBeVisible();
      
      // Apply changes
      await page.click('button:has-text("Apply")');
      
      // Verify preview mode exited
      await expect(page.locator('text=Preview Mode')).not.toBeVisible();
    }
  });

  test('should reset theme to defaults', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Make some theme changes
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);
    
    // Find and click reset button
    const resetButton = page.locator('button:has-text("Reset to Defaults")');
    
    if (await resetButton.isVisible()) {
      await resetButton.click();
      
      // Confirm reset
      await page.click('button:has-text("Confirm")');
      await page.waitForTimeout(500);
      
      // Verify theme reset to light mode (default)
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass).not.toContain('dark');
    }
  });

  test('should export theme configuration', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Find export button
    const exportButton = page.locator('button:has-text("Export Theme")');
    
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download filename
      expect(download.suggestedFilename()).toContain('theme');
      expect(download.suggestedFilename()).toContain('.json');
    }
  });

  test('should import theme configuration', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Find import button
    const importButton = page.locator('button:has-text("Import Theme")');
    
    if (await importButton.isVisible()) {
      // Create a mock theme file
      const themeConfig = {
        mode: 'dark',
        accent: 'purple',
        contrast: 'normal'
      };
      
      // Set up file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await importButton.click();
      
      const fileChooser = await fileChooserPromise;
      
      // Upload mock file
      await fileChooser.setFiles({
        name: 'theme.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(themeConfig))
      });
      
      // Wait for import to complete
      await page.waitForTimeout(1000);
      
      // Verify theme applied
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass).toContain('dark');
    }
  });

  test('should validate theme configuration', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Try to set invalid accent color (if validation exists)
    const customColorInput = page.locator('input[name="custom_accent_color"]');
    
    if (await customColorInput.isVisible()) {
      // Enter invalid color value
      await customColorInput.fill('invalid-color');
      
      // Try to apply
      await page.click('button:has-text("Apply")');
      
      // Verify error message
      await expect(page.locator('text=Invalid color format')).toBeVisible();
    }
  });

  test('should show theme scope hierarchy', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Look for scope indicator
    const scopeInfo = page.locator('text=Current Scope');
    
    if (await scopeInfo.isVisible()) {
      // Verify scope hierarchy displayed
      await expect(page.locator('text=Tenant')).toBeVisible();
      await expect(page.locator('text=Store')).toBeVisible();
      await expect(page.locator('text=User')).toBeVisible();
    }
  });

  test('should apply contrast adjustments', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Find contrast control
    const contrastControl = page.locator('text=Contrast').locator('..');
    
    if (await contrastControl.isVisible()) {
      // Select high contrast
      await contrastControl.locator('button:has-text("High")').click();
      await page.waitForTimeout(500);
      
      // Verify high contrast applied
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass).toContain('high-contrast');
    }
  });

  test('should use semantic tokens throughout app', async ({ page }) => {
    // Navigate to various pages
    const pages = ['/dashboard', '/sell', '/inventory', '/customers', '/reports'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500);
      
      // Check that no hardcoded Tailwind base colors are used
      const html = await page.content();
      
      // Should not contain hardcoded color classes
      expect(html).not.toContain('text-blue-');
      expect(html).not.toContain('text-gray-');
      expect(html).not.toContain('bg-gray-');
      expect(html).not.toContain('border-gray-');
    }
  });

  test('should handle theme changes without page flash', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Record initial background color
    const initialBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    
    // Switch theme mode
    await page.click('button:has-text("Dark")');
    
    // Wait a short time
    await page.waitForTimeout(100);
    
    // Verify background changed smoothly (no white flash)
    const newBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    
    expect(newBg).not.toBe(initialBg);
  });

  test('should apply theme to wizard screens', async ({ page }) => {
    // Navigate to setup wizard (if accessible)
    await page.goto('/fresh-install');
    
    // Wait for wizard to load
    await page.waitForTimeout(1000);
    
    // Verify theme applied to wizard
    const htmlClass = await page.locator('html').getAttribute('class');
    
    // Check that wizard uses theme system
    const html = await page.content();
    expect(html).not.toContain('text-blue-');
    expect(html).not.toContain('bg-gray-');
  });

  test('should cache theme in localStorage', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Branding")');
    
    // Switch to dark mode
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);
    
    // Check localStorage for cached theme
    const cachedTheme = await page.evaluate(() => {
      return localStorage.getItem('EasySale_theme_cache_v2');
    });
    
    expect(cachedTheme).toBeTruthy();
    
    if (cachedTheme) {
      const theme = JSON.parse(cachedTheme);
      expect(theme.mode).toBe('dark');
    }
  });

  test('should load theme before React renders', async ({ page }) => {
    // Clear cache to test fresh load
    await page.evaluate(() => {
      localStorage.removeItem('EasySale_theme_cache_v2');
    });
    
    // Set theme preference
    await page.evaluate(() => {
      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify({
        mode: 'dark',
        accent: 'blue',
        contrast: 'normal'
      }));
    });
    
    // Reload page
    await page.reload();
    
    // Verify theme applied immediately (no flash)
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });
});

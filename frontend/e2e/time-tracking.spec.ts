/**
 * Time Tracking E2E Tests
 * 
 * End-to-end tests for time tracking functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login (assuming test credentials)
    await page.fill('input[name="username"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Navigate to time tracking page
    await page.goto('/time-tracking');
  });

  test('should display time tracking dashboard', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Time Tracking")', { timeout: 5000 });
    
    // Check that tabs are visible
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('button:has-text("Time Entries")')).toBeVisible();
    await expect(page.locator('button:has-text("Reports")')).toBeVisible();
    
    // Dashboard should be active by default
    await expect(page.locator('button:has-text("Dashboard")')).toHaveClass(/border-accent-500/);
  });

  test('should clock in successfully', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Time Tracking")');
    
    // Find and click clock in button
    const clockInButton = page.locator('button:has-text("Clock In")');
    await expect(clockInButton).toBeVisible();
    await clockInButton.click();
    
    // Verify clock in dialog or confirmation
    await expect(page.locator('text=Clocked In')).toBeVisible({ timeout: 5000 });
    
    // Verify clock out button now visible
    await expect(page.locator('button:has-text("Clock Out")')).toBeVisible();
  });

  test('should clock out successfully', async ({ page }) => {
    // First clock in
    await page.waitForSelector('h1:has-text("Time Tracking")');
    const clockInButton = page.locator('button:has-text("Clock In")');
    
    if (await clockInButton.isVisible()) {
      await clockInButton.click();
      await page.waitForTimeout(1000); // Wait for clock in to complete
    }
    
    // Now clock out
    const clockOutButton = page.locator('button:has-text("Clock Out")');
    await expect(clockOutButton).toBeVisible();
    await clockOutButton.click();
    
    // Verify clock out confirmation
    await expect(page.locator('text=Clocked Out')).toBeVisible({ timeout: 5000 });
    
    // Verify clock in button now visible again
    await expect(page.locator('button:has-text("Clock In")')).toBeVisible();
  });

  test('should create manual time entry', async ({ page }) => {
    // Navigate to Time Entries tab
    await page.click('button:has-text("Time Entries")');
    
    // Wait for tab to load
    await expect(page.locator('button:has-text("Time Entries")')).toHaveClass(/border-accent-500/);
    
    // Click "Add Manual Entry" button
    await page.click('button:has-text("Add Manual Entry")');
    
    // Wait for dialog to open
    await expect(page.locator('h2:has-text("Manual Time Entry")')).toBeVisible();
    
    // Fill in time entry details
    const today = new Date().toISOString().slice(0, 10);
    await page.fill('input[name="date"]', today);
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '17:00');
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Regular work day');
    
    // Submit form
    await page.click('button:has-text("Save")');
    
    // Wait for dialog to close
    await expect(page.locator('h2:has-text("Manual Time Entry")')).not.toBeVisible();
    
    // Verify entry appears in list
    await expect(page.locator('text=Regular work day')).toBeVisible();
  });

  test('should display today hours summary', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Time Tracking")');
    
    // Check for today's hours display
    await expect(page.locator('text=Today\'s Hours')).toBeVisible();
    
    // Should show hours in format like "8.0 hours" or "0.0 hours"
    await expect(page.locator('text=/\\d+\\.\\d+ hours/')).toBeVisible();
  });

  test('should display week hours summary', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Time Tracking")');
    
    // Check for week's hours display
    await expect(page.locator('text=This Week')).toBeVisible();
    
    // Should show hours in format like "40.0 hours" or "0.0 hours"
    await expect(page.locator('text=/\\d+\\.\\d+ hours/')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Start in dashboard (default)
    await expect(page.locator('button:has-text("Dashboard")')).toHaveClass(/border-accent-500/);
    
    // Switch to Time Entries
    await page.click('button:has-text("Time Entries")');
    await expect(page.locator('button:has-text("Time Entries")')).toHaveClass(/border-accent-500/);
    
    // Switch to Reports
    await page.click('button:has-text("Reports")');
    await expect(page.locator('button:has-text("Reports")')).toHaveClass(/border-accent-500/);
    
    // Switch back to Dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button:has-text("Dashboard")')).toHaveClass(/border-accent-500/);
  });

  test('should generate time report', async ({ page }) => {
    // Navigate to Reports tab
    await page.click('button:has-text("Reports")');
    
    // Wait for tab to load
    await expect(page.locator('button:has-text("Reports")')).toHaveClass(/border-accent-500/);
    
    // Select report type
    await page.selectOption('select[name="report_type"]', 'employee');
    
    // Set date range
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    await page.fill('input[name="start_date"]', lastWeek.toISOString().slice(0, 10));
    await page.fill('input[name="end_date"]', today.toISOString().slice(0, 10));
    
    // Generate report
    await page.click('button:has-text("Generate Report")');
    
    // Verify report displays
    await expect(page.locator('text=Total Hours')).toBeVisible({ timeout: 5000 });
  });

  test('should export time report to CSV', async ({ page }) => {
    // Navigate to Reports tab
    await page.click('button:has-text("Reports")');
    
    // Wait for tab to load
    await expect(page.locator('button:has-text("Reports")')).toHaveClass(/border-accent-500/);
    
    // Generate report first
    await page.selectOption('select[name="report_type"]', 'employee');
    await page.click('button:has-text("Generate Report")');
    
    // Wait for report to load
    await page.waitForTimeout(1000);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle module flag - redirect when disabled', async ({ page }) => {
    // Mock the config to disable time tracking module
    await page.route('**/api/config', async route => {
      const response = await route.fetch();
      const json = await response.json();
      json.modules.timeTracking = { enabled: false };
      await route.fulfill({ json });
    });
    
    // Try to navigate to time tracking
    await page.goto('/time-tracking');
    
    // Should redirect to dashboard
    await page.waitForURL('/');
  });

  test('should validate manual entry required fields', async ({ page }) => {
    // Navigate to Time Entries tab
    await page.click('button:has-text("Time Entries")');
    
    // Click "Add Manual Entry" button
    await page.click('button:has-text("Add Manual Entry")');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Save")');
    
    // Verify error messages appear
    await expect(page.locator('text=Date is required')).toBeVisible();
    await expect(page.locator('text=Start time is required')).toBeVisible();
    await expect(page.locator('text=End time is required')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/time-entries*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });
    
    // Navigate to Time Entries tab
    await page.click('button:has-text("Time Entries")');
    
    // Verify loading indicator appears
    await expect(page.locator('text=Loading time entries...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading time entries...')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display error state', async ({ page }) => {
    // Intercept API call to return error
    await page.route('**/api/time-entries*', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Navigate to Time Entries tab
    await page.click('button:has-text("Time Entries")');
    
    // Verify error message appears
    await expect(page.locator('text=Failed to load time entries')).toBeVisible();
  });

  test('should track breaks when enabled', async ({ page }) => {
    // Clock in first
    await page.waitForSelector('h1:has-text("Time Tracking")');
    const clockInButton = page.locator('button:has-text("Clock In")');
    
    if (await clockInButton.isVisible()) {
      await clockInButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for break button
    const startBreakButton = page.locator('button:has-text("Start Break")');
    
    if (await startBreakButton.isVisible()) {
      // Start break
      await startBreakButton.click();
      
      // Verify on break status
      await expect(page.locator('text=On Break')).toBeVisible();
      
      // End break
      await page.click('button:has-text("End Break")');
      
      // Verify back to clocked in status
      await expect(page.locator('text=Clocked In')).toBeVisible();
    }
  });

  test('should display recent time entries', async ({ page }) => {
    // Navigate to Time Entries tab
    await page.click('button:has-text("Time Entries")');
    
    // Wait for tab to load
    await expect(page.locator('button:has-text("Time Entries")')).toHaveClass(/border-accent-500/);
    
    // Check for time entries list or empty state
    const hasEntries = await page.locator('table').isVisible();
    const hasEmptyState = await page.locator('text=No time entries found').isVisible();
    
    expect(hasEntries || hasEmptyState).toBeTruthy();
  });

  test('should use semantic tokens for styling', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Time Tracking")');
    
    // Check that no hardcoded Tailwind base colors are used
    // This is a smoke test - the actual color linting is done in CI
    const html = await page.content();
    
    // Should not contain hardcoded color classes like text-blue-600, bg-gray-100, etc.
    expect(html).not.toContain('text-blue-');
    expect(html).not.toContain('text-gray-');
    expect(html).not.toContain('bg-gray-');
    expect(html).not.toContain('border-gray-');
  });
});

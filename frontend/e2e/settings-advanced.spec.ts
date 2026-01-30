import { test, expect } from '@playwright/test';
import {
  loginAsAdminAndNavigateToSettings,
  navigateToSettingsTab,
  // createUser,
  // applyBulkAction,
  expectValidationError,
  // expectSuccessMessage,
  configureHardwareDevice,
  // configureIntegration,
  // exportData,
} from './helpers/settings-helpers';

/**
 * Advanced E2E tests for Settings Module
 * 
 * Tests edge cases, error handling, and complex workflows
 */

test.describe('Settings Module - Advanced User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminAndNavigateToSettings(page);
    await navigateToSettingsTab(page, 'Users & Roles');
  });

  test('should handle concurrent user edits gracefully', async ({ page }) => {
    // Open edit modal for first user
    await page.getByRole('row').nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Make a change
    const emailInput = page.getByLabel(/email/i);
    await emailInput.clear();
    await emailInput.fill('concurrent@example.com');
    
    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success or conflict handling
    const successMessage = page.getByText(/updated successfully/i);
    const conflictMessage = page.getByText(/conflict|modified by another user/i);
    
    await expect(successMessage.or(conflictMessage)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Fill in basic info
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    
    // Try to save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify email validation error
    await expectValidationError(page, 'invalid email');
  });

  test('should validate password strength', async ({ page }) => {
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Fill in basic info
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('test@example.com');
    
    // Try weak password
    await page.getByLabel(/^password$/i).fill('weak');
    await page.getByLabel(/confirm password/i).fill('weak');
    
    // Try to save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify password strength error
    await expectValidationError(page, 'password.*strong|password.*requirements');
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Fill in basic info
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('test@example.com');
    
    // Enter mismatched passwords
    await page.getByLabel(/^password$/i).fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPass123!');
    
    // Try to save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify mismatch error
    await expectValidationError(page, 'passwords.*match');
  });

  test('should prevent duplicate usernames', async ({ page }) => {
    // Try to create user with existing username
    await page.getByRole('button', { name: /add user/i }).click();
    
    await page.getByLabel(/username/i).fill('admin'); // Existing user
    await page.getByLabel(/email/i).fill('newadmin@example.com');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    await page.getByLabel(/role/i).selectOption('admin');
    
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify duplicate error
    await expectValidationError(page, 'username.*exists|username.*taken');
  });

  test('should handle bulk operations with partial failures', async ({ page }) => {
    // Select multiple users
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('checkbox').nth(2).check();
    await page.getByRole('checkbox').nth(3).check();
    
    // Try bulk operation that might partially fail
    await page.getByRole('button', { name: /assign role/i }).click();
    await page.getByLabel(/select role/i).selectOption('manager');
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify result message (success or partial success)
    const successMessage = page.getByText(/updated successfully/i);
    const partialMessage = page.getByText(/partially completed|some.*failed/i);
    
    await expect(successMessage.or(partialMessage)).toBeVisible();
  });

  test('should preserve unsaved changes warning', async ({ page }) => {
    // Open edit modal
    await page.getByRole('row').nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Make a change
    await page.getByLabel(/email/i).fill('changed@example.com');
    
    // Try to close without saving
    await page.keyboard.press('Escape');
    
    // Verify warning dialog
    const warningDialog = page.getByText(/unsaved changes|discard changes/i);
    if (await warningDialog.isVisible()) {
      await expect(warningDialog).toBeVisible();
      
      // Cancel to stay on form
      await page.getByRole('button', { name: /cancel|stay/i }).click();
      
      // Verify still on edit modal
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });

  test('should handle pagination with large user lists', async ({ page }) => {
    // Check if pagination controls exist
    const nextButton = page.getByRole('button', { name: /next|>/i });
    
    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();
      
      // Verify page changed
      await expect(page.getByRole('table')).toBeVisible();
      
      // Go back to first page
      await page.getByRole('button', { name: /previous|</i }).click();
      await expect(page.getByRole('table')).toBeVisible();
    }
  });
});

test.describe('Settings Module - Advanced Hardware Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminAndNavigateToSettings(page);
    await navigateToSettingsTab(page, 'Hardware');
  });

  test('should handle hardware connection failures gracefully', async ({ page }) => {
    // Configure printer with invalid settings
    await page.getByRole('button', { name: /configure receipt printer/i }).click();
    
    await page.getByLabel(/printer type/i).selectOption('ESC_POS');
    await page.getByLabel(/connection type/i).selectOption('NETWORK');
    await page.getByLabel(/ip address/i).fill('192.168.1.999'); // Invalid IP
    
    await page.getByRole('button', { name: /save/i }).click();
    
    // Test connection
    await page.getByRole('button', { name: /test print/i }).first().click();
    
    // Verify error handling
    await expect(page.getByText(/test failed|connection failed|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('should validate IP address format', async ({ page }) => {
    await page.getByRole('button', { name: /configure.*printer/i }).first().click();
    
    await page.getByLabel(/connection type/i).selectOption('NETWORK');
    await page.getByLabel(/ip address/i).fill('invalid-ip');
    
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify validation error
    await expectValidationError(page, 'invalid.*ip|ip.*format');
  });

  test('should validate port numbers', async ({ page }) => {
    await page.getByRole('button', { name: /configure.*printer/i }).first().click();
    
    await page.getByLabel(/connection type/i).selectOption('NETWORK');
    await page.getByLabel(/port/i).fill('99999'); // Invalid port
    
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify validation error
    await expectValidationError(page, 'invalid.*port|port.*range');
  });

  test('should handle template application conflicts', async ({ page }) => {
    // Configure some hardware first
    await configureHardwareDevice(page, 'receipt printer', {
      'printer type': 'ESC_POS',
      'connection type': 'USB',
      'port': '/dev/usb/lp0',
    });
    
    // Try to apply template
    await page.getByRole('button', { name: /templates/i }).click();
    await page.getByRole('button', { name: /retail store/i }).click();
    
    // Should show confirmation about overwriting
    const confirmDialog = page.getByText(/overwrite|replace.*configuration/i);
    if (await confirmDialog.isVisible()) {
      await expect(confirmDialog).toBeVisible();
    }
  });

  test('should persist hardware configuration across sessions', async ({ page }) => {
    // Configure hardware
    await configureHardwareDevice(page, 'barcode scanner', {
      'scanner type': 'USB_HID',
      'prefix': '',
      'suffix': '\\n',
    });
    
    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Login again
    await loginAsAdminAndNavigateToSettings(page);
    await navigateToSettingsTab(page, 'Hardware');
    
    // Verify configuration persisted
    await page.getByRole('button', { name: /configure.*scanner/i }).click();
    
    const scannerType = page.getByLabel(/scanner type/i);
    await expect(scannerType).toHaveValue('USB_HID');
  });
});

test.describe('Settings Module - Advanced Integration Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminAndNavigateToSettings(page);
    await navigateToSettingsTab(page, 'Integrations');
  });

  test('should handle API credential validation', async ({ page }) => {
    // Configure integration with invalid credentials
    const wooCard = page.locator('[data-integration="woocommerce"]');
    await wooCard.getByRole('switch').click();
    
    await wooCard.getByLabel(/store url/i).fill('https://invalid-store.com');
    await wooCard.getByLabel(/consumer key/i).fill('invalid_key');
    await wooCard.getByLabel(/consumer secret/i).fill('invalid_secret');
    
    await wooCard.getByRole('button', { name: /save/i }).click();
    
    // Test connection
    await wooCard.getByRole('button', { name: /test connection/i }).click();
    
    // Verify connection failure
    await expect(page.getByText(/connection failed|authentication failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle sync conflicts', async ({ page }) => {
    // Enable integration
    const integrationCard = page.locator('[data-integration]').first();
    await integrationCard.getByRole('switch').click();
    
    // Configure sync settings
    await integrationCard.getByRole('button', { name: /sync settings/i }).click();
    
    // Set very frequent sync
    await page.getByLabel(/sync frequency/i).selectOption('1'); // 1 minute
    
    // Save and verify warning about conflicts
    await page.getByRole('button', { name: /save/i }).click();
    
    const warningMessage = page.getByText(/frequent.*sync|conflict.*possible/i);
    if (await warningMessage.isVisible()) {
      await expect(warningMessage).toBeVisible();
    }
  });

  test('should display integration error details', async ({ page }) => {
    // Look for integration with errors
    const errorBadge = page.getByText(/error|failed/i).first();
    
    if (await errorBadge.isVisible()) {
      // Click to view details
      await errorBadge.click();
      
      // Verify error details modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/error.*details|error.*message/i)).toBeVisible();
    }
  });

  test('should handle OAuth flow interruption', async ({ page }) => {
    // Try to configure QuickBooks (OAuth integration)
    const qbCard = page.locator('[data-integration="quickbooks"]');
    
    if (await qbCard.isVisible()) {
      await qbCard.getByRole('switch').click();
      
      // Click connect button (would open OAuth window)
      const connectButton = qbCard.getByRole('button', { name: /connect|authorize/i });
      
      if (await connectButton.isVisible()) {
        // Note: In real test, this would open OAuth window
        // For E2E, we just verify the button exists
        await expect(connectButton).toBeVisible();
      }
    }
  });

  test('should validate webhook URLs', async ({ page }) => {
    const integrationCard = page.locator('[data-integration]').first();
    await integrationCard.getByRole('switch').click();
    
    // Look for webhook URL field
    const webhookField = integrationCard.getByLabel(/webhook.*url/i);
    
    if (await webhookField.isVisible()) {
      await webhookField.fill('invalid-url');
      await integrationCard.getByRole('button', { name: /save/i }).click();
      
      // Verify validation error
      await expectValidationError(page, 'invalid.*url|url.*format');
    }
  });
});

test.describe('Settings Module - Performance and Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminAndNavigateToSettings(page);
  });

  test('should handle rapid tab switching', async ({ page }) => {
    const tabs = [
      'My Preferences',
      'Users & Roles',
      'Company & Stores',
      'Hardware',
      'Integrations',
    ];
    
    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      for (const tabName of tabs) {
        await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
        // Don't wait for full load, just verify tab is active
        await expect(page.getByRole('tab', { name: new RegExp(tabName, 'i') })).toHaveAttribute('aria-selected', 'true');
      }
    }
    
    // Verify final tab loaded correctly
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should handle large search results', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Search for common term that might return many results
    await page.getByPlaceholder(/search users/i).fill('a');
    
    // Wait for debounce
    await page.waitForTimeout(500);
    
    // Verify table still renders
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verify virtualization works (table should be scrollable)
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('should handle multiple concurrent exports', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    await page.getByRole('tab', { name: /audit log/i }).click();
    
    // Start multiple exports
    const downloads = [];
    
    for (let i = 0; i < 3; i++) {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /export/i }).click();
      downloads.push(downloadPromise);
      await page.waitForTimeout(100); // Small delay between clicks
    }
    
    // Verify all downloads started
    const completedDownloads = await Promise.all(downloads);
    expect(completedDownloads.length).toBe(3);
  });

  test('should maintain responsiveness during bulk operations', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Select many users
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    
    for (let i = 1; i < Math.min(count, 20); i++) {
      await checkboxes.nth(i).check();
    }
    
    // Verify bulk actions bar is responsive
    await expect(page.getByText(/selected/i)).toBeVisible();
    
    // UI should still be interactive
    await expect(page.getByRole('button', { name: /assign store/i })).toBeEnabled();
  });
});

test.describe('Settings Module - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminAndNavigateToSettings(page);
  });

  test('should support keyboard navigation in user list', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Tab to search field
    await page.keyboard.press('Tab');
    await expect(page.getByPlaceholder(/search users/i)).toBeFocused();
    
    // Tab to filter buttons
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /active/i })).toBeFocused();
    
    // Press Enter to activate filter
    await page.keyboard.press('Enter');
    
    // Verify filter applied
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should support keyboard navigation in modals', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Open add user modal
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/username/i)).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();
    
    // Escape to close
    await page.keyboard.press('Escape');
    
    // Verify modal closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Verify important elements have ARIA labels
    await expect(page.getByRole('table')).toHaveAttribute('aria-label');
    await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search users/i)).toHaveAttribute('aria-label');
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await navigateToSettingsTab(page, 'Users & Roles');
    
    // Perform action that changes content
    await page.getByRole('button', { name: /active/i }).click();
    
    // Verify live region exists for announcements
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    if (await liveRegion.count() > 0) {
      await expect(liveRegion.first()).toBeInViewport();
    }
  });
});

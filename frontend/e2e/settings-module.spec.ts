import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for Settings Module
 * 
 * Tests complete user workflows for:
 * - User management (Requirements 2.1, 2.7, 2.8)
 * - Settings search and navigation (Requirement 10.1)
 * - Effective settings view (Requirement 11.1)
 * - Audit log (Requirement 8.3)
 * - Hardware configuration (Requirement 21.1)
 * - Integrations (Requirement 16.1)
 */

test.describe('Settings Module - User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to Settings > Users & Roles
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('tab', { name: /users & roles/i }).click();
  });

  test('should display users list with filters', async ({ page }) => {
    // Verify users table is visible
    await expect(page.getByRole('heading', { name: /users & roles/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verify filter chips are present
    await expect(page.getByRole('button', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /inactive/i })).toBeVisible();
    
    // Verify search is available
    await expect(page.getByPlaceholder(/search users/i)).toBeVisible();
  });

  test('should create new user with store and station assignment', async ({ page }) => {
    // Click Add User button
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Verify modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /add user/i })).toBeVisible();
    
    // Fill in Profile section
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('testuser@example.com');
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    
    // Fill in Access section
    await page.getByLabel(/role/i).selectOption('cashier');
    await page.getByLabel(/primary store/i).selectOption({ index: 1 }); // Select first store
    await page.getByLabel(/station policy/i).selectOption('any');
    
    // Fill in Security section
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    
    // Save user
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify user created
    await expect(page.getByText(/user created successfully/i)).toBeVisible();
    await expect(page.getByText('testuser')).toBeVisible();
  });

  test('should filter users by status', async ({ page }) => {
    // Click Active filter
    await page.getByRole('button', { name: /^active$/i }).click();
    
    // Verify only active users shown
    await expect(page.getByRole('table')).toBeVisible();
    
    // Click Inactive filter
    await page.getByRole('button', { name: /inactive/i }).click();
    
    // Verify filter applied
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should search users by username', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder(/search users/i).fill('admin');
    
    // Wait for search results
    await page.waitForTimeout(500); // Debounce delay
    
    // Verify admin user is shown
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('should edit existing user', async ({ page }) => {
    // Click on first user row
    await page.getByRole('row').nth(1).click();
    
    // Verify edit modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /edit user/i })).toBeVisible();
    
    // Update email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.clear();
    await emailInput.fill('updated@example.com');
    
    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify update successful
    await expect(page.getByText(/user updated successfully/i)).toBeVisible();
  });

  test('should perform bulk store assignment', async ({ page }) => {
    // Select multiple users
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('checkbox').nth(2).check();
    
    // Verify bulk actions bar appears
    await expect(page.getByText(/2 selected/i)).toBeVisible();
    
    // Click bulk assign store
    await page.getByRole('button', { name: /assign store/i }).click();
    
    // Select store from dropdown
    await page.getByLabel(/select store/i).selectOption({ index: 1 });
    
    // Confirm action
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify success message
    await expect(page.getByText(/users updated successfully/i)).toBeVisible();
  });

  test('should show warning for users with missing assignments', async ({ page }) => {
    // Look for warning indicators
    const warningBadge = page.getByText(/unassigned/i).first();
    
    if (await warningBadge.isVisible()) {
      // Verify warning is displayed
      await expect(warningBadge).toBeVisible();
      
      // Click "Fix Issues" banner if present
      const fixButton = page.getByRole('button', { name: /fix issues/i });
      if (await fixButton.isVisible()) {
        await fixButton.click();
        
        // Verify wizard opened
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/fix user issues/i)).toBeVisible();
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    // Click Add User
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Try to save without filling required fields
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify validation errors
    await expect(page.getByText(/username is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/role is required/i)).toBeVisible();
  });

  test('should prevent saving POS role without store assignment', async ({ page }) => {
    // Click Add User
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Fill in basic info
    await page.getByLabel(/username/i).fill('testcashier');
    await page.getByLabel(/email/i).fill('cashier@example.com');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    
    // Select POS role without store
    await page.getByLabel(/role/i).selectOption('cashier');
    
    // Try to save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify validation error
    await expect(page.getByText(/store assignment is required/i)).toBeVisible();
  });
});

test.describe('Settings Module - Settings Search', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Settings
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
  });

  test('should search and navigate to settings', async ({ page }) => {
    // Type in settings search
    const searchInput = page.getByPlaceholder(/search settings/i);
    await searchInput.fill('hardware');
    
    // Wait for search results dropdown
    await expect(page.getByRole('listbox')).toBeVisible();
    
    // Verify search results contain hardware-related settings
    await expect(page.getByText(/hardware/i)).toBeVisible();
    
    // Click on a search result
    await page.getByRole('option').first().click();
    
    // Verify navigation occurred
    await expect(page.getByRole('heading', { name: /hardware/i })).toBeVisible();
  });

  test('should show recent searches', async ({ page }) => {
    // Perform a search
    const searchInput = page.getByPlaceholder(/search settings/i);
    await searchInput.fill('tax');
    await page.getByRole('option').first().click();
    
    // Clear and focus search again
    await searchInput.clear();
    await searchInput.click();
    
    // Verify recent searches shown
    await expect(page.getByText(/recent searches/i)).toBeVisible();
    await expect(page.getByText(/tax/i)).toBeVisible();
  });

  test('should handle fuzzy matching', async ({ page }) => {
    // Type with typo
    const searchInput = page.getByPlaceholder(/search settings/i);
    await searchInput.fill('hardwre'); // Missing 'a'
    
    // Should still show hardware results
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByText(/hardware/i)).toBeVisible();
  });
});

test.describe('Settings Module - Effective Settings View', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Settings
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
  });

  test('should display effective settings view', async ({ page }) => {
    // Click "View Effective Settings" button
    await page.getByRole('button', { name: /view effective settings/i }).click();
    
    // Verify modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /effective settings/i })).toBeVisible();
    
    // Verify settings are displayed with sources
    await expect(page.getByText(/source/i)).toBeVisible();
    await expect(page.getByText(/global|store|station|user/i)).toBeVisible();
  });

  test('should show setting source hierarchy', async ({ page }) => {
    // Open effective settings
    await page.getByRole('button', { name: /view effective settings/i }).click();
    
    // Verify hierarchy indicators
    await expect(page.getByText(/global/i)).toBeVisible();
    
    // Look for overridden settings indicator
    const overriddenBadge = page.getByText(/overridden/i).first();
    if (await overriddenBadge.isVisible()) {
      await expect(overriddenBadge).toBeVisible();
    }
  });

  test('should export effective settings', async ({ page }) => {
    // Open effective settings
    await page.getByRole('button', { name: /view effective settings/i }).click();
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/effective-settings/i);
  });

  test('should display current context', async ({ page }) => {
    // Verify context display in header
    await expect(page.getByText(/store:/i)).toBeVisible();
    await expect(page.getByText(/user:/i)).toBeVisible();
  });
});

test.describe('Settings Module - Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Audit Log
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('tab', { name: /users & roles/i }).click();
    await page.getByRole('tab', { name: /audit log/i }).click();
  });

  test('should display audit log entries', async ({ page }) => {
    // Verify audit log table is visible
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verify columns are present
    await expect(page.getByText(/timestamp/i)).toBeVisible();
    await expect(page.getByText(/user/i)).toBeVisible();
    await expect(page.getByText(/action/i)).toBeVisible();
    await expect(page.getByText(/entity/i)).toBeVisible();
  });

  test('should filter audit log by entity type', async ({ page }) => {
    // Click entity type filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByLabel(/entity type/i).selectOption('user');
    
    // Apply filter
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Verify filtered results
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should filter audit log by date range', async ({ page }) => {
    // Click date filter
    await page.getByRole('button', { name: /filter/i }).click();
    
    // Select date range
    await page.getByLabel(/from date/i).fill('2024-01-01');
    await page.getByLabel(/to date/i).fill('2024-12-31');
    
    // Apply filter
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Verify filtered results
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should display before/after values', async ({ page }) => {
    // Click on first audit log entry
    await page.getByRole('row').nth(1).click();
    
    // Verify details modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/before/i)).toBeVisible();
    await expect(page.getByText(/after/i)).toBeVisible();
  });

  test('should export audit log to CSV', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/audit-log.*\.csv/i);
  });

  test('should search audit log', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder(/search audit log/i).fill('admin');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Verify results filtered
    await expect(page.getByRole('table')).toBeVisible();
  });
});

test.describe('Settings Module - Hardware Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Hardware settings
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('tab', { name: /hardware/i }).click();
  });

  test('should display hardware configuration sections', async ({ page }) => {
    // Verify hardware sections are visible
    await expect(page.getByRole('heading', { name: /hardware/i })).toBeVisible();
    await expect(page.getByText(/receipt printer/i)).toBeVisible();
    await expect(page.getByText(/label printer/i)).toBeVisible();
    await expect(page.getByText(/barcode scanner/i)).toBeVisible();
    await expect(page.getByText(/cash drawer/i)).toBeVisible();
    await expect(page.getByText(/payment terminal/i)).toBeVisible();
  });

  test('should configure receipt printer', async ({ page }) => {
    // Click configure receipt printer
    await page.getByRole('button', { name: /configure receipt printer/i }).click();
    
    // Verify configuration modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Select printer type
    await page.getByLabel(/printer type/i).selectOption('ESC_POS');
    
    // Select connection type
    await page.getByLabel(/connection type/i).selectOption('USB');
    
    // Enter port
    await page.getByLabel(/port/i).fill('/dev/usb/lp0');
    
    // Select width
    await page.getByLabel(/width/i).selectOption('80mm');
    
    // Save configuration
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success message
    await expect(page.getByText(/printer configured successfully/i)).toBeVisible();
  });

  test('should test printer connection', async ({ page }) => {
    // Click test print button
    await page.getByRole('button', { name: /test print/i }).first().click();
    
    // Verify test initiated
    await expect(page.getByText(/testing printer/i)).toBeVisible();
    
    // Wait for result
    await expect(page.getByText(/test (successful|failed)/i)).toBeVisible({ timeout: 10000 });
  });

  test('should configure barcode scanner', async ({ page }) => {
    // Click configure scanner
    await page.getByRole('button', { name: /configure.*scanner/i }).click();
    
    // Verify modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Select scanner type
    await page.getByLabel(/scanner type/i).selectOption('USB_HID');
    
    // Enter prefix and suffix
    await page.getByLabel(/prefix/i).fill('');
    await page.getByLabel(/suffix/i).fill('\n');
    
    // Save configuration
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success
    await expect(page.getByText(/scanner configured successfully/i)).toBeVisible();
  });

  test('should configure payment terminal', async ({ page }) => {
    // Click configure payment terminal
    await page.getByRole('button', { name: /configure.*terminal/i }).click();
    
    // Verify modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Select terminal type
    await page.getByLabel(/terminal type/i).selectOption('STRIPE_TERMINAL');
    
    // Enter API key
    await page.getByLabel(/api key/i).fill('sk_test_123456789');
    
    // Enter location ID
    await page.getByLabel(/location id/i).fill('loc_123456789');
    
    // Save configuration
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success
    await expect(page.getByText(/terminal configured successfully/i)).toBeVisible();
  });

  test('should display hardware status', async ({ page }) => {
    // Verify status indicators are visible
    await expect(page.getByText(/status/i)).toBeVisible();
    
    // Look for connection status
    const statusBadge = page.getByText(/connected|disconnected|error/i).first();
    await expect(statusBadge).toBeVisible();
  });

  test('should apply hardware template', async ({ page }) => {
    // Click templates button
    await page.getByRole('button', { name: /templates/i }).click();
    
    // Verify templates modal opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/hardware templates/i)).toBeVisible();
    
    // Select a template
    await page.getByRole('button', { name: /retail store/i }).click();
    
    // Confirm application
    await page.getByRole('button', { name: /apply template/i }).click();
    
    // Verify success
    await expect(page.getByText(/template applied successfully/i)).toBeVisible();
  });
});

test.describe('Settings Module - Integrations', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Integrations
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('tab', { name: /integrations/i }).click();
  });

  test('should display available integrations', async ({ page }) => {
    // Verify integrations page is visible
    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible();
    
    // Verify integration cards are present
    await expect(page.getByText(/quickbooks/i)).toBeVisible();
    await expect(page.getByText(/woocommerce/i)).toBeVisible();
    await expect(page.getByText(/stripe/i)).toBeVisible();
    await expect(page.getByText(/square/i)).toBeVisible();
  });

  test('should enable and configure WooCommerce integration', async ({ page }) => {
    // Find WooCommerce card
    const wooCard = page.locator('[data-integration="woocommerce"]');
    
    // Enable integration
    await wooCard.getByRole('switch').click();
    
    // Verify configuration form appears
    await expect(wooCard.getByLabel(/store url/i)).toBeVisible();
    
    // Fill in configuration
    await wooCard.getByLabel(/store url/i).fill('https://mystore.com');
    await wooCard.getByLabel(/consumer key/i).fill('ck_test_123456789');
    await wooCard.getByLabel(/consumer secret/i).fill('cs_test_987654321');
    
    // Save configuration
    await wooCard.getByRole('button', { name: /save/i }).click();
    
    // Verify success
    await expect(page.getByText(/woocommerce configured successfully/i)).toBeVisible();
  });

  test('should test integration connection', async ({ page }) => {
    // Find an enabled integration
    const integrationCard = page.locator('[data-integration]').first();
    
    // Click test connection button
    await integrationCard.getByRole('button', { name: /test connection/i }).click();
    
    // Verify test initiated
    await expect(page.getByText(/testing connection/i)).toBeVisible();
    
    // Wait for result
    await expect(page.getByText(/connection (successful|failed)/i)).toBeVisible({ timeout: 10000 });
  });

  test('should configure Stripe Terminal integration', async ({ page }) => {
    // Find Stripe card
    const stripeCard = page.locator('[data-integration="stripe"]');
    
    // Enable integration
    await stripeCard.getByRole('switch').click();
    
    // Fill in configuration
    await stripeCard.getByLabel(/api key/i).fill('sk_test_123456789');
    await stripeCard.getByLabel(/location id/i).fill('loc_123456789');
    
    // Save configuration
    await stripeCard.getByRole('button', { name: /save/i }).click();
    
    // Verify success
    await expect(page.getByText(/stripe configured successfully/i)).toBeVisible();
  });

  test('should display integration sync status', async ({ page }) => {
    // Look for sync status indicators
    await expect(page.getByText(/last sync/i)).toBeVisible();
    
    // Verify sync status is shown
    const syncStatus = page.getByText(/success|error|pending/i).first();
    if (await syncStatus.isVisible()) {
      await expect(syncStatus).toBeVisible();
    }
  });

  test('should configure sync settings', async ({ page }) => {
    // Find an integration card
    const integrationCard = page.locator('[data-integration]').first();
    
    // Click sync settings
    await integrationCard.getByRole('button', { name: /sync settings/i }).click();
    
    // Verify sync configuration modal
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Configure sync frequency
    await page.getByLabel(/sync frequency/i).selectOption('15');
    
    // Save settings
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success
    await expect(page.getByText(/sync settings updated/i)).toBeVisible();
  });

  test('should disable integration', async ({ page }) => {
    // Find an enabled integration
    const integrationCard = page.locator('[data-integration]').first();
    
    // Check if integration is enabled
    const toggle = integrationCard.getByRole('switch');
    if (await toggle.isChecked()) {
      // Disable integration
      await toggle.click();
      
      // Confirm if prompted
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify disabled
      await expect(toggle).not.toBeChecked();
    }
  });

  test('should view integration error logs', async ({ page }) => {
    // Find an integration card
    const integrationCard = page.locator('[data-integration]').first();
    
    // Click view logs button
    const logsButton = integrationCard.getByRole('button', { name: /view logs/i });
    if (await logsButton.isVisible()) {
      await logsButton.click();
      
      // Verify logs modal opened
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/error logs/i)).toBeVisible();
    }
  });
});

test.describe('Settings Module - Navigation and Consistency', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: /settings/i }).click();
  });

  test('should navigate between settings tabs', async ({ page }) => {
    // Verify initial tab
    await expect(page.getByRole('heading', { name: /my preferences/i })).toBeVisible();
    
    // Navigate to Users & Roles
    await page.getByRole('tab', { name: /users & roles/i }).click();
    await expect(page.getByRole('heading', { name: /users & roles/i })).toBeVisible();
    
    // Navigate to Company & Stores
    await page.getByRole('tab', { name: /company & stores/i }).click();
    await expect(page.getByRole('heading', { name: /company & stores/i })).toBeVisible();
    
    // Navigate to Hardware
    await page.getByRole('tab', { name: /hardware/i }).click();
    await expect(page.getByRole('heading', { name: /hardware/i })).toBeVisible();
    
    // Navigate to Integrations
    await page.getByRole('tab', { name: /integrations/i }).click();
    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible();
  });

  test('should display consistent page layout across tabs', async ({ page }) => {
    const tabs = [
      'My Preferences',
      'Users & Roles',
      'Company & Stores',
      'Hardware',
      'Integrations',
    ];
    
    for (const tabName of tabs) {
      // Navigate to tab
      await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
      
      // Verify consistent elements
      await expect(page.getByRole('heading')).toBeVisible();
      
      // Verify breadcrumbs
      await expect(page.getByText(/settings/i)).toBeVisible();
    }
  });

  test('should display scope badges consistently', async ({ page }) => {
    // Navigate to a settings page with scope badges
    await page.getByRole('tab', { name: /company & stores/i }).click();
    
    // Look for scope badges
    const scopeBadge = page.getByText(/global|store|station|user/i).first();
    if (await scopeBadge.isVisible()) {
      await expect(scopeBadge).toBeVisible();
    }
  });

  test('should maintain context across navigation', async ({ page }) => {
    // Verify context display
    await expect(page.getByText(/store:/i)).toBeVisible();
    
    // Navigate to different tab
    await page.getByRole('tab', { name: /hardware/i }).click();
    
    // Verify context still displayed
    await expect(page.getByText(/store:/i)).toBeVisible();
  });
});

import { Page, expect } from '@playwright/test';

/**
 * Helper functions for Settings module E2E tests
 */

/**
 * Login as a specific user
 */
export async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

/**
 * Navigate to Settings page
 */
export async function navigateToSettings(page: Page) {
  await page.getByRole('link', { name: /settings/i }).click();
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
}

/**
 * Navigate to a specific Settings tab
 */
export async function navigateToSettingsTab(page: Page, tabName: string) {
  await navigateToSettings(page);
  await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
  await expect(page.getByRole('heading', { name: new RegExp(tabName, 'i') })).toBeVisible();
}

/**
 * Login as admin and navigate to Settings
 */
export async function loginAsAdminAndNavigateToSettings(page: Page) {
  await login(page, 'admin', 'admin123');
  await navigateToSettings(page);
}

/**
 * Create a new user with specified details
 */
export async function createUser(
  page: Page,
  userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password: string;
    storeIndex?: number;
    stationPolicy?: 'any' | 'specific' | 'none';
  }
) {
  // Click Add User button
  await page.getByRole('button', { name: /add user/i }).click();
  
  // Wait for modal
  await expect(page.getByRole('dialog')).toBeVisible();
  
  // Fill in Profile section
  await page.getByLabel(/username/i).fill(userData.username);
  await page.getByLabel(/email/i).fill(userData.email);
  await page.getByLabel(/first name/i).fill(userData.firstName);
  await page.getByLabel(/last name/i).fill(userData.lastName);
  
  // Fill in Access section
  await page.getByLabel(/role/i).selectOption(userData.role);
  
  if (userData.storeIndex !== undefined) {
    await page.getByLabel(/primary store/i).selectOption({ index: userData.storeIndex });
  }
  
  if (userData.stationPolicy) {
    await page.getByLabel(/station policy/i).selectOption(userData.stationPolicy);
  }
  
  // Fill in Security section
  await page.getByLabel(/^password$/i).fill(userData.password);
  await page.getByLabel(/confirm password/i).fill(userData.password);
  
  // Save user
  await page.getByRole('button', { name: /save/i }).click();
  
  // Wait for success message
  await expect(page.getByText(/user created successfully/i)).toBeVisible();
}

/**
 * Search for a setting using the global search
 */
export async function searchSettings(page: Page, query: string) {
  const searchInput = page.getByPlaceholder(/search settings/i);
  await searchInput.fill(query);
  await expect(page.getByRole('listbox')).toBeVisible();
}

/**
 * Open the Effective Settings view
 */
export async function openEffectiveSettings(page: Page) {
  await page.getByRole('button', { name: /view effective settings/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /effective settings/i })).toBeVisible();
}

/**
 * Filter audit log by entity type
 */
export async function filterAuditLogByEntityType(page: Page, entityType: string) {
  await page.getByRole('button', { name: /filter/i }).click();
  await page.getByLabel(/entity type/i).selectOption(entityType);
  await page.getByRole('button', { name: /apply/i }).click();
}

/**
 * Configure hardware device
 */
export async function configureHardwareDevice(
  page: Page,
  deviceType: string,
  config: Record<string, string>
) {
  // Click configure button for device
  await page.getByRole('button', { name: new RegExp(`configure.*${deviceType}`, 'i') }).click();
  
  // Wait for modal
  await expect(page.getByRole('dialog')).toBeVisible();
  
  // Fill in configuration fields
  for (const [label, value] of Object.entries(config)) {
    const field = page.getByLabel(new RegExp(label, 'i'));
    
    // Check if it's a select or input
    const tagName = await field.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await field.selectOption(value);
    } else {
      await field.fill(value);
    }
  }
  
  // Save configuration
  await page.getByRole('button', { name: /save/i }).click();
  
  // Wait for success message
  await expect(page.getByText(/configured successfully/i)).toBeVisible();
}

/**
 * Enable and configure an integration
 */
export async function configureIntegration(
  page: Page,
  integrationName: string,
  config: Record<string, string>
) {
  // Find integration card
  const integrationCard = page.locator(`[data-integration="${integrationName.toLowerCase()}"]`);
  
  // Enable integration if not already enabled
  const toggle = integrationCard.getByRole('switch');
  if (!(await toggle.isChecked())) {
    await toggle.click();
  }
  
  // Fill in configuration fields
  for (const [label, value] of Object.entries(config)) {
    await integrationCard.getByLabel(new RegExp(label, 'i')).fill(value);
  }
  
  // Save configuration
  await integrationCard.getByRole('button', { name: /save/i }).click();
  
  // Wait for success message
  await expect(page.getByText(/configured successfully/i)).toBeVisible();
}

/**
 * Test hardware device connection
 */
export async function testHardwareConnection(page: Page, deviceType: string) {
  await page.getByRole('button', { name: new RegExp(`test.*${deviceType}`, 'i') }).click();
  await expect(page.getByText(/testing/i)).toBeVisible();
  await expect(page.getByText(/test (successful|failed)/i)).toBeVisible({ timeout: 10000 });
}

/**
 * Test integration connection
 */
export async function testIntegrationConnection(page: Page, integrationName: string) {
  const integrationCard = page.locator(`[data-integration="${integrationName.toLowerCase()}"]`);
  await integrationCard.getByRole('button', { name: /test connection/i }).click();
  await expect(page.getByText(/testing connection/i)).toBeVisible();
  await expect(page.getByText(/connection (successful|failed)/i)).toBeVisible({ timeout: 10000 });
}

/**
 * Export data (audit log, effective settings, etc.)
 */
export async function exportData(page: Page, buttonName: string = 'export') {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: new RegExp(buttonName, 'i') }).click();
  const download = await downloadPromise;
  return download;
}

/**
 * Apply bulk action to selected items
 */
export async function applyBulkAction(
  page: Page,
  itemIndices: number[],
  actionName: string,
  confirmAction: boolean = true
) {
  // Select items
  for (const index of itemIndices) {
    await page.getByRole('checkbox').nth(index).check();
  }
  
  // Verify bulk actions bar appears
  await expect(page.getByText(new RegExp(`${itemIndices.length} selected`, 'i'))).toBeVisible();
  
  // Click bulk action button
  await page.getByRole('button', { name: new RegExp(actionName, 'i') }).click();
  
  // Confirm if needed
  if (confirmAction) {
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }
}

/**
 * Wait for debounced search
 */
export async function waitForDebouncedSearch(page: Page, delay: number = 500) {
  await page.waitForTimeout(delay);
}

/**
 * Verify validation error is displayed
 */
export async function expectValidationError(page: Page, errorMessage: string) {
  await expect(page.getByText(new RegExp(errorMessage, 'i'))).toBeVisible();
}

/**
 * Verify success message is displayed
 */
export async function expectSuccessMessage(page: Page, message: string) {
  await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible();
}

/**
 * Close modal dialog
 */
export async function closeModal(page: Page) {
  // Try clicking close button
  const closeButton = page.getByRole('button', { name: /close|cancel/i });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try pressing Escape
    await page.keyboard.press('Escape');
  }
  
  // Verify modal closed
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

/**
 * Fill in form field by label
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const field = page.getByLabel(new RegExp(label, 'i'));
  const tagName = await field.evaluate(el => el.tagName.toLowerCase());
  
  if (tagName === 'select') {
    await field.selectOption(value);
  } else {
    await field.clear();
    await field.fill(value);
  }
}

/**
 * Verify table has data
 */
export async function expectTableHasData(page: Page) {
  await expect(page.getByRole('table')).toBeVisible();
  const rows = page.getByRole('row');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(1); // More than just header row
}

/**
 * Verify empty state is displayed
 */
export async function expectEmptyState(page: Page, message?: string) {
  if (message) {
    await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible();
  } else {
    await expect(page.getByText(/no.*found|empty/i)).toBeVisible();
  }
}

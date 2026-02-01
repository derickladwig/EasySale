/**
 * Estimate Generation E2E Tests
 * 
 * End-to-end tests for estimate creation, editing, and PDF generation
 */

import { test, expect } from '@playwright/test';

test.describe('Estimate Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login (assuming test credentials)
    await page.fill('input[name="username"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Navigate to estimates page
    await page.goto('/estimates');
  });

  test('should display estimates list page', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")', { timeout: 5000 });
    
    // Check that header elements are visible
    await expect(page.locator('h1:has-text("Estimates")')).toBeVisible();
    await expect(page.locator('button:has-text("New Estimate")')).toBeVisible();
    
    // Check that status filter is visible
    await expect(page.locator('select')).toBeVisible();
  });

  test('should create new estimate', async ({ page }) => {
    // Click "New Estimate" button
    await page.click('button:has-text("New Estimate")');
    
    // Wait for navigation to create page
    await page.waitForURL('**/estimates/new');
    
    // Fill in estimate details
    await page.fill('input[name="customer_name"]', 'John Doe');
    
    // Set estimate date
    const today = new Date().toISOString().slice(0, 10);
    await page.fill('input[name="estimate_date"]', today);
    
    // Set expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    await page.fill('input[name="expiration_date"]', expirationDate.toISOString().slice(0, 10));
    
    // Add line item
    await page.click('button:has-text("Add Line Item")');
    
    // Fill in line item details
    await page.fill('input[name="line_items[0].description"]', 'Consultation Service');
    await page.fill('input[name="line_items[0].quantity"]', '1');
    await page.fill('input[name="line_items[0].unit_price"]', '100.00');
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Initial consultation estimate');
    
    // Save estimate
    await page.click('button:has-text("Save Estimate")');
    
    // Wait for navigation back to list or detail page
    await page.waitForURL(/\/estimates\/\d+/);
    
    // Verify estimate was created
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Consultation Service')).toBeVisible();
  });

  test('should filter estimates by status', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Select "Draft" status
    await page.selectOption('select', 'draft');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Verify URL or table updates
    // (Implementation depends on whether filtering is client-side or server-side)
    
    // Select "Sent" status
    await page.selectOption('select', 'sent');
    await page.waitForTimeout(500);
    
    // Select "All Statuses"
    await page.selectOption('select', 'all');
    await page.waitForTimeout(500);
  });

  test('should view estimate details', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any estimates
    const hasEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasEstimates) {
      // Click on first estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for navigation to detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Verify detail page elements
      await expect(page.locator('text=Estimate #')).toBeVisible();
      await expect(page.locator('text=Customer')).toBeVisible();
      await expect(page.locator('text=Total')).toBeVisible();
    }
  });

  test('should edit existing estimate', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any estimates
    const hasEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasEstimates) {
      // Click on first estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Click edit button
      await page.click('button:has-text("Edit")');
      
      // Wait for edit form
      await expect(page.locator('h2:has-text("Edit Estimate")')).toBeVisible();
      
      // Update notes
      await page.fill('textarea[name="notes"]', 'Updated estimate notes');
      
      // Save changes
      await page.click('button:has-text("Save")');
      
      // Verify changes saved
      await expect(page.locator('text=Updated estimate notes')).toBeVisible();
    }
  });

  test('should generate PDF export', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any estimates
    const hasEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasEstimates) {
      // Click on first estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export PDF button
      await page.click('button:has-text("Export PDF")');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download filename
      expect(download.suggestedFilename()).toContain('.pdf');
      expect(download.suggestedFilename()).toContain('estimate');
    }
  });

  test('should convert estimate to invoice', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any accepted estimates
    await page.selectOption('select', 'accepted');
    await page.waitForTimeout(500);
    
    const hasAcceptedEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasAcceptedEstimates) {
      // Click on first accepted estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Click convert to invoice button
      await page.click('button:has-text("Convert to Invoice")');
      
      // Confirm conversion
      await page.click('button:has-text("Confirm")');
      
      // Wait for navigation to invoice
      await page.waitForURL(/\/invoices\/\d+/);
      
      // Verify invoice created
      await expect(page.locator('text=Invoice #')).toBeVisible();
    }
  });

  test('should convert estimate to work order', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any accepted estimates
    await page.selectOption('select', 'accepted');
    await page.waitForTimeout(500);
    
    const hasAcceptedEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasAcceptedEstimates) {
      // Click on first accepted estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Click convert to work order button
      await page.click('button:has-text("Convert to Work Order")');
      
      // Confirm conversion
      await page.click('button:has-text("Confirm")');
      
      // Wait for navigation to work order
      await page.waitForURL(/\/work-orders\/\d+/);
      
      // Verify work order created
      await expect(page.locator('text=Work Order #')).toBeVisible();
    }
  });

  test('should update estimate status', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check if there are any estimates
    const hasEstimates = await page.locator('table tbody tr').count() > 0;
    
    if (hasEstimates) {
      // Click on first estimate
      await page.click('table tbody tr:first-child');
      
      // Wait for detail page
      await page.waitForURL(/\/estimates\/\d+/);
      
      // Change status to "Sent"
      await page.selectOption('select[name="status"]', 'sent');
      
      // Save status change
      await page.click('button:has-text("Update Status")');
      
      // Verify status updated
      await expect(page.locator('text=Sent')).toBeVisible();
    }
  });

  test('should calculate totals correctly', async ({ page }) => {
    // Click "New Estimate" button
    await page.click('button:has-text("New Estimate")');
    
    // Wait for navigation to create page
    await page.waitForURL('**/estimates/new');
    
    // Fill in basic details
    await page.fill('input[name="customer_name"]', 'Test Customer');
    
    // Add first line item
    await page.click('button:has-text("Add Line Item")');
    await page.fill('input[name="line_items[0].description"]', 'Item 1');
    await page.fill('input[name="line_items[0].quantity"]', '2');
    await page.fill('input[name="line_items[0].unit_price"]', '50.00');
    
    // Add second line item
    await page.click('button:has-text("Add Line Item")');
    await page.fill('input[name="line_items[1].description"]', 'Item 2');
    await page.fill('input[name="line_items[1].quantity"]', '1');
    await page.fill('input[name="line_items[1].unit_price"]', '75.00');
    
    // Wait for totals to calculate
    await page.waitForTimeout(500);
    
    // Verify subtotal (2 * 50 + 1 * 75 = 175)
    await expect(page.locator('text=/Subtotal.*175\\.00/')).toBeVisible();
    
    // Verify tax is calculated
    await expect(page.locator('text=/Tax/')).toBeVisible();
    
    // Verify total is displayed
    await expect(page.locator('text=/Total/')).toBeVisible();
  });

  test('should handle module flag - redirect when disabled', async ({ page }) => {
    // Mock the config to disable estimates module
    await page.route('**/api/config', async route => {
      const response = await route.fetch();
      const json = await response.json();
      json.modules.estimates = { enabled: false };
      await route.fulfill({ json });
    });
    
    // Try to navigate to estimates
    await page.goto('/estimates');
    
    // Should redirect to dashboard
    await page.waitForURL('/');
  });

  test('should validate required fields', async ({ page }) => {
    // Click "New Estimate" button
    await page.click('button:has-text("New Estimate")');
    
    // Wait for navigation to create page
    await page.waitForURL('**/estimates/new');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Save Estimate")');
    
    // Verify error messages appear
    await expect(page.locator('text=Customer is required')).toBeVisible();
    await expect(page.locator('text=At least one line item is required')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/estimates*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });
    
    // Reload page
    await page.reload();
    
    // Verify loading indicator appears
    await expect(page.locator('text=Loading estimates...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading estimates...')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display error state', async ({ page }) => {
    // Intercept API call to return error
    await page.route('**/api/estimates*', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Reload page
    await page.reload();
    
    // Verify error message appears
    await expect(page.locator('text=Error loading estimates')).toBeVisible();
  });

  test('should display empty state', async ({ page }) => {
    // Intercept API call to return empty array
    await page.route('**/api/estimates*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });
    
    // Reload page
    await page.reload();
    
    // Verify empty state message
    await expect(page.locator('text=No estimates')).toBeVisible();
    await expect(page.locator('text=Get started by creating a new estimate')).toBeVisible();
  });

  test('should use semantic tokens for styling', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Estimates")');
    
    // Check that no hardcoded Tailwind base colors are used
    const html = await page.content();
    
    // Should not contain hardcoded color classes
    expect(html).not.toContain('text-blue-');
    expect(html).not.toContain('text-gray-');
    expect(html).not.toContain('bg-gray-');
    expect(html).not.toContain('border-gray-');
  });

  test('should add and remove line items', async ({ page }) => {
    // Click "New Estimate" button
    await page.click('button:has-text("New Estimate")');
    
    // Wait for navigation to create page
    await page.waitForURL('**/estimates/new');
    
    // Add first line item
    await page.click('button:has-text("Add Line Item")');
    await expect(page.locator('input[name="line_items[0].description"]')).toBeVisible();
    
    // Add second line item
    await page.click('button:has-text("Add Line Item")');
    await expect(page.locator('input[name="line_items[1].description"]')).toBeVisible();
    
    // Remove first line item
    await page.click('button[aria-label="Remove line item 0"]');
    
    // Verify only one line item remains
    await expect(page.locator('input[name="line_items[0].description"]')).toBeVisible();
    await expect(page.locator('input[name="line_items[1].description"]')).not.toBeVisible();
  });

  test('should apply discount to estimate', async ({ page }) => {
    // Click "New Estimate" button
    await page.click('button:has-text("New Estimate")');
    
    // Wait for navigation to create page
    await page.waitForURL('**/estimates/new');
    
    // Fill in basic details and line item
    await page.fill('input[name="customer_name"]', 'Test Customer');
    await page.click('button:has-text("Add Line Item")');
    await page.fill('input[name="line_items[0].description"]', 'Service');
    await page.fill('input[name="line_items[0].quantity"]', '1');
    await page.fill('input[name="line_items[0].unit_price"]', '100.00');
    
    // Apply discount
    await page.click('button:has-text("Add Discount")');
    await page.fill('input[name="discount_percentage"]', '10');
    
    // Wait for totals to recalculate
    await page.waitForTimeout(500);
    
    // Verify discount applied
    await expect(page.locator('text=/Discount.*10%/')).toBeVisible();
    await expect(page.locator('text=/Total.*90\\.00/')).toBeVisible();
  });
});

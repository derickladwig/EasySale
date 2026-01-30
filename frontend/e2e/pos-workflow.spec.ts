import { test, expect } from '@playwright/test';

/**
 * End-to-End test for complete POS workflow
 * Tests the critical path: Login → Search Product → Add to Cart → Checkout → Receipt
 */
test.describe('POS Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/username/i).fill('cashier');
    await page.getByLabel(/password/i).fill('cashier123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/sell');
  });

  test('complete sale workflow', async ({ page }) => {
    // 1. Search for a product
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await expect(page.getByText(/search results/i)).toBeVisible();
    
    // 2. Add product to cart
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Verify product added to cart
    await expect(page.getByText(/1 item/i)).toBeVisible();
    
    // 3. Proceed to checkout
    await page.getByRole('button', { name: /checkout/i }).click();
    
    // 4. Select payment method
    await page.getByRole('button', { name: /cash/i }).click();
    
    // 5. Enter payment amount
    await page.getByLabel(/amount tendered/i).fill('20.00');
    
    // 6. Complete payment
    await page.getByRole('button', { name: /complete sale/i }).click();
    
    // 7. Verify receipt displayed
    await expect(page.getByText(/transaction complete/i)).toBeVisible();
    await expect(page.getByText(/receipt/i)).toBeVisible();
    
    // 8. Print receipt
    await page.getByRole('button', { name: /print receipt/i }).click();
    
    // 9. Start new sale
    await page.getByRole('button', { name: /new sale/i }).click();
    
    // Verify cart is empty
    await expect(page.getByText(/0 items/i)).toBeVisible();
  });

  test('should handle barcode scanning', async ({ page }) => {
    // Simulate barcode scan by typing barcode and pressing Enter
    const barcodeInput = page.getByPlaceholder(/scan barcode/i);
    await barcodeInput.fill('1234567890');
    await barcodeInput.press('Enter');
    
    // Product should be added to cart
    await expect(page.getByText(/1 item/i)).toBeVisible();
  });

  test('should apply discount with manager approval', async ({ page }) => {
    // Add product to cart
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Click discount button
    await page.getByRole('button', { name: /apply discount/i }).click();
    
    // Enter discount amount
    await page.getByLabel(/discount percentage/i).fill('15');
    
    // Should require manager approval
    await expect(page.getByText(/manager approval required/i)).toBeVisible();
    
    // Enter manager PIN
    await page.getByLabel(/manager pin/i).fill('1234');
    await page.getByRole('button', { name: /approve/i }).click();
    
    // Discount should be applied
    await expect(page.getByText(/15% discount/i)).toBeVisible();
  });

  test('should handle returns', async ({ page }) => {
    // Navigate to returns
    await page.getByRole('link', { name: /returns/i }).click();
    
    // Enter receipt number
    await page.getByLabel(/receipt number/i).fill('RCP-001');
    await page.getByRole('button', { name: /lookup/i }).click();
    
    // Select items to return
    await page.getByRole('checkbox').first().check();
    
    // Process return
    await page.getByRole('button', { name: /process return/i }).click();
    
    // Confirm return
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify return completed
    await expect(page.getByText(/return completed/i)).toBeVisible();
  });

  test('should handle split payment', async ({ page }) => {
    // Add product to cart
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Proceed to checkout
    await page.getByRole('button', { name: /checkout/i}).click();
    
    // Select split payment
    await page.getByRole('button', { name: /split payment/i }).click();
    
    // Add cash payment
    await page.getByRole('button', { name: /add cash/i }).click();
    await page.getByLabel(/cash amount/i).fill('10.00');
    await page.getByRole('button', { name: /add/i }).click();
    
    // Add card payment
    await page.getByRole('button', { name: /add card/i }).click();
    await page.getByLabel(/card amount/i).fill('5.00');
    await page.getByRole('button', { name: /add/i }).click();
    
    // Complete payment
    await page.getByRole('button', { name: /complete sale/i }).click();
    
    // Verify transaction complete
    await expect(page.getByText(/transaction complete/i)).toBeVisible();
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate going offline
    await page.context().setOffline(true);
    
    // Add product to cart
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Verify offline indicator
    await expect(page.getByText(/offline mode/i)).toBeVisible();
    
    // Complete sale offline
    await page.getByRole('button', { name: /checkout/i }).click();
    await page.getByRole('button', { name: /cash/i }).click();
    await page.getByLabel(/amount tendered/i).fill('20.00');
    await page.getByRole('button', { name: /complete sale/i }).click();
    
    // Verify transaction queued for sync
    await expect(page.getByText(/transaction queued/i)).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Verify sync indicator
    await expect(page.getByText(/syncing/i)).toBeVisible();
  });

  test('should calculate correct totals with tax', async ({ page }) => {
    // Add product to cart
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Verify subtotal displayed
    const subtotal = await page.getByText(/subtotal:/i).textContent();
    expect(subtotal).toContain('$');
    
    // Verify tax calculated
    const tax = await page.getByText(/tax:/i).textContent();
    expect(tax).toContain('$');
    
    // Verify total calculated
    const total = await page.getByText(/total:/i).textContent();
    expect(total).toContain('$');
    
    // Verify total = subtotal + tax
    const subtotalAmount = parseFloat(subtotal!.replace(/[^0-9.]/g, ''));
    const taxAmount = parseFloat(tax!.replace(/[^0-9.]/g, ''));
    const totalAmount = parseFloat(total!.replace(/[^0-9.]/g, ''));
    
    expect(totalAmount).toBeCloseTo(subtotalAmount + taxAmount, 2);
  });

  test('should handle quantity changes', async ({ page }) => {
    // Add product to cart
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Increase quantity
    await page.getByRole('button', { name: /increase quantity/i }).click();
    await expect(page.getByText(/2 items/i)).toBeVisible();
    
    // Decrease quantity
    await page.getByRole('button', { name: /decrease quantity/i }).click();
    await expect(page.getByText(/1 item/i)).toBeVisible();
    
    // Remove item
    await page.getByRole('button', { name: /remove/i }).click();
    await expect(page.getByText(/0 items/i)).toBeVisible();
  });

  test('should search by multiple criteria', async ({ page }) => {
    // Search by name
    await page.getByPlaceholder(/search products/i).fill('cap');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/search results/i)).toBeVisible();
    
    // Clear search
    await page.getByRole('button', { name: /clear/i }).click();
    
    // Search by SKU
    await page.getByPlaceholder(/search products/i).fill('SKU-001');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/search results/i)).toBeVisible();
    
    // Clear search
    await page.getByRole('button', { name: /clear/i }).click();
    
    // Search by category (generic category name)
    await page.getByRole('button', { name: /filter by category/i }).click();
    await page.getByRole('option', { name: /products/i }).click();
    await expect(page.getByText(/search results/i)).toBeVisible();
  });
});

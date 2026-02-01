/**
 * Appointment Scheduling E2E Tests
 * 
 * End-to-end tests for appointment calendar functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Appointment Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login (assuming test credentials)
    await page.fill('input[name="username"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Navigate to appointments page
    await page.goto('/appointments');
  });

  test('should display calendar with current month', async ({ page }) => {
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="calendar-grid"]', { timeout: 5000 });
    
    // Check that calendar header is visible
    await expect(page.locator('h2')).toContainText(new Date().toLocaleDateString('en-US', { month: 'long' }));
    
    // Check that view selector is visible
    await expect(page.locator('button:has-text("Month")')).toBeVisible();
    await expect(page.locator('button:has-text("Week")')).toBeVisible();
    await expect(page.locator('button:has-text("Day")')).toBeVisible();
  });

  test('should create new appointment', async ({ page }) => {
    // Click "New Appointment" button
    await page.click('button:has-text("New Appointment")');
    
    // Wait for dialog to open
    await expect(page.locator('h2:has-text("New Appointment")')).toBeVisible();
    
    // Fill in appointment details
    await page.fill('input[name="customer_name"]', 'John Doe');
    await page.fill('input[name="service_type"]', 'Consultation');
    
    // Set date and time (tomorrow at 10:00 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateTimeValue = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateTimeValue);
    
    // Set duration
    await page.fill('input[name="duration_minutes"]', '30');
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'First consultation');
    
    // Submit form
    await page.click('button:has-text("Create")');
    
    // Wait for dialog to close
    await expect(page.locator('h2:has-text("New Appointment")')).not.toBeVisible();
    
    // Verify appointment appears in calendar
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Consultation')).toBeVisible();
  });

  test('should switch between calendar views', async ({ page }) => {
    // Start in month view (default)
    await expect(page.locator('button:has-text("Month")')).toHaveClass(/bg-primary/);
    
    // Switch to week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('button:has-text("Week")')).toHaveClass(/bg-primary/);
    
    // Switch to day view
    await page.click('button:has-text("Day")');
    await expect(page.locator('button:has-text("Day")')).toHaveClass(/bg-primary/);
    
    // Switch back to month view
    await page.click('button:has-text("Month")');
    await expect(page.locator('button:has-text("Month")')).toHaveClass(/bg-primary/);
  });

  test('should navigate between dates', async ({ page }) => {
    // Get current month
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('h2')).toContainText(currentMonth);
    
    // Click next button
    await page.click('button[aria-label="Next"]');
    
    // Verify month changed
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('h2')).toContainText(nextMonthName);
    
    // Click previous button twice to go back
    await page.click('button[aria-label="Previous"]');
    await page.click('button[aria-label="Previous"]');
    
    // Verify we're in previous month
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthName = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('h2')).toContainText(prevMonthName);
    
    // Click "Today" button
    await page.click('button:has-text("Today")');
    
    // Verify we're back to current month
    await expect(page.locator('h2')).toContainText(currentMonth);
  });

  test('should edit existing appointment', async ({ page }) => {
    // First create an appointment
    await page.click('button:has-text("New Appointment")');
    await page.fill('input[name="customer_name"]', 'Jane Smith');
    await page.fill('input[name="service_type"]', 'Repair');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateTimeValue = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateTimeValue);
    await page.fill('input[name="duration_minutes"]', '60');
    
    await page.click('button:has-text("Create")');
    await expect(page.locator('h2:has-text("New Appointment")')).not.toBeVisible();
    
    // Click on the appointment to edit
    await page.click('text=Jane Smith');
    
    // Wait for edit dialog
    await expect(page.locator('h2:has-text("Edit Appointment")')).toBeVisible();
    
    // Change service type
    await page.fill('input[name="service_type"]', 'Installation');
    
    // Change status
    await page.selectOption('select[name="status"]', 'confirmed');
    
    // Update appointment
    await page.click('button:has-text("Update")');
    
    // Verify dialog closed
    await expect(page.locator('h2:has-text("Edit Appointment")')).not.toBeVisible();
    
    // Verify changes appear in calendar
    await expect(page.locator('text=Installation')).toBeVisible();
  });

  test('should handle module flag - redirect when disabled', async ({ page }) => {
    // Mock the config to disable appointments module
    await page.route('**/api/config', async route => {
      const response = await route.fetch();
      const json = await response.json();
      json.modules.appointments = { enabled: false };
      await route.fulfill({ json });
    });
    
    // Try to navigate to appointments
    await page.goto('/appointments');
    
    // Should redirect to dashboard
    await page.waitForURL('/');
  });

  test('should validate required fields', async ({ page }) => {
    // Click "New Appointment" button
    await page.click('button:has-text("New Appointment")');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Create")');
    
    // Verify error messages appear
    await expect(page.locator('text=Customer name is required')).toBeVisible();
    await expect(page.locator('text=Service type is required')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/appointments*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });
    
    // Reload page
    await page.reload();
    
    // Verify loading indicator appears
    await expect(page.locator('text=Loading appointments...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading appointments...')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display error state', async ({ page }) => {
    // Intercept API call to return error
    await page.route('**/api/appointments*', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Reload page
    await page.reload();
    
    // Verify error message appears
    await expect(page.locator('text=Failed to Load Appointments')).toBeVisible();
  });
});

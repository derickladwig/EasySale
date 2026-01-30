/**
 * Visual Regression Test Fixtures
 * 
 * Provides seeded data, frozen time, and disabled animations for deterministic screenshots.
 */

import { test as base, Page } from '@playwright/test';

/**
 * Golden dataset for deterministic visual tests
 */
export const goldenData = {
  products: [
    { id: 1, name: 'Product A', price: 29.99, stock: 100, category: 'Electronics' },
    { id: 2, name: 'Product B', price: 49.99, stock: 50, category: 'Clothing' },
    { id: 3, name: 'Product C', price: 19.99, stock: 200, category: 'Books' },
  ],
  customers: [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '555-0100' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '555-0101' },
  ],
  sales: [
    { id: 1, date: '2024-01-15', total: 99.97, customer: 'John Doe', items: 3 },
    { id: 2, date: '2024-01-16', total: 49.99, customer: 'Jane Smith', items: 1 },
  ],
};

/**
 * Frozen timestamp for consistent date displays
 */
export const frozenTime = new Date('2024-01-20T10:00:00Z');

/**
 * Set up golden dataset in the application
 */
export async function setupGoldenDataset(page: Page): Promise<void> {
  await page.evaluate((data) => {
    sessionStorage.setItem('test_data', JSON.stringify(data));
    sessionStorage.setItem('use_test_data', 'true');
  }, goldenData);
}

/**
 * Freeze time for consistent timestamps
 */
export async function freezeTime(page: Page, time: Date = frozenTime): Promise<void> {
  await page.addInitScript((frozenTimestamp) => {
    const frozenDate = new Date(frozenTimestamp);
    Date.now = () => frozenDate.getTime();
    
    // Override Date constructor
    const OriginalDate = Date;
    // @ts-ignore
    Date = class extends OriginalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(frozenTimestamp);
        } else {
          // @ts-ignore
          super(...args);
        }
      }
    };
    // @ts-ignore
    Date.now = () => frozenDate.getTime();
    // @ts-ignore
    Date.parse = OriginalDate.parse;
    // @ts-ignore
    Date.UTC = OriginalDate.UTC;
  }, time.toISOString());
}

/**
 * Extended test with visual regression utilities
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      // Disable CSS animations
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
      
      // Freeze time
      const frozenDate = new Date('2024-01-20T10:00:00Z');
      Date.now = () => frozenDate.getTime();
      Date.prototype.getTime = () => frozenDate.getTime();
    });
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';

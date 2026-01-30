/**
 * Visual Regression Test Helpers
 * 
 * Utilities for contrast validation, theme application, and screenshot management.
 */

import { Page } from '@playwright/test';

/**
 * Theme configuration for visual tests
 */
export interface ThemeConfig {
  mode: 'light' | 'dark';
  accentColor?: string;
}

/**
 * Viewport configuration for visual tests
 */
export interface ViewportConfig {
  name: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
}

export const viewports: Record<string, ViewportConfig> = {
  desktop: { name: 'desktop', width: 1920, height: 1080 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  mobile: { name: 'mobile', width: 375, height: 667 },
};

/**
 * Apply theme to the page
 */
export async function applyTheme(page: Page, config: ThemeConfig): Promise<void> {
  await page.evaluate((themeConfig) => {
    const root = document.documentElement;
    
    // Set theme mode
    root.dataset.theme = themeConfig.mode;
    
    // Set accent color if provided
    if (themeConfig.accentColor) {
      root.style.setProperty('--color-accent', themeConfig.accentColor);
      root.style.setProperty('--theme-accent', themeConfig.accentColor);
    }
    
    // Disable animations for consistent screenshots
    root.style.setProperty('--duration-1', '0ms');
    root.style.setProperty('--duration-2', '0ms');
  }, config);
  
  // Wait for theme to be applied
  await page.waitForTimeout(100);
}

/**
 * Set viewport size
 */
export async function setViewport(page: Page, viewport: ViewportConfig): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

/**
 * Contrast issue details
 */
export interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
}

/**
 * Validate contrast ratios on the page
 * 
 * Checks critical elements for WCAG AA compliance
 */
export async function validateContrast(page: Page): Promise<ContrastIssue[]> {
  return await page.evaluate(() => {
    const issues: ContrastIssue[] = [];
    
    // Helper to get computed color
    const getColor = (element: Element, property: string): string => {
      return window.getComputedStyle(element).getPropertyValue(property);
    };
    
    // Helper to calculate luminance
    const getLuminance = (rgb: string): number => {
      const match = rgb.match(/\d+/g);
      if (!match) return 0;
      
      const [r, g, b] = match.map(Number).map((val) => {
        const sRGB = val / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    // Helper to calculate contrast ratio
    const getContrastRatio = (fg: string, bg: string): number => {
      const fgLum = getLuminance(fg);
      const bgLum = getLuminance(bg);
      const lighter = Math.max(fgLum, bgLum);
      const darker = Math.min(fgLum, bgLum);
      return (lighter + 0.05) / (darker + 0.05);
    };
    
    // Check critical elements
    const selectors = [
      'button',
      'input',
      'a',
      '[role="button"]',
      '.text-text-primary',
      '.text-text-secondary',
      'h1, h2, h3, h4, h5, h6',
      'p',
    ];
    
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const fg = getColor(element, 'color');
        const bg = getColor(element, 'background-color');
        
        // Skip if background is transparent
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return;
        
        const ratio = getContrastRatio(fg, bg);
        const required = 4.5; // WCAG AA for normal text
        
        if (ratio < required) {
          issues.push({
            element: selector,
            foreground: fg,
            background: bg,
            ratio: Math.round(ratio * 100) / 100,
            required,
          });
        }
      });
    });
    
    return issues;
  });
}

/**
 * Generate screenshot name based on configuration
 */
export function getScreenshotName(
  page: string,
  theme: string,
  accent: string,
  viewport: string
): string {
  return `${page}-${theme}-${accent}-${viewport}.png`;
}

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageStable(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for any pending animations (even though we disabled them)
  await page.waitForTimeout(100);
  
  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Seed test data into the application
 */
export async function seedTestData(page: Page, data: any): Promise<void> {
  await page.evaluate((testData) => {
    // Store test data in localStorage or sessionStorage
    sessionStorage.setItem('test_data', JSON.stringify(testData));
  }, data);
}

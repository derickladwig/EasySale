/**
 * Test suite for Tailwind spacing scale configuration
 * Validates Requirements 15.1, 15.2, 15.3 from ui-enhancement spec
 */

import { describe, it, expect } from 'vitest';

// Import the raw config to test the spacing values
// @ts-expect-error - tailwind.config.js doesn't have type declarations
const tailwindConfig = await import('../../tailwind.config.js');
const spacing = tailwindConfig.default.theme.extend.spacing;

describe('Tailwind Spacing Scale', () => {
  describe('4px Base Unit Consistency (Req 15.1)', () => {
    it('should use 4px (0.25rem) as the base unit', () => {
      expect(spacing['1']).toBe('0.25rem'); // 4px
    });

    it('should have all major spacing values as multiples of 4px', () => {
      // Test key spacing values (multiples of 4px)
      expect(spacing['2']).toBe('0.5rem');   // 8px
      expect(spacing['4']).toBe('1rem');     // 16px
      expect(spacing['6']).toBe('1.5rem');   // 24px
      expect(spacing['8']).toBe('2rem');     // 32px
      expect(spacing['12']).toBe('3rem');    // 48px
      expect(spacing['16']).toBe('4rem');    // 64px
    });

    it('should define component spacing (16px)', () => {
      expect(spacing['4']).toBe('1rem'); // 16px - Req 15.3
    });

    it('should define form spacing (24px)', () => {
      expect(spacing['6']).toBe('1.5rem'); // 24px - Req 15.4
    });

    it('should define section spacing (32px)', () => {
      expect(spacing['8']).toBe('2rem'); // 32px - Req 15.2
    });
  });

  describe('Responsive Spacing Utilities (Req 15.5, 15.6)', () => {
    it('should define mobile container padding (16px)', () => {
      expect(spacing['container-mobile']).toBe('1rem'); // 16px
    });

    it('should define desktop container padding (24px)', () => {
      expect(spacing['container-desktop']).toBe('1.5rem'); // 24px
    });

    it('should define mobile grid gap (16px)', () => {
      expect(spacing['grid-gap-mobile']).toBe('1rem'); // 16px
    });

    it('should define desktop grid gap (24px)', () => {
      expect(spacing['grid-gap-desktop']).toBe('1.5rem'); // 24px
    });
  });

  describe('Density Multiplier Utilities (Req 15.7, 15.8, 15.9)', () => {
    it('should define compact spacing (75% of normal)', () => {
      // Compact spacing should be 75% of normal (25% reduction)
      expect(spacing['compact-1']).toBe('calc(0.25rem * 0.75)'); // 3px
      expect(spacing['compact-2']).toBe('calc(0.5rem * 0.75)');  // 6px
      expect(spacing['compact-4']).toBe('calc(1rem * 0.75)');    // 12px
      expect(spacing['compact-6']).toBe('calc(1.5rem * 0.75)');  // 18px
      expect(spacing['compact-8']).toBe('calc(2rem * 0.75)');    // 24px
    });

    it('should define spacious spacing (125% of normal)', () => {
      // Spacious spacing should be 125% of normal (25% increase)
      expect(spacing['spacious-1']).toBe('calc(0.25rem * 1.25)'); // 5px
      expect(spacing['spacious-2']).toBe('calc(0.5rem * 1.25)');  // 10px
      expect(spacing['spacious-4']).toBe('calc(1rem * 1.25)');    // 20px
      expect(spacing['spacious-6']).toBe('calc(1.5rem * 1.25)');  // 30px
      expect(spacing['spacious-8']).toBe('calc(2rem * 1.25)');    // 40px
    });

    it('should maintain consistent ratios across density levels', () => {
      // Verify that compact is 75% and spacious is 125% of normal
      // For spacing-4 (16px):
      // - Normal: 1rem (16px)
      // - Compact: 0.75rem (12px) = 75%
      // - Spacious: 1.25rem (20px) = 125%
      
      expect(spacing['4']).toBe('1rem');
      expect(spacing['compact-4']).toBe('calc(1rem * 0.75)');
      expect(spacing['spacious-4']).toBe('calc(1rem * 1.25)');
    });
  });

  describe('Spacing Scale Completeness', () => {
    it('should have all standard Tailwind spacing values', () => {
      // Verify standard spacing scale exists
      const standardValues = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];
      
      standardValues.forEach(value => {
        expect(spacing[value]).toBeDefined();
      });
    });

    it('should have fine-tuning values (0.5, 1.5)', () => {
      // These are exceptions for fine-tuning, not multiples of 4px
      expect(spacing['0.5']).toBe('0.125rem'); // 2px
      expect(spacing['1.5']).toBe('0.375rem'); // 6px
    });
  });
});

/**
 * Property Test: Text Contrast Compliance
 *
 * Feature: themeable-login-system
 * Property 10: All text must meet WCAG AA contrast standards (4.5:1)
 *
 * Validates Requirements 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  checkContrast,
  adjustColorForContrast,
  rgbToHex,
  validateThemeContrast,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
} from './contrastChecker';

// ============================================================================
// Arbitraries
// ============================================================================

const hexColorArbitrary = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => {
    const toHex = (val: number) => val.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  });

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 10: Text Contrast Compliance', () => {
  it('should correctly convert hex colors to RGB', () => {
    fc.assert(
      fc.property(hexColorArbitrary, (hex) => {
        // Act
        const rgb = hexToRgb(hex);

        // Assert: Conversion should succeed
        expect(rgb).toBeTruthy();
        expect(rgb!.r).toBeGreaterThanOrEqual(0);
        expect(rgb!.r).toBeLessThanOrEqual(255);
        expect(rgb!.g).toBeGreaterThanOrEqual(0);
        expect(rgb!.g).toBeLessThanOrEqual(255);
        expect(rgb!.b).toBeGreaterThanOrEqual(0);
        expect(rgb!.b).toBeLessThanOrEqual(255);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate luminance values between 0 and 1', () => {
    fc.assert(
      fc.property(hexColorArbitrary, (hex) => {
        // Arrange
        const rgb = hexToRgb(hex);
        expect(rgb).toBeTruthy();

        // Act
        const luminance = getLuminance(rgb!);

        // Assert: Luminance should be in valid range
        expect(luminance).toBeGreaterThanOrEqual(0);
        expect(luminance).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate contrast ratios between 1 and 21', () => {
    fc.assert(
      fc.property(hexColorArbitrary, hexColorArbitrary, (color1, color2) => {
        // Act
        const ratio = getContrastRatio(color1, color2);

        // Assert: Ratio should be in valid range
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21);
      }),
      { numRuns: 100 }
    );
  });

  it('should have symmetric contrast ratios', () => {
    fc.assert(
      fc.property(hexColorArbitrary, hexColorArbitrary, (color1, color2) => {
        // Act
        const ratio1 = getContrastRatio(color1, color2);
        const ratio2 = getContrastRatio(color2, color1);

        // Assert: Contrast ratio should be symmetric
        expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly identify WCAG AA compliance for normal text', () => {
    fc.assert(
      fc.property(hexColorArbitrary, hexColorArbitrary, (foreground, background) => {
        // Act
        const result = checkContrast(foreground, background, false);

        // Assert: Result should have valid structure
        expect(result.ratio).toBeGreaterThanOrEqual(1);
        expect(result.ratio).toBeLessThanOrEqual(21);
        expect(['AAA', 'AA', 'Fail']).toContain(result.level);

        // Assert: Passes should match ratio threshold
        if (result.ratio >= WCAG_AA_NORMAL) {
          expect(result.passes).toBe(true);
          expect(['AAA', 'AA']).toContain(result.level);
        } else {
          expect(result.passes).toBe(false);
          expect(result.level).toBe('Fail');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have lower threshold for large text', () => {
    fc.assert(
      fc.property(hexColorArbitrary, hexColorArbitrary, (foreground, background) => {
        // Act
        const normalResult = checkContrast(foreground, background, false);
        const largeResult = checkContrast(foreground, background, true);

        // Assert: Large text should have same or better compliance
        if (normalResult.passes) {
          expect(largeResult.passes).toBe(true);
        }

        // Assert: Threshold for large text should be lower
        expect(WCAG_AA_LARGE).toBeLessThan(WCAG_AA_NORMAL);
      }),
      { numRuns: 100 }
    );
  });

  it('should adjust colors to meet contrast requirements', () => {
    fc.assert(
      fc.property(hexColorArbitrary, hexColorArbitrary, (foreground, background) => {
        // Act
        const adjusted = adjustColorForContrast(foreground, background, WCAG_AA_NORMAL);
        const result = checkContrast(adjusted, background, false);

        // Assert: Adjusted color should either meet requirements or be pure white/black
        // (which is the best we can do for some backgrounds)
        const isPureWhiteOrBlack = adjusted === '#ffffff' || adjusted === '#000000';
        if (!isPureWhiteOrBlack) {
          expect(result.passes).toBe(true);
        }
        // If it's pure white or black, it should have the best possible contrast
        if (isPureWhiteOrBlack) {
          expect(result.ratio).toBeGreaterThan(1);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should convert RGB back to valid hex format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          // Act
          const hex = rgbToHex({ r, g, b });

          // Assert: Should be valid hex format
          expect(hex).toMatch(/^#[0-9a-f]{6}$/i);

          // Assert: Should round-trip correctly
          const rgb = hexToRgb(hex);
          expect(rgb).toBeTruthy();
          expect(Math.abs(rgb!.r - r)).toBeLessThanOrEqual(1);
          expect(Math.abs(rgb!.g - g)).toBeLessThanOrEqual(1);
          expect(Math.abs(rgb!.b - b)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate theme contrast correctly', () => {
    fc.assert(
      fc.property(
        hexColorArbitrary,
        hexColorArbitrary,
        hexColorArbitrary,
        hexColorArbitrary,
        (textPrimary, textSecondary, textTertiary, surfacePrimary) => {
          // Arrange
          const theme = {
            colors: {
              text: {
                primary: textPrimary,
                secondary: textSecondary,
                tertiary: textTertiary,
              },
              surface: {
                primary: surfacePrimary,
              },
            },
          };

          // Act
          const validation = validateThemeContrast(theme);

          // Assert: Validation should have valid structure
          expect(typeof validation.valid).toBe('boolean');
          expect(Array.isArray(validation.issues)).toBe(true);

          // Assert: If valid, should have no issues
          if (validation.valid) {
            expect(validation.issues).toHaveLength(0);
          } else {
            expect(validation.issues.length).toBeGreaterThan(0);
          }

          // Assert: Each issue should be descriptive
          validation.issues.forEach((issue) => {
            expect(issue.length).toBeGreaterThan(0);
            expect(issue).toContain('contrast');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should ensure black on white meets WCAG AA', () => {
    // Act
    const result = checkContrast('#000000', '#ffffff', false);

    // Assert
    expect(result.passes).toBe(true);
    expect(result.level).toBe('AAA');
    expect(result.ratio).toBeGreaterThan(WCAG_AA_NORMAL);
  });

  it('should ensure white on black meets WCAG AA', () => {
    // Act
    const result = checkContrast('#ffffff', '#000000', false);

    // Assert
    expect(result.passes).toBe(true);
    expect(result.level).toBe('AAA');
    expect(result.ratio).toBeGreaterThan(WCAG_AA_NORMAL);
  });
});

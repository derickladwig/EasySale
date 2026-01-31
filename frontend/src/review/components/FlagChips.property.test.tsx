/**
 * Property-Based Tests for FlagChips Component
 *
 * These tests verify universal properties that should hold true for all valid
 * FlagChips configurations using fast-check for property-based testing.
 *
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { FlagChips } from '../../components/review/FlagChips';

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generate a valid flag string (non-empty, reasonable length)
 */
const flagString = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Generate an array of hard flags
 */
const hardFlagsArray = fc.array(flagString, { minLength: 0, maxLength: 10 });

/**
 * Generate an array of soft flags
 */
const softFlagsArray = fc.array(flagString, { minLength: 0, maxLength: 10 });

/**
 * Generate validation result with hard and soft flags
 */
const validationResult = fc.record({
  hard_flags: hardFlagsArray,
  soft_flags: softFlagsArray,
});

// ============================================================================
// Property 11: Flag Chip Display from Validation Result
// **Validates: Requirements 4.8**
// ============================================================================

describe('Property 11: Flag Chip Display from Validation Result', () => {
  it('should display a chip for each hard flag in the validation result', () => {
    fc.assert(
      fc.property(
        hardFlagsArray,
        softFlagsArray,
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Find all hard flag chips by title attribute
          const hardFlagChips = container.querySelectorAll('[title="Hard flag - must be resolved"]');

          // Should have exactly one chip per hard flag
          expect(hardFlagChips.length).toBe(hardFlags.length);

          // Verify each hard flag text is displayed
          hardFlags.forEach((flag) => {
            const chipWithText = Array.from(hardFlagChips).find(
              (chip) => chip.textContent?.includes(flag)
            );
            expect(chipWithText).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display a chip for each soft flag in the validation result', () => {
    fc.assert(
      fc.property(
        hardFlagsArray,
        softFlagsArray,
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Find all soft flag chips by title attribute
          const softFlagChips = container.querySelectorAll('[title="Soft flag - review recommended"]');

          // Should have exactly one chip per soft flag
          expect(softFlagChips.length).toBe(softFlags.length);

          // Verify each soft flag text is displayed
          softFlags.forEach((flag) => {
            const chipWithText = Array.from(softFlagChips).find(
              (chip) => chip.textContent?.includes(flag)
            );
            expect(chipWithText).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display total number of chips equal to sum of hard and soft flags', () => {
    fc.assert(
      fc.property(
        hardFlagsArray,
        softFlagsArray,
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Find all flag chips by title attributes
          const hardChips = container.querySelectorAll('[title="Hard flag - must be resolved"]');
          const softChips = container.querySelectorAll('[title="Soft flag - review recommended"]');

          // Total chips should equal sum of hard and soft flags
          expect(hardChips.length + softChips.length).toBe(hardFlags.length + softFlags.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render nothing when both hard_flags and soft_flags are empty', () => {
    fc.assert(
      fc.property(
        fc.constant([]).map(arr => [...arr]),
        fc.constant([]).map(arr => [...arr]),
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Should render nothing (null)
          expect(container.firstChild).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use error styling for hard flags', () => {
    fc.assert(
      fc.property(
        fc.array(flagString, { minLength: 1, maxLength: 5 }),
        (hardFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={[]} />
          );

          // Find all hard flag chips
          const hardFlagChips = container.querySelectorAll('[title="Hard flag - must be resolved"]');

          // All hard flag chips should have error styling (CSS variable classes)
          hardFlagChips.forEach((chip) => {
            expect(chip.className).toContain('--color-error');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use warning styling for soft flags', () => {
    fc.assert(
      fc.property(
        fc.array(flagString, { minLength: 1, maxLength: 5 }),
        (softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={[]} softFlags={softFlags} />
          );

          // Find all soft flag chips
          const softFlagChips = container.querySelectorAll('[title="Soft flag - review recommended"]');

          // All soft flag chips should have warning styling (CSS variable classes)
          softFlagChips.forEach((chip) => {
            expect(chip.className).toContain('--color-warning');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display hard flags before soft flags in DOM order', () => {
    fc.assert(
      fc.property(
        fc.array(flagString, { minLength: 1, maxLength: 3 }),
        fc.array(flagString, { minLength: 1, maxLength: 3 }),
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Get all chips in order using span elements with title
          const allChips = container.querySelectorAll('span[title]');
          const chipTitles = Array.from(allChips).map((chip) => chip.getAttribute('title'));

          // First N chips should be hard flags
          for (let i = 0; i < hardFlags.length; i++) {
            expect(chipTitles[i]).toBe('Hard flag - must be resolved');
          }

          // Remaining chips should be soft flags
          for (let i = hardFlags.length; i < hardFlags.length + softFlags.length; i++) {
            expect(chipTitles[i]).toBe('Soft flag - review recommended');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include icon with each flag chip', () => {
    fc.assert(
      fc.property(
        validationResult,
        ({ hard_flags, soft_flags }) => {
          const { container } = render(
            <FlagChips hardFlags={hard_flags} softFlags={soft_flags} />
          );

          // Find all chips by title
          const allChips = container.querySelectorAll('span[title]');

          // Each chip should contain an SVG icon
          allChips.forEach((chip) => {
            const icon = chip.querySelector('svg');
            expect(icon).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have appropriate title attributes for accessibility', () => {
    fc.assert(
      fc.property(
        hardFlagsArray,
        softFlagsArray,
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Find all hard flag chips
          const hardFlagChips = container.querySelectorAll('[title="Hard flag - must be resolved"]');
          expect(hardFlagChips.length).toBe(hardFlags.length);

          // Find all soft flag chips
          const softFlagChips = container.querySelectorAll('[title="Soft flag - review recommended"]');
          expect(softFlagChips.length).toBe(softFlags.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle undefined flags gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, [] as string[]),
        fc.constantFrom(undefined, [] as string[]),
        (hardFlags, softFlags) => {
          // Should not throw when rendering with undefined
          expect(() => {
            render(<FlagChips hardFlags={hardFlags} softFlags={softFlags} />);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve flag text exactly as provided', () => {
    fc.assert(
      fc.property(
        hardFlagsArray,
        softFlagsArray,
        (hardFlags, softFlags) => {
          const { container } = render(
            <FlagChips hardFlags={hardFlags} softFlags={softFlags} />
          );

          // Verify all hard flags are displayed with exact text
          hardFlags.forEach((flag) => {
            expect(container.textContent).toContain(flag);
          });

          // Verify all soft flags are displayed with exact text
          softFlags.forEach((flag) => {
            expect(container.textContent).toContain(flag);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

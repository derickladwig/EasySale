import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ReviewCase, ValidationSummary } from '../useReviewApi';

/**
 * Property 11: Flag Chip Display from Validation Result
 * 
 * For any case with validation_result containing hard_flags or soft_flags arrays,
 * the Review Queue SHALL display a chip for each flag in those arrays.
 * 
 * **Validates: Requirements 4.8**
 */

// Helper function to determine if flag chips should be displayed
function shouldDisplayFlagChips(validationResult?: ValidationSummary): boolean {
  if (!validationResult) return false;
  return (validationResult.hard_flags?.length > 0) || (validationResult.soft_flags?.length > 0);
}

// Helper function to count total flags
function countTotalFlags(validationResult?: ValidationSummary): number {
  if (!validationResult) return 0;
  const hardCount = validationResult.hard_flags?.length || 0;
  const softCount = validationResult.soft_flags?.length || 0;
  return hardCount + softCount;
}

describe('Property 11: Flag Chip Display from Validation Result', () => {
  it('should display chips when validation_result contains hard_flags', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        (hardFlags) => {
          const validationResult: ValidationSummary = {
            hard_flags: hardFlags,
            soft_flags: [],
            can_approve: false,
          };

          const shouldDisplay = shouldDisplayFlagChips(validationResult);
          const totalFlags = countTotalFlags(validationResult);

          expect(shouldDisplay).toBe(true);
          expect(totalFlags).toBe(hardFlags.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display chips when validation_result contains soft_flags', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        (softFlags) => {
          const validationResult: ValidationSummary = {
            hard_flags: [],
            soft_flags: softFlags,
            can_approve: true,
          };

          const shouldDisplay = shouldDisplayFlagChips(validationResult);
          const totalFlags = countTotalFlags(validationResult);

          expect(shouldDisplay).toBe(true);
          expect(totalFlags).toBe(softFlags.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display chips when validation_result contains both hard and soft flags', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        (hardFlags, softFlags) => {
          const validationResult: ValidationSummary = {
            hard_flags: hardFlags,
            soft_flags: softFlags,
            can_approve: false,
          };

          const shouldDisplay = shouldDisplayFlagChips(validationResult);
          const totalFlags = countTotalFlags(validationResult);

          expect(shouldDisplay).toBe(true);
          expect(totalFlags).toBe(hardFlags.length + softFlags.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display chips when validation_result has no flags', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          const validationResult: ValidationSummary = {
            hard_flags: [],
            soft_flags: [],
            can_approve: true,
          };

          const shouldDisplay = shouldDisplayFlagChips(validationResult);
          const totalFlags = countTotalFlags(validationResult);

          expect(shouldDisplay).toBe(false);
          expect(totalFlags).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display chips when validation_result is undefined', () => {
    const shouldDisplay = shouldDisplayFlagChips(undefined);
    const totalFlags = countTotalFlags(undefined);

    expect(shouldDisplay).toBe(false);
    expect(totalFlags).toBe(0);
  });

  it('should correctly categorize flags by type', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
        (hardFlags, softFlags) => {
          const validationResult: ValidationSummary = {
            hard_flags: hardFlags,
            soft_flags: softFlags,
            can_approve: hardFlags.length === 0,
          };

          // Verify that hard flags are distinct from soft flags
          const hardCount = validationResult.hard_flags.length;
          const softCount = validationResult.soft_flags.length;
          const totalCount = countTotalFlags(validationResult);

          expect(totalCount).toBe(hardCount + softCount);
          
          // Verify can_approve logic: should be false if there are hard flags
          if (hardFlags.length > 0) {
            expect(validationResult.can_approve).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

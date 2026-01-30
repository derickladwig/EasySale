/**
 * Property-Based Tests: Stats Aggregation from Case States
 * 
 * Feature: document-workflow-wiring
 * Property 1: Stats Aggregation from Case States
 * 
 * For any set of cases returned from the API with various states, the Document Center
 * stats cards SHALL correctly count cases where:
 * - Needs Review = count of cases with state "NeedsReview"
 * - Processing = count of cases with state "Processing" or "Queued"
 * - Failed = count of cases with state "Failed"
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 * 
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateStats, type CaseWithState } from './statsAggregation';

// Generator for case states
const caseState = fc.constantFrom(
  'NeedsReview',
  'Processing',
  'Queued',
  'Failed',
  'Approved',
  'AutoApproved',
  'InReview',
  'Rejected',
  'Exported'
) as fc.Arbitrary<CaseWithState['state']>;

// Generator for a single case
const caseArbitrary = fc.record({
  case_id: fc.uuid(),
  state: caseState,
  vendor_name: fc.option(fc.string(), { nil: undefined }),
  confidence: fc.double({ min: 0, max: 1 }),
  created_at: fc.date().map(d => d.toISOString()),
}) as fc.Arbitrary<CaseWithState>;

// Generator for an array of cases
const casesArray = fc.array(caseArbitrary, { minLength: 0, maxLength: 100 });

describe('Document Workflow Properties', () => {
  describe('Property 1: Stats Aggregation from Case States', () => {
    it('should correctly count NeedsReview cases', () => {
      fc.assert(
        fc.property(casesArray, (cases) => {
          const stats = calculateStats(cases);
          const expectedNeedsReview = cases.filter(c => c.state === 'NeedsReview').length;
          
          expect(stats.needsReview).toBe(expectedNeedsReview);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly count Processing cases (Processing + Queued)', () => {
      fc.assert(
        fc.property(casesArray, (cases) => {
          const stats = calculateStats(cases);
          const expectedProcessing = cases.filter(
            c => c.state === 'Processing' || c.state === 'Queued'
          ).length;
          
          expect(stats.processing).toBe(expectedProcessing);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly count Failed cases', () => {
      fc.assert(
        fc.property(casesArray, (cases) => {
          const stats = calculateStats(cases);
          const expectedFailed = cases.filter(c => c.state === 'Failed').length;
          
          expect(stats.failed).toBe(expectedFailed);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty case arrays', () => {
      fc.assert(
        fc.property(fc.constant([]), (cases) => {
          const stats = calculateStats([...cases]);
          
          expect(stats.needsReview).toBe(0);
          expect(stats.processing).toBe(0);
          expect(stats.failed).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should aggregate all stats correctly in a single pass', () => {
      fc.assert(
        fc.property(casesArray, (cases) => {
          const stats = calculateStats(cases);
          
          const expectedNeedsReview = cases.filter(c => c.state === 'NeedsReview').length;
          const expectedProcessing = cases.filter(
            c => c.state === 'Processing' || c.state === 'Queued'
          ).length;
          const expectedFailed = cases.filter(c => c.state === 'Failed').length;
          
          expect(stats.needsReview).toBe(expectedNeedsReview);
          expect(stats.processing).toBe(expectedProcessing);
          expect(stats.failed).toBe(expectedFailed);
        }),
        { numRuns: 100 }
      );
    });

    it('should not count other states in any category', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              case_id: fc.uuid(),
              state: fc.constantFrom('Approved', 'AutoApproved', 'InReview', 'Rejected', 'Exported'),
            }) as fc.Arbitrary<CaseWithState>,
            { minLength: 1, maxLength: 50 }
          ),
          (cases) => {
            const stats = calculateStats(cases);
            
            // None of these states should be counted in any category
            expect(stats.needsReview).toBe(0);
            expect(stats.processing).toBe(0);
            expect(stats.failed).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple calculations', () => {
      fc.assert(
        fc.property(casesArray, (cases) => {
          const stats1 = calculateStats(cases);
          const stats2 = calculateStats(cases);
          
          // Same input should always produce same output
          expect(stats1).toEqual(stats2);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle cases with only one state type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('NeedsReview', 'Processing', 'Queued', 'Failed'),
          fc.integer({ min: 1, max: 50 }),
          (state, count) => {
            const cases: CaseWithState[] = Array.from({ length: count }, (_, i) => ({
              case_id: `case-${i}`,
              state: state as CaseWithState['state'],
            }));
            
            const stats = calculateStats(cases);
            
            if (state === 'NeedsReview') {
              expect(stats.needsReview).toBe(count);
              expect(stats.processing).toBe(0);
              expect(stats.failed).toBe(0);
            } else if (state === 'Processing' || state === 'Queued') {
              expect(stats.needsReview).toBe(0);
              expect(stats.processing).toBe(count);
              expect(stats.failed).toBe(0);
            } else if (state === 'Failed') {
              expect(stats.needsReview).toBe(0);
              expect(stats.processing).toBe(0);
              expect(stats.failed).toBe(count);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly aggregate mixed Processing and Queued states', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          (processingCount, queuedCount) => {
            const cases: CaseWithState[] = [
              ...Array.from({ length: processingCount }, (_, i) => ({
                case_id: `processing-${i}`,
                state: 'Processing' as const,
              })),
              ...Array.from({ length: queuedCount }, (_, i) => ({
                case_id: `queued-${i}`,
                state: 'Queued' as const,
              })),
            ];
            
            const stats = calculateStats(cases);
            
            expect(stats.processing).toBe(processingCount + queuedCount);
            expect(stats.needsReview).toBe(0);
            expect(stats.failed).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle large arrays efficiently', () => {
      fc.assert(
        fc.property(
          fc.array(caseArbitrary, { minLength: 100, maxLength: 1000 }),
          (cases) => {
            const startTime = performance.now();
            const stats = calculateStats(cases);
            const endTime = performance.now();
            
            // Should complete in reasonable time (< 100ms for 1000 cases)
            expect(endTime - startTime).toBeLessThan(100);
            
            // Verify correctness
            const expectedNeedsReview = cases.filter(c => c.state === 'NeedsReview').length;
            const expectedProcessing = cases.filter(
              c => c.state === 'Processing' || c.state === 'Queued'
            ).length;
            const expectedFailed = cases.filter(c => c.state === 'Failed').length;
            
            expect(stats.needsReview).toBe(expectedNeedsReview);
            expect(stats.processing).toBe(expectedProcessing);
            expect(stats.failed).toBe(expectedFailed);
          }
        ),
        { numRuns: 10 } // Fewer runs for performance test
      );
    });
  });
});

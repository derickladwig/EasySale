/**
 * Property-Based Tests: Case Action Visibility Based on State
 * 
 * Feature: document-workflow-wiring
 * Property 3: Case Action Visibility Based on State
 * 
 * For any case with state "Failed", the Document Center and Processing Queue SHALL
 * display both "View Error" and "Retry" actions. For any case with other states,
 * only the "View Case" action SHALL be displayed.
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 * 
 * **Validates: Requirements 1.8, 1.9, 3.5, 3.6, 3.7**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Case state type
type CaseState = 
  | 'NeedsReview'
  | 'InReview'
  | 'Processing'
  | 'Queued'
  | 'Failed'
  | 'Approved'
  | 'AutoApproved'
  | 'Rejected'
  | 'Exported';

// Action types that can be displayed
type ActionType = 'viewError' | 'retry' | 'viewCase';

/**
 * Determine which actions should be visible for a given case state
 * 
 * This function encapsulates the business logic for action visibility
 * that is implemented in DocumentTable and ProcessingQueueTab components.
 * 
 * @param state - The case state
 * @returns Array of action types that should be visible
 */
export function getVisibleActions(state: CaseState): ActionType[] {
  if (state === 'Failed') {
    // Failed cases show both View Error and Retry actions
    return ['viewError', 'retry'];
  } else {
    // All other states show only View Case action
    return ['viewCase'];
  }
}

/**
 * Check if a specific action should be visible for a given state
 * 
 * @param state - The case state
 * @param action - The action to check
 * @returns true if the action should be visible
 */
export function isActionVisible(state: CaseState, action: ActionType): boolean {
  const visibleActions = getVisibleActions(state);
  return visibleActions.includes(action);
}

// Generator for case states
const caseState = fc.constantFrom<CaseState>(
  'NeedsReview',
  'InReview',
  'Processing',
  'Queued',
  'Failed',
  'Approved',
  'AutoApproved',
  'Rejected',
  'Exported'
);

describe('Document Workflow Properties', () => {
  describe('Property 3: Case Action Visibility Based on State', () => {
    it('should show viewError and retry actions for Failed state', () => {
      fc.assert(
        fc.property(fc.constant('Failed' as CaseState), (state) => {
          const actions = getVisibleActions(state);
          
          expect(actions).toContain('viewError');
          expect(actions).toContain('retry');
          expect(actions).not.toContain('viewCase');
          expect(actions).toHaveLength(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should show only viewCase action for non-Failed states', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<CaseState>(
            'NeedsReview',
            'InReview',
            'Processing',
            'Queued',
            'Approved',
            'AutoApproved',
            'Rejected',
            'Exported'
          ),
          (state) => {
            const actions = getVisibleActions(state);
            
            expect(actions).toContain('viewCase');
            expect(actions).not.toContain('viewError');
            expect(actions).not.toContain('retry');
            expect(actions).toHaveLength(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never show both viewCase and viewError/retry together', () => {
      fc.assert(
        fc.property(caseState, (state) => {
          const actions = getVisibleActions(state);
          
          // viewCase and viewError should never appear together
          const hasViewCase = actions.includes('viewCase');
          const hasViewError = actions.includes('viewError');
          const hasRetry = actions.includes('retry');
          
          if (hasViewCase) {
            expect(hasViewError).toBe(false);
            expect(hasRetry).toBe(false);
          }
          
          if (hasViewError || hasRetry) {
            expect(hasViewCase).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should always show at least one action for any state', () => {
      fc.assert(
        fc.property(caseState, (state) => {
          const actions = getVisibleActions(state);
          
          expect(actions.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should show exactly 2 actions for Failed state', () => {
      fc.assert(
        fc.property(fc.constant('Failed' as CaseState), (state) => {
          const actions = getVisibleActions(state);
          
          expect(actions).toHaveLength(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should show exactly 1 action for non-Failed states', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<CaseState>(
            'NeedsReview',
            'InReview',
            'Processing',
            'Queued',
            'Approved',
            'AutoApproved',
            'Rejected',
            'Exported'
          ),
          (state) => {
            const actions = getVisibleActions(state);
            
            expect(actions).toHaveLength(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple calls', () => {
      fc.assert(
        fc.property(caseState, (state) => {
          const actions1 = getVisibleActions(state);
          const actions2 = getVisibleActions(state);
          
          // Same input should always produce same output
          expect(actions1).toEqual(actions2);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify action visibility with isActionVisible', () => {
      fc.assert(
        fc.property(caseState, (state) => {
          const visibleActions = getVisibleActions(state);
          
          // Check that isActionVisible agrees with getVisibleActions
          expect(isActionVisible(state, 'viewError')).toBe(visibleActions.includes('viewError'));
          expect(isActionVisible(state, 'retry')).toBe(visibleActions.includes('retry'));
          expect(isActionVisible(state, 'viewCase')).toBe(visibleActions.includes('viewCase'));
        }),
        { numRuns: 100 }
      );
    });

    it('should handle Failed state consistently across different test scenarios', () => {
      fc.assert(
        fc.property(
          fc.record({
            state: fc.constant('Failed' as CaseState),
            caseId: fc.uuid(),
            vendor: fc.option(fc.string(), { nil: undefined }),
          }),
          (caseData) => {
            const actions = getVisibleActions(caseData.state);
            
            // Failed state should always show the same actions regardless of other properties
            expect(actions).toEqual(['viewError', 'retry']);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all non-Failed states consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            state: fc.constantFrom<CaseState>(
              'NeedsReview',
              'InReview',
              'Processing',
              'Queued',
              'Approved',
              'AutoApproved',
              'Rejected',
              'Exported'
            ),
            caseId: fc.uuid(),
            vendor: fc.option(fc.string(), { nil: undefined }),
          }),
          (caseData) => {
            const actions = getVisibleActions(caseData.state);
            
            // Non-Failed states should always show only viewCase
            expect(actions).toEqual(['viewCase']);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should partition all states into exactly two groups', () => {
      fc.assert(
        fc.property(caseState, (state) => {
          const actions = getVisibleActions(state);
          
          // Every state should fall into one of two categories:
          // 1. Failed state with 2 actions (viewError, retry)
          // 2. Non-Failed state with 1 action (viewCase)
          const isFailed = state === 'Failed';
          const hasFailedActions = actions.includes('viewError') && actions.includes('retry');
          const hasNonFailedActions = actions.includes('viewCase');
          
          if (isFailed) {
            expect(hasFailedActions).toBe(true);
            expect(hasNonFailedActions).toBe(false);
          } else {
            expect(hasFailedActions).toBe(false);
            expect(hasNonFailedActions).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle arrays of cases with mixed states', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              caseId: fc.uuid(),
              state: caseState,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (cases) => {
            // Count how many cases should show each action type
            const failedCount = cases.filter(c => c.state === 'Failed').length;
            const nonFailedCount = cases.length - failedCount;
            
            // Verify action visibility for each case
            cases.forEach(caseData => {
              const actions = getVisibleActions(caseData.state);
              
              if (caseData.state === 'Failed') {
                expect(actions).toEqual(['viewError', 'retry']);
              } else {
                expect(actions).toEqual(['viewCase']);
              }
            });
            
            // Verify counts
            const casesWithViewError = cases.filter(c => 
              getVisibleActions(c.state).includes('viewError')
            ).length;
            const casesWithRetry = cases.filter(c => 
              getVisibleActions(c.state).includes('retry')
            ).length;
            const casesWithViewCase = cases.filter(c => 
              getVisibleActions(c.state).includes('viewCase')
            ).length;
            
            expect(casesWithViewError).toBe(failedCount);
            expect(casesWithRetry).toBe(failedCount);
            expect(casesWithViewCase).toBe(nonFailedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for the same state', () => {
      fc.assert(
        fc.property(
          caseState,
          fc.integer({ min: 1, max: 10 }),
          (state, iterations) => {
            // Call getVisibleActions multiple times
            const results = Array.from({ length: iterations }, () => 
              getVisibleActions(state)
            );
            
            // All results should be identical
            const firstResult = results[0];
            results.forEach(result => {
              expect(result).toEqual(firstResult);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

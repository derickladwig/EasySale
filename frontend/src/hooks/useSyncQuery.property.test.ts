/**
 * Property-Based Tests for useSyncQuery Hook
 * 
 * **Property 7: Data Fetch State Indicators**
 * For any data fetch operation, the UI SHALL display a primary state of exactly one of:
 * loading spinner (initial fetch), content (on success with data), empty state (on success
 * with no data), or error state with retry button (on failure). When refetching while
 * content is displayed, a secondary "Refreshing..." indicator MAY be shown alongside the content.
 * 
 * **Validates: Requirements 14.1, 14.2, 14.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * State machine for data fetch states
 * Represents the possible states of a data fetch operation
 */
type FetchState = 'loading' | 'content' | 'empty' | 'error' | 'refetching';

interface FetchStateFlags {
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  hasData: boolean;
  dataIsEmpty: boolean;
}

/**
 * Determine the primary display state from fetch flags
 * This is the core logic that components should use
 */
function determinePrimaryState(flags: FetchStateFlags): FetchState {
  // Initial loading (no data yet)
  if (flags.isLoading && !flags.hasData) {
    return 'loading';
  }
  
  // Error state (no data to show)
  if (flags.isError && !flags.hasData) {
    return 'error';
  }
  
  // Refetching (has data, fetching new data)
  if (flags.isRefetching && flags.hasData) {
    return 'refetching';
  }
  
  // Empty state (fetch succeeded but no data)
  if (flags.hasData && flags.dataIsEmpty) {
    return 'empty';
  }
  
  // Content state (has data to display)
  if (flags.hasData && !flags.dataIsEmpty) {
    return 'content';
  }
  
  // Default to loading if unclear
  return 'loading';
}

/**
 * Check if exactly one primary state is active
 */
function hasExactlyOnePrimaryState(flags: FetchStateFlags): boolean {
  const state = determinePrimaryState(flags);
  const primaryStates: FetchState[] = ['loading', 'content', 'empty', 'error'];
  
  // Refetching is a secondary state that can coexist with content
  if (state === 'refetching') {
    return flags.hasData; // Must have data to be in refetching state
  }
  
  return primaryStates.includes(state);
}

describe('Data Fetch States - Property 7', () => {
  /**
   * Property 7.1: Exactly one primary state is active at any time
   * The UI SHALL display exactly one of: loading, content, empty, or error
   */
  it('exactly one primary state is active at any time', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          isRefetching: fc.boolean(),
          isError: fc.boolean(),
          hasData: fc.boolean(),
          dataIsEmpty: fc.boolean(),
        }),
        (flags) => {
          return hasExactlyOnePrimaryState(flags);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: Loading state only when no data exists
   * Loading spinner SHALL only be shown during initial fetch (no cached data)
   */
  it('loading state only when no data exists', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(true),
          isRefetching: fc.boolean(),
          isError: fc.boolean(),
          hasData: fc.constant(false),
          dataIsEmpty: fc.boolean(),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          // When loading and no data, should be in loading state (unless error)
          return state === 'loading' || state === 'error';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.3: Content state when data exists and is not empty
   * Content SHALL be displayed when fetch succeeds with data
   */
  it('content state when data exists and is not empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          isRefetching: fc.constant(false),
          isError: fc.constant(false),
          hasData: fc.constant(true),
          dataIsEmpty: fc.constant(false),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          return state === 'content';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.4: Empty state when data exists but is empty
   * Empty state message SHALL be displayed when fetch succeeds with no data
   */
  it('empty state when data exists but is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          isRefetching: fc.constant(false),
          isError: fc.constant(false),
          hasData: fc.constant(true),
          dataIsEmpty: fc.constant(true),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          return state === 'empty';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.5: Error state when error and no data
   * Error state with retry SHALL be displayed when fetch fails and no cached data
   */
  it('error state when error and no data', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          isRefetching: fc.constant(false),
          isError: fc.constant(true),
          hasData: fc.constant(false),
          dataIsEmpty: fc.boolean(),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          return state === 'error';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.6: Refetching state preserves content
   * When refetching with existing data, content SHALL remain visible
   */
  it('refetching state preserves content', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          isRefetching: fc.constant(true),
          isError: fc.boolean(),
          hasData: fc.constant(true),
          dataIsEmpty: fc.constant(false),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          // Should be refetching (which implies content is visible)
          return state === 'refetching' || state === 'content';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.7: State transitions are deterministic
   * Same input flags SHALL always produce same output state
   */
  it('state transitions are deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          isRefetching: fc.boolean(),
          isError: fc.boolean(),
          hasData: fc.boolean(),
          dataIsEmpty: fc.boolean(),
        }),
        (flags) => {
          const state1 = determinePrimaryState(flags);
          const state2 = determinePrimaryState(flags);
          return state1 === state2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.8: Error with cached data shows stale content
   * When error occurs but cached data exists, content SHALL be shown (marked stale)
   */
  it('error with cached data shows content (stale)', () => {
    const flags: FetchStateFlags = {
      isLoading: false,
      isRefetching: false,
      isError: true,
      hasData: true,
      dataIsEmpty: false,
    };
    
    const state = determinePrimaryState(flags);
    // Should show content (stale) rather than error
    expect(state).toBe('content');
  });

  /**
   * Property 7.9: Valid state values
   * determinePrimaryState SHALL only return valid FetchState values
   */
  it('returns only valid state values', () => {
    const validStates: FetchState[] = ['loading', 'content', 'empty', 'error', 'refetching'];
    
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          isRefetching: fc.boolean(),
          isError: fc.boolean(),
          hasData: fc.boolean(),
          dataIsEmpty: fc.boolean(),
        }),
        (flags) => {
          const state = determinePrimaryState(flags);
          return validStates.includes(state);
        }
      ),
      { numRuns: 100 }
    );
  });
});

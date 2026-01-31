/**
 * Property-Based Tests for Sync History Filtering
 * 
 * **Property 3: History Filtering Correctness**
 * For any combination of filters (entity type, status, date range), the sync history
 * table SHALL display only entries that match ALL applied filters. The result set
 * size SHALL be less than or equal to the unfiltered set size.
 * 
 * **Validates: Requirements 3.4, 3.5, 3.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Types matching the SyncHistoryPage
interface SyncHistoryEntry {
  syncId: string;
  entity: string;
  operation: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface HistoryFilters {
  entity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Arbitraries for generating test data
const statusArbitrary = fc.constantFrom('queued', 'running', 'completed', 'failed', 'skipped');
const entityArbitrary = fc.constantFrom('products', 'customers', 'orders', 'inventory', 'invoices');

// Generate valid ISO date strings
const dateStringArbitrary = fc.integer({ min: 2024, max: 2026 }).chain((year) =>
  fc.integer({ min: 1, max: 12 }).chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => {
      const m = month.toString().padStart(2, '0');
      const d = day.toString().padStart(2, '0');
      return `${year}-${m}-${d}T10:00:00.000Z`;
    })
  )
);

const syncHistoryEntryArbitrary: fc.Arbitrary<SyncHistoryEntry> = fc.record({
  syncId: fc.uuid(),
  entity: entityArbitrary,
  operation: fc.constantFrom('sync', 'import', 'export', 'backup'),
  status: statusArbitrary,
  recordsProcessed: fc.nat({ max: 10000 }),
  recordsFailed: fc.nat({ max: 100 }),
  startedAt: dateStringArbitrary,
  completedAt: fc.option(dateStringArbitrary),
  errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
});

/**
 * Filter sync history entries based on provided filters
 * This is the core filtering logic that should match the component implementation
 */
function filterHistory(entries: SyncHistoryEntry[], filters: HistoryFilters): SyncHistoryEntry[] {
  return entries.filter((entry) => {
    // Entity filter (case-insensitive partial match)
    if (filters.entity && !entry.entity.toLowerCase().includes(filters.entity.toLowerCase())) {
      return false;
    }
    
    // Status filter (exact match)
    if (filters.status && entry.status !== filters.status) {
      return false;
    }
    
    // Start date filter
    if (filters.startDate) {
      const entryDate = new Date(entry.startedAt).toISOString().split('T')[0];
      if (entryDate < filters.startDate) {
        return false;
      }
    }
    
    // End date filter
    if (filters.endDate) {
      const entryDate = new Date(entry.startedAt).toISOString().split('T')[0];
      if (entryDate > filters.endDate) {
        return false;
      }
    }
    
    return true;
  });
}

describe('Sync History Filtering - Property 3', () => {
  /**
   * Property 3.1: Filtered results are subset of unfiltered
   * The result set size SHALL be less than or equal to the unfiltered set size
   */
  it('filtered results are subset of unfiltered', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 0, maxLength: 50 }),
        fc.option(entityArbitrary),
        fc.option(statusArbitrary),
        (entries, entityFilter, statusFilter) => {
          const filters: HistoryFilters = {
            entity: entityFilter ?? undefined,
            status: statusFilter ?? undefined,
          };
          
          const filtered = filterHistory(entries, filters);
          
          // Filtered size should be <= original size
          return filtered.length <= entries.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: All filtered entries match ALL applied filters
   * Every entry in the result SHALL match all filter criteria
   */
  it('all filtered entries match all applied filters', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 1, maxLength: 50 }),
        fc.option(entityArbitrary),
        fc.option(statusArbitrary),
        (entries, entityFilter, statusFilter) => {
          const filters: HistoryFilters = {
            entity: entityFilter ?? undefined,
            status: statusFilter ?? undefined,
          };
          
          const filtered = filterHistory(entries, filters);
          
          // Every filtered entry should match all filters
          return filtered.every((entry) => {
            if (filters.entity && !entry.entity.toLowerCase().includes(filters.entity.toLowerCase())) {
              return false;
            }
            if (filters.status && entry.status !== filters.status) {
              return false;
            }
            return true;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: Empty filter returns all entries
   * When no filters are applied, all entries SHALL be returned
   */
  it('empty filter returns all entries', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 0, maxLength: 50 }),
        (entries) => {
          const filtered = filterHistory(entries, {});
          return filtered.length === entries.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: Entity filter is case-insensitive
   * Entity filter SHALL match regardless of case
   */
  it('entity filter is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 1, maxLength: 50 }),
        entityArbitrary,
        (entries, entity) => {
          const lowerFiltered = filterHistory(entries, { entity: entity.toLowerCase() });
          const upperFiltered = filterHistory(entries, { entity: entity.toUpperCase() });
          const mixedFiltered = filterHistory(entries, { entity });
          
          // All case variations should return same results
          return lowerFiltered.length === upperFiltered.length &&
                 upperFiltered.length === mixedFiltered.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: Date range filter is inclusive
   * Entries on the boundary dates SHALL be included
   */
  it('date range filter is inclusive', () => {
    const entry: SyncHistoryEntry = {
      syncId: 'test-1',
      entity: 'products',
      operation: 'sync',
      status: 'completed',
      recordsProcessed: 100,
      recordsFailed: 0,
      startedAt: '2025-06-15T10:00:00.000Z',
    };
    
    // Entry on start date should be included
    const startFiltered = filterHistory([entry], { startDate: '2025-06-15' });
    expect(startFiltered.length).toBe(1);
    
    // Entry on end date should be included
    const endFiltered = filterHistory([entry], { endDate: '2025-06-15' });
    expect(endFiltered.length).toBe(1);
    
    // Entry within range should be included
    const rangeFiltered = filterHistory([entry], { startDate: '2025-06-01', endDate: '2025-06-30' });
    expect(rangeFiltered.length).toBe(1);
  });

  /**
   * Property 3.6: Multiple filters are AND-ed together
   * Entry must match ALL filters to be included
   */
  it('multiple filters are AND-ed together', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 5, maxLength: 50 }),
        entityArbitrary,
        statusArbitrary,
        (entries, entity, status) => {
          const entityOnly = filterHistory(entries, { entity });
          const statusOnly = filterHistory(entries, { status });
          const both = filterHistory(entries, { entity, status });
          
          // Combined filter should be <= each individual filter
          return both.length <= entityOnly.length && both.length <= statusOnly.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.7: Filtering is idempotent
   * Applying the same filter twice should return same results
   */
  it('filtering is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(syncHistoryEntryArbitrary, { minLength: 0, maxLength: 50 }),
        fc.option(entityArbitrary),
        fc.option(statusArbitrary),
        (entries, entityFilter, statusFilter) => {
          const filters: HistoryFilters = {
            entity: entityFilter ?? undefined,
            status: statusFilter ?? undefined,
          };
          
          const filtered1 = filterHistory(entries, filters);
          const filtered2 = filterHistory(filtered1, filters);
          
          // Filtering already filtered results should return same results
          return filtered1.length === filtered2.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.8: Impossible filter returns empty
   * Filter that matches nothing SHALL return empty array
   */
  it('impossible filter returns empty', () => {
    const entries: SyncHistoryEntry[] = [
      {
        syncId: 'test-1',
        entity: 'products',
        operation: 'sync',
        status: 'completed',
        recordsProcessed: 100,
        recordsFailed: 0,
        startedAt: '2025-06-15T10:00:00.000Z',
      },
    ];
    
    // Filter for non-existent entity
    const filtered = filterHistory(entries, { entity: 'nonexistent_entity_xyz' });
    expect(filtered.length).toBe(0);
  });
});

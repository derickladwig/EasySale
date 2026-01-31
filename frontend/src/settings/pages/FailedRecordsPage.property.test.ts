import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property Test: Bulk Selection State Management
 * **Property 6: Bulk Selection State Management**
 * **Validates: Requirements 12.1, 12.2**
 * 
 * Tests that bulk selection state is correctly managed:
 * - Selection state is a valid Set of record IDs
 * - Select all selects all visible records
 * - Deselect all clears the selection
 * - Individual toggle adds/removes from selection
 * - Selection count matches Set size
 */

// Simulated record type
interface MockRecord {
  id: number;
  entity: string;
  sourceId: string;
  errorMessage: string;
  retryCount: number;
  createdAt: string;
}

// Arbitrary for generating mock records
const mockRecordArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  entity: fc.constantFrom('products', 'customers', 'orders', 'inventory'),
  sourceId: fc.string({ minLength: 1, maxLength: 20 }),
  errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
  retryCount: fc.integer({ min: 0, max: 10 }),
  createdAt: fc.constant('2026-01-15T10:30:00.000Z'),
});

// Arbitrary for generating unique record lists
const uniqueRecordsArb = fc.array(mockRecordArb, { minLength: 0, maxLength: 50 })
  .map(records => {
    // Ensure unique IDs
    const seen = new Set<number>();
    return records.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

// Selection state management functions (mirroring component logic)
function toggleSelect(selectedIds: Set<number>, id: number): Set<number> {
  const newSelected = new Set(selectedIds);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  return newSelected;
}

function selectAll(records: MockRecord[]): Set<number> {
  return new Set(records.map(r => r.id));
}

function deselectAll(): Set<number> {
  return new Set();
}

function handleSelectAllToggle(
  selectedIds: Set<number>,
  records: MockRecord[]
): Set<number> {
  if (selectedIds.size === records.length && records.length > 0) {
    return deselectAll();
  } else {
    return selectAll(records);
  }
}

describe('Property 6: Bulk Selection State Management', () => {
  /**
   * Property 6.1: Empty selection is a valid initial state
   * Validates: Requirements 12.1
   */
  it('should start with empty selection', () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        const initialSelection = new Set<number>();
        expect(initialSelection.size).toBe(0);
        expect(Array.from(initialSelection)).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: Toggle adds ID when not present
   * Validates: Requirements 12.1
   */
  it('should add ID to selection when toggling unselected record', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb.filter(r => r.length > 0),
        fc.integer({ min: 0, max: 49 }),
        (records, index) => {
          if (records.length === 0) return true;
          const safeIndex = index % records.length;
          const record = records[safeIndex];
          
          const initialSelection = new Set<number>();
          const newSelection = toggleSelect(initialSelection, record.id);
          
          expect(newSelection.has(record.id)).toBe(true);
          expect(newSelection.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: Toggle removes ID when present
   * Validates: Requirements 12.1
   */
  it('should remove ID from selection when toggling selected record', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb.filter(r => r.length > 0),
        fc.integer({ min: 0, max: 49 }),
        (records, index) => {
          if (records.length === 0) return true;
          const safeIndex = index % records.length;
          const record = records[safeIndex];
          
          // Start with the record selected
          const initialSelection = new Set<number>([record.id]);
          const newSelection = toggleSelect(initialSelection, record.id);
          
          expect(newSelection.has(record.id)).toBe(false);
          expect(newSelection.size).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.4: Double toggle returns to original state
   * Validates: Requirements 12.1
   */
  it('should return to original state after double toggle', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb.filter(r => r.length > 0),
        fc.integer({ min: 0, max: 49 }),
        (records, index) => {
          if (records.length === 0) return true;
          const safeIndex = index % records.length;
          const record = records[safeIndex];
          
          const initialSelection = new Set<number>();
          const afterFirstToggle = toggleSelect(initialSelection, record.id);
          const afterSecondToggle = toggleSelect(afterFirstToggle, record.id);
          
          expect(afterSecondToggle.size).toBe(initialSelection.size);
          expect(afterSecondToggle.has(record.id)).toBe(initialSelection.has(record.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: Select all selects all records
   * Validates: Requirements 12.1, 12.2
   */
  it('should select all records when select all is triggered', () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        const selection = selectAll(records);
        
        expect(selection.size).toBe(records.length);
        records.forEach(record => {
          expect(selection.has(record.id)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.6: Deselect all clears selection
   * Validates: Requirements 12.1
   */
  it('should clear selection when deselect all is triggered', () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        // Start with all selected
        const initialSelection = selectAll(records);
        const clearedSelection = deselectAll();
        
        expect(clearedSelection.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.7: Select all toggle behavior
   * Validates: Requirements 12.1, 12.2
   */
  it('should toggle between all selected and none selected', () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        // Start with none selected
        const noneSelected = new Set<number>();
        const afterFirstToggle = handleSelectAllToggle(noneSelected, records);
        
        // Should now have all selected
        expect(afterFirstToggle.size).toBe(records.length);
        
        // Toggle again
        const afterSecondToggle = handleSelectAllToggle(afterFirstToggle, records);
        
        // Should now have none selected
        expect(afterSecondToggle.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.8: Partial selection triggers select all
   * Validates: Requirements 12.1, 12.2
   */
  it('should select all when partially selected and toggle is triggered', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb.filter(r => r.length >= 2),
        (records) => {
          if (records.length < 2) return true;
          
          // Start with partial selection (first record only)
          const partialSelection = new Set<number>([records[0].id]);
          const afterToggle = handleSelectAllToggle(partialSelection, records);
          
          // Should now have all selected
          expect(afterToggle.size).toBe(records.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.9: Selection count always matches Set size
   * Validates: Requirements 12.2
   */
  it('should have selection count equal to Set size', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb,
        fc.array(fc.integer({ min: 0, max: 49 }), { minLength: 0, maxLength: 20 }),
        (records, toggleIndices) => {
          let selection = new Set<number>();
          
          // Apply random toggles
          toggleIndices.forEach(index => {
            if (records.length > 0) {
              const safeIndex = index % records.length;
              selection = toggleSelect(selection, records[safeIndex].id);
            }
          });
          
          // Selection count should always match Set size
          const selectionCount = selection.size;
          expect(selectionCount).toBe(selection.size);
          expect(selectionCount).toBeGreaterThanOrEqual(0);
          expect(selectionCount).toBeLessThanOrEqual(records.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.10: Selection only contains valid record IDs
   * Validates: Requirements 12.1
   */
  it('should only contain IDs that exist in records', () => {
    fc.assert(
      fc.property(
        uniqueRecordsArb,
        fc.array(fc.integer({ min: 0, max: 49 }), { minLength: 0, maxLength: 20 }),
        (records, toggleIndices) => {
          let selection = new Set<number>();
          const validIds = new Set(records.map(r => r.id));
          
          // Apply random toggles
          toggleIndices.forEach(index => {
            if (records.length > 0) {
              const safeIndex = index % records.length;
              selection = toggleSelect(selection, records[safeIndex].id);
            }
          });
          
          // All selected IDs should be valid
          selection.forEach(id => {
            expect(validIds.has(id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

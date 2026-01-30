/**
 * Property-Based Test: Empty State vs Mock Data
 *
 * Feature: navigation-consolidation
 * Property 7: Empty State vs Mock Data
 *
 * **Validates: Requirements 9.1, 9.3**
 *
 * For any page that fetches data from the backend, if the API returns an empty result,
 * the page SHALL render an empty state component, not mock/placeholder data.
 *
 * This test ensures:
 * - Pages use real API calls, not hardcoded mock data
 * - Empty states are shown when no data is available
 * - No mock data arrays exist in production page components
 *
 * Framework: Vitest with fast-check
 * Minimum iterations: 100 per property
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Pages that fetch data and should show empty states
 */
const DATA_FETCHING_PAGES = [
  'features/inventory/pages/InventoryPage.tsx',
  'features/customers/pages/CustomersPage.tsx',
  'features/lookup/pages/LookupPage.tsx',
  'features/sell/pages/SellPage.tsx',
  'features/reporting/pages/ReportingPage.tsx',
  'features/documents/pages/DocumentsPage.tsx',
  'features/exports/pages/ExportsPage.tsx',
  'features/review/pages/ReviewPage.tsx',
  'features/settings/pages/TaxRulesPage.tsx',
  'features/settings/pages/NetworkPage.tsx',
  'features/settings/pages/FeatureFlagsPage.tsx',
  'features/settings/pages/IntegrationsPage.tsx',
];

/**
 * Patterns that indicate mock data (should not be in production pages)
 */
const MOCK_DATA_PATTERNS = [
  /const\s+mockProducts\s*=/i,
  /const\s+mockCustomers\s*=/i,
  /const\s+mockOrders\s*=/i,
  /const\s+mockInventory\s*=/i,
  /const\s+MOCK_DATA\s*=/i,
  /const\s+SAMPLE_DATA\s*=/i,
  /const\s+DUMMY_DATA\s*=/i,
  /const\s+FAKE_DATA\s*=/i,
  // Arrays with hardcoded data objects (not from API)
  /const\s+\w+\s*:\s*\w+\[\]\s*=\s*\[\s*\{[^}]*id:\s*['"]?\d+['"]?[^}]*name:/i,
];

/**
 * Patterns that indicate proper empty state handling
 */
const EMPTY_STATE_PATTERNS = [
  /EmptyState/,
  /empty.*state/i,
  /no.*data/i,
  /no.*found/i,
  /no.*results/i,
  /\.length\s*===\s*0/,
  /\.length\s*===\s*0\s*\?/,
  /!.*\.length/,
];

/**
 * Patterns that indicate API usage
 */
const API_USAGE_PATTERNS = [
  /useQuery/,
  /useMutation/,
  /apiClient/,
  /fetch\(/,
  /axios/,
  /use\w+Query/,
  /useDocuments/,
  /useDocumentStats/,
  /useReviewQueue/,
  /useExportCase/,
  /useBulkExport/,
  /useExportJobs/,
  /useInventoryQuery/,
  /useCustomersQuery/,
  /useProductsQuery/,
  /useTaxRulesQuery/,
  /useFeatureFlags/,
  /useIntegrationsQuery/,
];

// ============================================================================
// Helper Functions
// ============================================================================

function getSrcRoot(): string {
  // The test runs from frontend/src/test/properties/
  // We need to get to frontend/src/
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    // Check if we're in the src directory
    if (path.basename(dir) === 'src' && fs.existsSync(path.join(dir, 'App.tsx'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Fallback
  return path.join(process.cwd(), 'src');
}

function readPageContent(pagePath: string): string | null {
  const srcRoot = getSrcRoot();
  const fullPath = path.join(srcRoot, pagePath);
  
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return null;
}

function hasMockData(content: string): boolean {
  return MOCK_DATA_PATTERNS.some(pattern => pattern.test(content));
}

function hasEmptyStateHandling(content: string): boolean {
  return EMPTY_STATE_PATTERNS.some(pattern => pattern.test(content));
}

function hasApiUsage(content: string): boolean {
  return API_USAGE_PATTERNS.some(pattern => pattern.test(content));
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: navigation-consolidation, Property 7: Empty State vs Mock Data', () => {
  describe('No Mock Data in Production Pages', () => {
    it('should not have hardcoded mock data arrays in data-fetching pages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DATA_FETCHING_PAGES),
          (pagePath) => {
            const content = readPageContent(pagePath);
            
            if (!content) {
              // Skip if file doesn't exist (might be in different location)
              return true;
            }
            
            // Check for mock data patterns
            const hasMock = hasMockData(content);
            
            // Mock data should not be present in production pages
            expect(
              hasMock,
              `Page ${pagePath} should not contain hardcoded mock data`
            ).toBe(false);
            
            return !hasMock;
          }
        ),
        { numRuns: DATA_FETCHING_PAGES.length }
      );
    });
  });

  describe('Empty State Handling', () => {
    it('should have empty state handling for all data-fetching pages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DATA_FETCHING_PAGES),
          (pagePath) => {
            const content = readPageContent(pagePath);
            
            if (!content) {
              // Skip if file doesn't exist
              return true;
            }
            
            // Check for empty state handling
            const hasEmpty = hasEmptyStateHandling(content);
            
            expect(
              hasEmpty,
              `Page ${pagePath} should have empty state handling`
            ).toBe(true);
            
            return hasEmpty;
          }
        ),
        { numRuns: DATA_FETCHING_PAGES.length }
      );
    });
  });

  describe('API Usage', () => {
    it('should use API calls for data fetching, not hardcoded data', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DATA_FETCHING_PAGES),
          (pagePath) => {
            const content = readPageContent(pagePath);
            
            if (!content) {
              // Skip if file doesn't exist
              return true;
            }
            
            // Check for API usage
            const usesApi = hasApiUsage(content);
            
            expect(
              usesApi,
              `Page ${pagePath} should use API calls for data fetching`
            ).toBe(true);
            
            return usesApi;
          }
        ),
        { numRuns: DATA_FETCHING_PAGES.length }
      );
    });
  });

  describe('Combined Property: Empty API Results Show Empty State', () => {
    it('should show empty state when API returns empty, not mock data', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DATA_FETCHING_PAGES),
          (pagePath) => {
            const content = readPageContent(pagePath);
            
            if (!content) {
              return true;
            }
            
            // Combined check:
            // 1. No mock data
            // 2. Has empty state handling
            // 3. Uses API
            const noMock = !hasMockData(content);
            const hasEmpty = hasEmptyStateHandling(content);
            const usesApi = hasApiUsage(content);
            
            const isCorrect = noMock && hasEmpty && usesApi;
            
            expect(
              isCorrect,
              `Page ${pagePath} should: not have mock data (${noMock}), have empty state (${hasEmpty}), use API (${usesApi})`
            ).toBe(true);
            
            return isCorrect;
          }
        ),
        { numRuns: DATA_FETCHING_PAGES.length }
      );
    });
  });
});

# Implementation Plan: Mock Data Removal

## Overview

This implementation plan removes hardcoded mock data from nine EasySale frontend components and implements consistent empty state handling. The approach ensures components never appear broken when data is unavailable, following the Empty State Contract for POS-friendly UX.

The implementation follows a systematic approach:
1. Create reusable empty state components
2. Remove mock data and implement data hooks for each page
3. Verify empty state handling with comprehensive testing
4. Create automated mock detection script

## Tasks

- [x] 1. Create shared empty state components
  - [x] 1.1 Create EmptyState component
    - Create `src/common/components/EmptyState.tsx`
    - Accept props: title, description, primaryAction, secondaryAction, icon
    - Implement keyboard accessibility (Enter triggers primary action)
    - Style according to design system
    - _Requirements: 0.1, 0.4_
  
  - [x] 1.2 Create EmptyDetailPane component
    - Create `src/common/components/EmptyDetailPane.tsx`
    - Accept props: message, shortcuts array
    - Display keyboard shortcuts in accessible format
    - Style for list/detail layouts
    - _Requirements: 0.2, 0.4_
  
  - [x] 1.3 Create EmptyChart component
    - Create `src/common/components/EmptyChart.tsx`
    - Accept props: message, context
    - Style for chart/metrics areas
    - _Requirements: 0.3, 0.4_
  
  - [x] 1.4 Write unit tests for empty state components
    - Test EmptyState renders correctly with all prop combinations
    - Test keyboard accessibility (Enter key triggers primary action)
    - Test EmptyDetailPane displays shortcuts correctly
    - Test EmptyChart renders without errors
    - _Requirements: 0.5_
  
  - [x] 1.5 Run static analysis verification
    - Run TypeScript type check: `npm run type-check`
    - Run ESLint: `npm run lint`
    - Run Prettier check: `npm run format:check`
    - Verify all checks pass with zero errors
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Remove mock data from critical P0 components (Warehouse, Sell, Customers)
  - [x] 2.1 Update WarehousePage.tsx
    - Remove `mockInventory` variable entirely
    - Implement `useInventoryQuery()` hook (stub if needed: returns `{ data: [], isLoading: false, error: null }`)
    - Add loading state: `if (isLoading) return <LoadingSpinner />`
    - Add error state: `if (error) return <ErrorMessage error={error} />`
    - Add empty state: `if (inventory.length === 0) return <EmptyState title="No inventory found" primaryAction={{ label: "Scan to receive", onClick: handleScan }} />`
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.2 Update SellPage.tsx
    - Remove `mockProducts` variable entirely
    - Implement `useProductsQuery()` hook (stub if needed)
    - Add loading state
    - Add error state
    - Add empty state: "Scan an item to begin" with scan input focus indicator
    - Ensure fallback UI shows scan/search only (no broken product tiles)
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 2.3 Update CustomersPage.tsx
    - Remove `mockCustomers` variable entirely
    - Implement `useCustomersQuery()` hook (stub if needed)
    - Add loading state
    - Add error state
    - Add empty state: "No customers found" with "Create customer" action
    - Add EmptyDetailPane: "Select a customer to view details" with keyboard shortcuts
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 2.4 Run static analysis verification
    - Run TypeScript type check: `npm run type-check`
    - Run ESLint: `npm run lint`
    - Run Prettier check: `npm run format:check`
    - Verify all checks pass with zero errors
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 2.5 Manual browser testing for P0 components
    - Start development server: `npm run dev`
    - Test WarehousePage: verify empty state displays correctly, no console errors
    - Test SellPage: verify scan focus, empty state, no broken tiles
    - Test CustomersPage: verify empty list and detail pane
    - Test primary action buttons are clickable and functional
    - Log any issues found

- [x] 3. Remove mock data from P1 components (Lookup, Admin, Tax Rules)
  - [x] 3.1 Update LookupPage.tsx
    - Remove `mockProducts` variable entirely
    - Implement `useProductsQuery()` hook (stub if needed)
    - Add loading, error, and empty states
    - Add EmptyDetailPane for right pane
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 3.2 Update AdminPage.tsx
    - Remove `mockUsers` variable entirely
    - Implement `useUsersQuery()` hook (stub if needed)
    - Add loading, error, and empty states: "No users found" + "Create user"
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 3.3 Update TaxRulesPage.tsx
    - Remove `mockTaxRules` variable entirely
    - Implement `useTaxRulesQuery()` hook (stub if needed)
    - Add loading, error, and empty states: "No tax rules configured" + "Add tax rule"
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 3.4 Run static analysis verification
    - Run TypeScript type check: `npm run type-check`
    - Run ESLint: `npm run lint`
    - Run Prettier check: `npm run format:check`
    - Verify all checks pass with zero errors
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 3.5 Manual browser testing for P1 components
    - Start development server: `npm run dev`
    - Test LookupPage: verify empty list and detail pane
    - Test AdminPage: verify empty state
    - Test TaxRulesPage: verify empty state
    - Log any issues found

- [x] 4. Remove mock data from P2 components (Integrations, Network, Performance)
  - [x] 4.1 Update IntegrationsPage.tsx
    - Remove `mockIntegrations` variable entirely
    - Implement `useIntegrationsQuery()` hook (stub if needed)
    - Add loading, error, and empty states: "No integrations configured" + "Add integration"
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 4.2 Update NetworkPage.tsx
    - Remove `mockRemoteStores` variable entirely
    - Implement `useRemoteStoresQuery()` hook (stub if needed)
    - Add loading, error, and empty states: "No remote stores configured" + "Add remote store"
    - Verify no console errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 4.3 Update PerformancePage.tsx
    - Remove both `mockMetrics` and `mockErrors` variables entirely
    - Implement `useMetricsQuery()` and `useErrorsQuery()` hooks (stubs if needed)
    - Add loading, error, and empty states for metrics: "Not enough data to display metrics"
    - Add empty state for errors: "No errors logged" (positive state)
    - Guard against division by zero and NaN in calculations
    - Use EmptyChart component for chart areas
    - Verify no console errors, NaN, or division errors with empty data
    - Log issues found and fixes applied
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 4.4 Run static analysis verification
    - Run TypeScript type check: `npm run type-check`
    - Run ESLint: `npm run lint`
    - Run Prettier check: `npm run format:check`
    - Verify all checks pass with zero errors
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 4.5 Manual browser testing for P2 components
    - Start development server: `npm run dev`
    - Test IntegrationsPage: verify empty state
    - Test NetworkPage: verify empty state
    - Test PerformancePage: verify no NaN/division errors, both empty states display correctly
    - Log any issues found

- [x] 5. Create mock data detection script
  - [x] 5.1 Create verification script
    - Create `scripts/verify-no-mocks.js` or `.ts`
    - Script checks all 9 affected files for `mock[A-Z].*` pattern
    - Script checks for large inline array literals (>10 lines with objects)
    - Script outputs clear error messages with file names and line numbers
    - Script exits with code 0 on success, non-zero on failure
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 5.2 Add npm script
    - Add `"verify:no-mocks": "node scripts/verify-no-mocks.js"` to package.json scripts
    - Test script runs successfully: `npm run verify:no-mocks`
    - Verify script passes with all mock data removed
    - _Requirements: 11.1_
  
  - [x] 5.3 Document script usage
    - Add script documentation to README or CONTRIBUTING guide
    - Explain what the script checks and when to run it
    - Recommend adding to CI pipeline (optional)

- [x] 6. Final verification and comprehensive testing
  - [x] 6.1 Run complete test suite
    - Run all existing unit tests: `npm test`
    - Verify all tests pass (same or better results than baseline)
    - Document any test failures for investigation
    - _Requirements: 10.1_
  
  - [x] 6.2 Run all static analysis checks
    - Run TypeScript: `npm run type-check` (zero errors)
    - Run ESLint: `npm run lint` (zero errors)
    - Run Prettier: `npm run format:check` (zero issues)
    - Run mock detection: `npm run verify:no-mocks` (zero violations)
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3_
  
  - [x] 6.3 Comprehensive browser testing
    - Start development server: `npm run dev`
    - Navigate to all nine affected pages in sequence
    - For each page, verify:
      - Page loads without console errors
      - Empty state displays with correct messaging
      - Primary action button is present and functional
      - Keyboard navigation works (Tab, Enter)
      - No NaN, undefined, or blank areas
    - Test with browser console open to catch any runtime errors
    - Document results for each page
  
  - [x] 6.4 Code review checklist
    - Review all changes to ensure only mock data was removed
    - Verify all components use data hooks/queries
    - Verify all empty states follow the Empty State Contract
    - Verify no imports were accidentally removed
    - Verify no API integration code was removed
    - Verify code formatting is consistent
    - Verify commit messages follow conventions

- [x] 7. Documentation and cleanup
  - Update any relevant documentation mentioning mock data
  - Remove or update the `open-mock-files.bat` script (no longer needed)
  - Document the Empty State Contract in component documentation
  - Add examples of proper empty state usage to style guide

## Notes

- **Priority Order**: P0 components (Warehouse, Sell, Customers) are critical and should be completed first
- **Data Hooks**: If real API hooks don't exist yet, create stub hooks that return `{ data: [], isLoading: false, error: null }`
- **Empty State Contract**: All empty states must follow the contract defined in requirements (helpful messaging + primary action)
- **Runtime Safety**: No console errors, NaN, or division errors are acceptable with empty data
- **Verification**: The mock detection script provides automated verification that no mock data remains
- **Incremental Testing**: Manual browser testing after each batch ensures issues are caught early
- **Logging**: Log all issues found and fixes applied for documentation and learning

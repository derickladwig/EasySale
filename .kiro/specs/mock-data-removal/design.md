# Design Document: Mock Data Removal

## Overview

This design specifies the approach for removing hardcoded mock data arrays from nine EasySale frontend components and implementing consistent empty state handling. The refactoring replaces direct mock data usage with data hooks/queries that default to empty arrays, while ensuring all components display helpful, actionable empty states rather than appearing broken.

The change involves two key improvements:
1. **Data Source Abstraction**: Replace `const mockData = [...]` with `const data = useDataQuery() ?? []`
2. **Empty State Contract**: Implement consistent, helpful UI when data is unavailable

This ensures the application transitions cleanly from development mode (with mock data) to production mode (relying on backend APIs) without appearing broken or unusable.

## Architecture

### Empty State Contract (POS-Friendly)

All components must implement consistent empty state handling following these rules:

**Lists and Tables:**
- Show message: "No [items] found" (e.g., "No inventory found")
- Show primary action: "Scan to receive", "Create customer", "Import products"
- If filters/search active: Show "Clear filters" button
- Keyboard accessible: Enter triggers primary action when appropriate

**Detail Panes:**
- Show message: "Select an item to view details"
- Show keyboard shortcuts: "Press F3 to search", "Press Ctrl+N to create"
- Never show blank/empty space without explanation

**Charts and Metrics:**
- Show message: "Not enough data to display chart"
- Never show NaN, undefined, or division errors
- Provide context: "Add transactions to see trends"

**Runtime Safety:**
- No console errors when arrays are empty
- No runtime exceptions from empty data
- All map/filter/reduce operations handle empty arrays gracefully

### Current State

Each affected component currently follows this pattern:

```typescript
// Example from WarehousePage.tsx
const mockInventory: InventoryItem[] = [
  { id: 1, name: "Product A", quantity: 100, ... },
  { id: 2, name: "Product B", quantity: 50, ... },
  // ... more mock items
];

// Component uses mockInventory directly
return <Table data={mockInventory} />;
```

### Target State

After refactoring, each component will follow this pattern:

```typescript
// Example from WarehousePage.tsx
const { data: inventory = [], isLoading, error } = useInventoryQuery();

// Component uses real data with empty state handling
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (inventory.length === 0) {
  return (
    <EmptyState
      title="No inventory found"
      description="Start by scanning items to receive or import your inventory"
      primaryAction={{ label: "Scan to receive", onClick: handleScan }}
      secondaryAction={{ label: "Import inventory", onClick: handleImport }}
    />
  );
}
return <Table data={inventory} />;
```

### Data Source Abstraction Pattern

**Key Principle**: Components should never reference mock data directly. Instead, use data hooks/queries that abstract the data source.

**Pattern:**
```typescript
// ❌ BAD: Direct mock data reference
const mockProducts = [...];
<ProductList products={mockProducts} />

// ✅ GOOD: Data hook abstraction
const { data: products = [] } = useProductsQuery();
<ProductList products={products} />
```

This pattern allows:
- Easy switching between mock and real data
- Consistent loading/error handling
- Future flexibility (caching, optimistic updates, etc.)

### Architectural Changes

This refactoring modifies:
- **Data sourcing**: Replace direct mock arrays with data hooks/queries
- **Empty state handling**: Add EmptyState components throughout
- **Error boundaries**: Ensure no crashes with empty data

This refactoring does NOT modify:
- Component structure or hierarchy
- API integration patterns (only how data is consumed)
- Type definitions or interfaces
- Business logic or calculations

## Components and Interfaces

### New Shared Components

**EmptyState Component:**
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}
```

**EmptyDetailPane Component:**
```typescript
interface EmptyDetailPaneProps {
  message: string;
  shortcuts?: Array<{ key: string; description: string }>;
}
```

**EmptyChart Component:**
```typescript
interface EmptyChartProps {
  message: string;
  context?: string;
}
```

### Affected Components and Required Empty States

The following nine components require mock data removal and empty state implementation:

1. **WarehousePage.tsx**
   - Remove: `mockInventory: InventoryItem[]`
   - Replace with: `useInventoryQuery()` hook
   - Empty state: "No inventory found" + "Scan to receive" action
   - Priority: P0 (critical for receiving/stock operations)

2. **SellPage.tsx**
   - Remove: `mockProducts: Product[]`
   - Replace with: `useProductsQuery()` hook
   - Empty state: "Scan an item to begin" + scan input focus indicator
   - Fallback: Scan/search only (no broken product tiles)
   - Priority: P0 (primary cashier workflow)

3. **LookupPage.tsx**
   - Remove: `mockProducts: Product[]`
   - Replace with: `useProductsQuery()` hook
   - Empty state: "No products found" + "Import products" action
   - Empty detail pane: "Select a product to view details"
   - Priority: P1

4. **CustomersPage.tsx**
   - Remove: `mockCustomers: Customer[]`
   - Replace with: `useCustomersQuery()` hook
   - Empty state: "No customers found" + "Create customer" action
   - Empty detail pane: "Select a customer to view details" + shortcuts
   - Priority: P0 (counter decisions require customer data)

5. **AdminPage.tsx**
   - Remove: `mockUsers: User[]`
   - Replace with: `useUsersQuery()` hook
   - Empty state: "No users found" + "Create user" action
   - Priority: P1

6. **TaxRulesPage.tsx**
   - Remove: `mockTaxRules: TaxRule[]`
   - Replace with: `useTaxRulesQuery()` hook
   - Empty state: "No tax rules configured" + "Add tax rule" action
   - Priority: P1

7. **IntegrationsPage.tsx**
   - Remove: `mockIntegrations: Integration[]`
   - Replace with: `useIntegrationsQuery()` hook
   - Empty state: "No integrations configured" + "Add integration" action
   - Priority: P2

8. **NetworkPage.tsx**
   - Remove: `mockRemoteStores: RemoteStore[]`
   - Replace with: `useRemoteStoresQuery()` hook
   - Empty state: "No remote stores configured" + "Add remote store" action
   - Priority: P2

9. **PerformancePage.tsx**
   - Remove: `mockMetrics: PerformanceMetric[]` and `mockErrors: ErrorLog[]`
   - Replace with: `useMetricsQuery()` and `useErrorsQuery()` hooks
   - Empty state (metrics): "Not enough data to display metrics"
   - Empty state (errors): "No errors logged" (positive state)
   - Must handle division by zero and NaN gracefully
   - Priority: P2

### Refactoring Pattern

For each component, the refactoring follows this pattern:

**Before:**
```typescript
const mockData: DataType[] = [
  { /* object 1 */ },
  { /* object 2 */ },
  // ... more objects
];

return <Component data={mockData} />;
```

**After:**
```typescript
const { data = [], isLoading, error } = useDataQuery();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (data.length === 0) {
  return <EmptyState title="No items found" primaryAction={...} />;
}

return <Component data={data} />;
```

## Data Models

No data model changes are required. All existing TypeScript interfaces and types remain unchanged:

- `InventoryItem`
- `Product`
- `Customer`
- `User`
- `TaxRule`
- `Integration`
- `RemoteStore`
- `PerformanceMetric`
- `ErrorLog`

These types are defined elsewhere in the codebase and are not affected by this refactoring.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

For this refactoring task, the correctness properties focus on verifying that the code changes are applied correctly and that code quality is maintained.

### Property 1: No Mock Data Identifiers Remain

*For all* nine affected component files, no identifiers matching the pattern `mock[A-Z].*` (e.g., `mockInventory`, `mockProducts`, `mockCustomers`) should exist in the code.

**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1**

### Property 2: All Components Handle Empty Data Without Errors

*For all* nine affected component files, when data arrays are empty, the component should:
- Render without throwing runtime exceptions
- Display no console errors
- Show appropriate empty state UI with helpful messaging
- Provide primary action buttons where applicable

**Validates: Requirements 1.4, 2.5, 3.5, 4.5, 5.4, 6.4, 7.4, 8.4, 9.5**

### Property 3: All Components Use Data Abstraction

*For all* nine affected component files, data should be sourced through hooks/queries (e.g., `useInventoryQuery()`) rather than direct variable references, with default empty array fallback.

**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2**

### Example Test Cases

The following example tests verify specific aspects of the refactoring:

**Example 1: TypeScript Compilation Success**
After all mock data is removed, running `npm run type-check` (or equivalent TypeScript compiler check) should complete with zero errors.

**Validates: Requirements 10.1**

**Example 2: ESLint Validation Success**
After all mock data is removed, running `npm run lint` should complete with zero errors.

**Validates: Requirements 10.2**

**Example 3: Prettier Formatting Success**
After all mock data is removed, running `npm run format:check` (or equivalent Prettier check) should complete with zero formatting issues.

**Validates: Requirements 10.3**

**Example 4: Mock Detection Script Success**
After all mock data is removed, running `npm run verify:no-mocks` should complete with exit code 0 and no violations found.

**Validates: Requirements 11.1, 11.2, 11.3**

**Example 5: Empty State Rendering**
When navigating to WarehousePage with no inventory data, the page should display "No inventory found" message with "Scan to receive" button, without console errors.

**Validates: Requirements 1.3, 1.4**

## Error Handling

This refactoring introduces new error handling requirements to ensure components never appear broken when data is unavailable.

### Empty State Handling

**Requirement**: All components must gracefully handle empty data arrays.

**Implementation**:
- Check array length before rendering lists/tables
- Display EmptyState component with helpful messaging
- Provide primary action to resolve empty state
- Ensure keyboard accessibility

**Example**:
```typescript
if (data.length === 0) {
  return <EmptyState title="No items found" primaryAction={...} />;
}
```

### Loading State Handling

**Requirement**: All components must show loading indicators while data is being fetched.

**Implementation**:
- Check `isLoading` flag from data hook
- Display LoadingSpinner or skeleton UI
- Prevent interaction during loading

**Example**:
```typescript
if (isLoading) return <LoadingSpinner />;
```

### Error State Handling

**Requirement**: All components must display user-friendly error messages when data fetching fails.

**Implementation**:
- Check `error` object from data hook
- Display ErrorMessage component with retry option
- Log error details for debugging

**Example**:
```typescript
if (error) return <ErrorMessage error={error} onRetry={refetch} />;
```

### Runtime Safety

**Requirement**: Components must not crash or show console errors with empty data.

**Implementation**:
- Use optional chaining: `data?.map(...)`
- Provide default values: `data ?? []`
- Guard against division by zero in calculations
- Handle NaN and undefined in charts

### Potential Issues

**Issue 1: Component Expects Non-Empty Array**
- **Scenario**: A component's logic assumes the array has at least one element
- **Mitigation**: Add empty state checks before rendering
- **Detection**: Runtime errors during testing with empty data

**Issue 2: Division by Zero in Calculations**
- **Scenario**: Metrics calculations divide by array length
- **Mitigation**: Check for zero before division, show "Not enough data" message
- **Detection**: NaN or Infinity values in UI

**Issue 3: Missing Data Hook Implementation**
- **Scenario**: Data hook doesn't exist yet for a component
- **Mitigation**: Create stub hook that returns empty array until API is ready
- **Detection**: TypeScript compilation errors

**Issue 4: Unused Variable Warnings**
- **Scenario**: ESLint flags removed mock variables
- **Mitigation**: This is expected and desired—mock variables should be removed
- **Detection**: ESLint warnings during linting

## Testing Strategy

This refactoring requires a dual testing approach combining automated verification and manual validation.

### Unit Tests

Unit tests are not required for this refactoring since we are not changing component behavior—only removing hardcoded data. However, existing unit tests should continue to pass after the refactoring.

**Verification Steps:**
1. Run existing test suite: `npm test`
2. Ensure all tests pass with the same results as before
3. If tests fail, investigate whether they depend on mock data

### Property-Based Tests

Property-based tests are not applicable for this refactoring since we are verifying static code structure rather than dynamic behavior. Instead, we use static analysis tools.

### Static Analysis Tests

The primary testing approach uses static analysis to verify code correctness:

**Test 1: Verify No Mock Identifiers Remain**
- **Tool**: Custom script `npm run verify:no-mocks`
- **Pattern**: Search for identifiers matching `mock[A-Z].*` pattern
- **Files**: All 9 affected component files
- **Success Criteria**: Zero matches found

**Test 2: Verify No Large Inline Arrays**
- **Tool**: Custom script `npm run verify:no-mocks`
- **Pattern**: Search for array literals with >10 lines of objects
- **Files**: All 9 affected component files
- **Success Criteria**: Zero matches found

**Test 3: TypeScript Compilation**
- **Tool**: TypeScript compiler (`tsc --noEmit` or `npm run type-check`)
- **Success Criteria**: Zero compilation errors

**Test 4: ESLint Validation**
- **Tool**: ESLint (`npm run lint`)
- **Success Criteria**: Zero linting errors (warnings are acceptable)

**Test 5: Prettier Formatting**
- **Tool**: Prettier (`npm run format:check`)
- **Success Criteria**: Zero formatting issues

### Integration Tests

Integration tests should verify that components function correctly with empty data and display appropriate empty states:

**Test Approach:**
1. Start the development server: `npm run dev`
2. Manually navigate to each affected page
3. Verify the page loads without console errors
4. Verify the page displays appropriate empty state UI with:
   - Clear messaging ("No items found")
   - Primary action button
   - Keyboard accessibility
5. Verify clicking primary action triggers expected behavior
6. If API integration exists, verify data loads from the backend

**Affected Pages and Expected Empty States:**
- **Warehouse page**: "No inventory found" + "Scan to receive" button
- **Sell page**: "Scan an item to begin" + scan input focus
- **Lookup page**: "No products found" + "Import products" button + empty detail pane
- **Customers page**: "No customers found" + "Create customer" button + empty detail pane
- **Admin page**: "No users found" + "Create user" button
- **Tax Rules page**: "No tax rules configured" + "Add tax rule" button
- **Integrations page**: "No integrations configured" + "Add integration" button
- **Network page**: "No remote stores configured" + "Add remote store" button
- **Performance page**: "Not enough data to display metrics" (no NaN/division errors)

### Manual Verification Checklist

After completing the refactoring, verify:

- [ ] All 9 files have been modified
- [ ] No `mock[A-Z].*` identifiers remain
- [ ] All components use data hooks/queries
- [ ] All components display appropriate empty states
- [ ] No console errors when viewing pages with empty data
- [ ] Primary action buttons are present and functional
- [ ] TypeScript compilation succeeds
- [ ] ESLint validation succeeds
- [ ] Prettier formatting succeeds
- [ ] All existing tests pass
- [ ] Mock detection script passes: `npm run verify:no-mocks`

### Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback**: Revert the commit using `git revert`
2. **Investigation**: Identify which component has issues
3. **Targeted Fix**: Restore mock data for problematic component only
4. **Re-test**: Verify the fix resolves the issue
5. **Re-deploy**: Apply the fix and redeploy

## Implementation Notes

### File Locations

All affected files are located in the frontend source directory:

```
src/renderer/pages/
├── WarehousePage.tsx      (Line 34: mockInventory)
├── SellPage.tsx           (Line 37: mockProducts)
├── LookupPage.tsx         (Line 28: mockProducts)
├── CustomersPage.tsx      (Line 35: mockCustomers)
├── AdminPage.tsx          (Line 59: mockUsers)
├── TaxRulesPage.tsx       (Line 17: mockTaxRules)
├── IntegrationsPage.tsx   (Line 19: mockIntegrations)
├── NetworkPage.tsx        (Line 17: mockRemoteStores)
└── PerformancePage.tsx    (Lines 21, 30: mockMetrics, mockErrors)
```

### Refactoring Approach

**Option 1: Manual Editing**
- Open each file individually
- Locate the mock data array
- Replace the array contents with `[]`
- Save and verify

**Option 2: Automated Script**
- Create a script to find and replace mock array contents
- Use regex to match array initialization patterns
- Preserve type annotations and variable names
- Run script and verify results

**Option 3: IDE Refactoring**
- Use IDE find-and-replace with regex
- Search for patterns like `= \[[\s\S]*?\];`
- Replace with `= [];`
- Review each change before applying

**Recommended Approach**: Option 1 (Manual Editing) for safety and precision, given the small number of files.

### Development Workflow

1. **Create Feature Branch**: `git checkout -b feat/remove-mock-data`
2. **Make Changes**: Edit each file to remove mock data
3. **Verify Locally**: Run TypeScript, ESLint, Prettier, and tests
4. **Test in Browser**: Start dev server and verify pages load
5. **Commit Changes**: `git commit -m "feat: remove mock data from frontend components"`
6. **Create Pull Request**: Submit for code review
7. **Merge**: After approval, merge to main branch

### Code Review Checklist

Reviewers should verify:

- [ ] Only mock data arrays were modified (no other code changes)
- [ ] All type annotations are preserved
- [ ] No imports were removed
- [ ] No API integration code was removed
- [ ] Changes match the specified line numbers
- [ ] Code formatting is consistent
- [ ] Commit message follows conventions

## Dependencies

### Build Tools
- **TypeScript**: For type checking
- **ESLint**: For linting
- **Prettier**: For code formatting
- **Vite**: For development server and builds

### No Runtime Dependencies

This refactoring does not introduce new runtime dependencies. All existing dependencies remain unchanged.

### No Backend Changes

This refactoring is frontend-only. No backend API changes are required.

## Timeline Estimate

- **Empty State Components**: 1-2 hours (create reusable components)
- **Refactoring**: 3-4 hours (update 9 files with data hooks + empty states)
- **Mock Detection Script**: 30 minutes (create verification script)
- **Testing**: 1-2 hours (run static analysis and manual verification)
- **Code Review**: 30 minutes
- **Total**: ~6-9 hours

This is a moderate-complexity refactoring task requiring careful attention to empty state UX and runtime safety.

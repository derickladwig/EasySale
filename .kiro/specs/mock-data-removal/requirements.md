# Requirements Document

## Introduction

This specification defines the requirements for removing hardcoded mock data arrays from the EasySale frontend application. Currently, nine frontend components contain mock data arrays that simulate backend responses during development. These mock arrays must be replaced with empty arrays to ensure the application relies exclusively on real data from the backend API.

This cleanup is essential for transitioning from development to production-ready code, ensuring data integrity, and preventing confusion between mock and real data.

## Glossary

- **Frontend**: The React + TypeScript + Vite application that provides the user interface
- **Backend**: The Rust with Actix-web server that provides REST APIs
- **Mock_Data**: Hardcoded arrays of sample data used during development
- **Component**: A React TypeScript file (.tsx) that renders UI elements
- **Empty_Array**: An array initialized with zero elements (e.g., `const data: Type[] = [];`)
- **API_Endpoint**: A backend REST endpoint that provides real data
- **Empty_State**: UI displayed when no data is available, showing helpful guidance and primary actions
- **Primary_Action**: The main action a user should take when viewing an empty state (e.g., "Scan item", "Create customer")

## Empty State Contract

All components must implement consistent empty state handling to ensure the application never appears broken or unusable when data is unavailable.

### Empty State Rules

**For Lists and Tables:**
- Display message: "No [items] found" (e.g., "No inventory found", "No customers found")
- Show primary action button: "Scan to receive", "Create customer", "Import products", etc.
- If filters/search are active: Show "Clear filters" or "Reset search" option
- Ensure keyboard accessibility: Enter key triggers primary action when appropriate

**For Detail Panes:**
- Display message: "Select an item to view details" or "Select a [type] from the list"
- Show keyboard shortcuts if applicable (e.g., "Press F3 to search")
- Never show blank/empty space without explanation

**For Charts and Metrics:**
- Display message: "Not enough data to display chart"
- Never show NaN, undefined, or division errors
- Provide context: "Add transactions to see trends"

**Runtime Safety:**
- No console errors when arrays are empty
- No runtime exceptions from empty data
- All map/filter/reduce operations must handle empty arrays gracefully

## Requirements

### Requirement 0: Implement Empty State Components

**User Story:** As a developer, I want reusable empty state components, so that all pages display consistent, helpful messages when data is unavailable.

#### Acceptance Criteria

1. THE Frontend SHALL provide an `EmptyState` component accepting: title, description, primaryAction, secondaryAction (optional)
2. THE Frontend SHALL provide an `EmptyDetailPane` component for list/detail layouts with keyboard shortcut hints
3. THE Frontend SHALL provide an `EmptyChart` component for data visualization areas
4. WHEN rendered, empty state components SHALL be keyboard accessible and follow WCAG guidelines
5. THE Frontend SHALL include unit tests for all empty state components

### Requirement 1: Remove Mock Data from Warehouse Component

**User Story:** As a developer, I want to remove mock inventory data from WarehousePage.tsx, so that the warehouse view displays real inventory from the backend API.

#### Acceptance Criteria

1. WHEN WarehousePage.tsx is loaded with no data, THE Frontend SHALL remove the `mockInventory` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useInventoryQuery()`) that returns empty array by default
3. WHEN inventory data is empty, THE Frontend SHALL display: "No inventory found" with primary action "Scan to receive" or "Add inventory"
4. THE Frontend SHALL not crash or show console errors with empty inventory
5. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 2: Remove Mock Data from Sales Component

**User Story:** As a developer, I want to remove mock product data from SellPage.tsx, so that the sales interface displays real products from the backend API.

#### Acceptance Criteria

1. WHEN SellPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockProducts` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useProductsQuery()`) that returns empty array by default
3. WHEN product data is empty, THE Frontend SHALL display: "Scan an item to begin" with scan input focus indicator
4. THE Frontend SHALL show fallback UI: scan/search only (no broken product tiles)
5. THE Frontend SHALL not crash or show console errors with empty products
6. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 3: Remove Mock Data from Lookup Component

**User Story:** As a developer, I want to remove mock product data from LookupPage.tsx, so that the product lookup displays real products from the backend API.

#### Acceptance Criteria

1. WHEN LookupPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockProducts` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useProductsQuery()`) that returns empty array by default
3. WHEN product data is empty, THE Frontend SHALL display: "No products found" with primary action "Import products" or "Add product"
4. THE Frontend SHALL show empty detail pane with message: "Select a product to view details"
5. THE Frontend SHALL not crash or show console errors with empty products
6. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 4: Remove Mock Data from Customers Component

**User Story:** As a developer, I want to remove mock customer data from CustomersPage.tsx, so that the customer management view displays real customers from the backend API.

#### Acceptance Criteria

1. WHEN CustomersPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockCustomers` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useCustomersQuery()`) that returns empty array by default
3. WHEN customer data is empty, THE Frontend SHALL display: "No customers found" with primary action "Create customer" or "Import customers"
4. THE Frontend SHALL show empty detail pane with message: "Select a customer to view details" and keyboard shortcuts
5. THE Frontend SHALL not crash or show console errors with empty customers
6. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 5: Remove Mock Data from Admin Component

**User Story:** As a developer, I want to remove mock user data from AdminPage.tsx, so that the admin panel displays real users from the backend API.

#### Acceptance Criteria

1. WHEN AdminPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockUsers` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useUsersQuery()`) that returns empty array by default
3. WHEN user data is empty, THE Frontend SHALL display: "No users found" with primary action "Create user" or "Invite user"
4. THE Frontend SHALL not crash or show console errors with empty users
5. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 6: Remove Mock Data from Tax Rules Component

**User Story:** As a developer, I want to remove mock tax rules data from TaxRulesPage.tsx, so that the tax configuration displays real tax rules from the backend API.

#### Acceptance Criteria

1. WHEN TaxRulesPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockTaxRules` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useTaxRulesQuery()`) that returns empty array by default
3. WHEN tax rules data is empty, THE Frontend SHALL display: "No tax rules configured" with primary action "Add tax rule"
4. THE Frontend SHALL not crash or show console errors with empty tax rules
5. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 7: Remove Mock Data from Integrations Component

**User Story:** As a developer, I want to remove mock integrations data from IntegrationsPage.tsx, so that the integrations view displays real integration configurations from the backend API.

#### Acceptance Criteria

1. WHEN IntegrationsPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockIntegrations` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useIntegrationsQuery()`) that returns empty array by default
3. WHEN integrations data is empty, THE Frontend SHALL display: "No integrations configured" with primary action "Add integration"
4. THE Frontend SHALL not crash or show console errors with empty integrations
5. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 8: Remove Mock Data from Network Component

**User Story:** As a developer, I want to remove mock remote stores data from NetworkPage.tsx, so that the network configuration displays real remote stores from the backend API.

#### Acceptance Criteria

1. WHEN NetworkPage.tsx is loaded with no data, THE Frontend SHALL remove the `mockRemoteStores` variable entirely
2. THE Frontend SHALL use a data hook or query (e.g., `useRemoteStoresQuery()`) that returns empty array by default
3. WHEN remote stores data is empty, THE Frontend SHALL display: "No remote stores configured" with primary action "Add remote store"
4. THE Frontend SHALL not crash or show console errors with empty remote stores
5. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 9: Remove Mock Data from Performance Component

**User Story:** As a developer, I want to remove mock metrics and errors data from PerformancePage.tsx, so that the performance dashboard displays real metrics from the backend API.

#### Acceptance Criteria

1. WHEN PerformancePage.tsx is loaded with no data, THE Frontend SHALL remove both `mockMetrics` and `mockErrors` variables entirely
2. THE Frontend SHALL use data hooks or queries (e.g., `useMetricsQuery()`, `useErrorsQuery()`) that return empty arrays by default
3. WHEN metrics data is empty, THE Frontend SHALL display: "Not enough data to display metrics" with context message
4. WHEN errors data is empty, THE Frontend SHALL display: "No errors logged" (this is a positive state)
5. THE Frontend SHALL not crash, show NaN, or display division errors with empty data
6. THE Frontend SHALL maintain all existing API integration code and data fetching logic

### Requirement 10: Maintain Code Quality

**User Story:** As a developer, I want to ensure code quality is maintained after mock data removal, so that the application remains stable and follows TypeScript best practices.

#### Acceptance Criteria

1. WHEN mock data is removed, THE Frontend SHALL pass all TypeScript type checks without errors
2. WHEN mock data is removed, THE Frontend SHALL pass all ESLint checks without errors
3. THE Frontend SHALL maintain consistent code formatting according to Prettier configuration
4. THE Frontend SHALL preserve all existing imports and type definitions

### Requirement 11: Implement Mock Data Detection Script

**User Story:** As a developer, I want an automated script to detect remaining mock data, so that I can ensure complete removal and prevent future mock data from being committed.

#### Acceptance Criteria

1. THE Frontend SHALL provide a script `npm run verify:no-mocks` that checks all affected files
2. THE script SHALL fail if any identifiers matching `mock[A-Z].*` pattern remain in the affected files
3. THE script SHALL fail if any large inline array literals (>10 lines) of objects are found in affected files
4. THE script SHALL output clear error messages indicating which files contain violations
5. THE script SHALL exit with code 0 on success, non-zero on failure

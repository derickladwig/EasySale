# Feature Flags Implementation - E2E Tests

This document describes the E2E tests created for the feature-flags-implementation spec (Task P2-3).

## Overview

Four comprehensive E2E test suites have been created to test the following features:
1. Appointment Scheduling
2. Time Tracking
3. Estimate Generation
4. Theme Changes

All tests follow EasySale patterns and use semantic tokens only (no hardcoded colors).

---

## Test Files

### 1. appointment-scheduling.spec.ts

**Status**: ✅ Already existed, verified complete

**Test Coverage** (10 tests):
- Display calendar with current month
- Create new appointment
- Switch between calendar views (month/week/day)
- Navigate between dates
- Edit existing appointment
- Handle module flag (redirect when disabled)
- Validate required fields
- Display loading state
- Display error state

**Key Features Tested**:
- Calendar grid rendering
- Appointment CRUD operations
- Drag-and-drop rescheduling
- Configuration integration
- Module flag enforcement
- Form validation
- Error handling

---

### 2. time-tracking.spec.ts

**Status**: ✅ Created

**Test Coverage** (16 tests):
- Display time tracking dashboard
- Clock in successfully
- Clock out successfully
- Create manual time entry
- Display today hours summary
- Display week hours summary
- Switch between tabs (dashboard/entries/reports)
- Generate time report
- Export time report to CSV
- Handle module flag (redirect when disabled)
- Validate manual entry required fields
- Display loading state
- Display error state
- Track breaks when enabled
- Display recent time entries
- Use semantic tokens for styling

**Key Features Tested**:
- Clock in/out functionality
- Manual time entry
- Time tracking dashboard
- Time reports generation
- CSV export
- Break tracking
- Tab navigation
- Module flag enforcement
- Form validation
- Semantic token usage

---

### 3. estimate-generation.spec.ts

**Status**: ✅ Created

**Test Coverage** (18 tests):
- Display estimates list page
- Create new estimate
- Filter estimates by status
- View estimate details
- Edit existing estimate
- Generate PDF export
- Convert estimate to invoice
- Convert estimate to work order
- Update estimate status
- Calculate totals correctly
- Handle module flag (redirect when disabled)
- Validate required fields
- Display loading state
- Display error state
- Display empty state
- Use semantic tokens for styling
- Add and remove line items
- Apply discount to estimate

**Key Features Tested**:
- Estimate CRUD operations
- PDF generation
- Estimate conversion (to invoice/work order)
- Status management
- Line item management
- Discount application
- Total calculations
- Module flag enforcement
- Form validation
- Semantic token usage

---

### 4. theme-changes.spec.ts

**Status**: ✅ Created

**Test Coverage** (18 tests):
- Display branding settings page
- Switch between light and dark mode
- Change accent color
- Persist theme changes across page refresh
- Apply theme changes to entire app
- Use ThemeEngine for theme changes (no direct DOM manipulation)
- Respect theme locks
- Show theme preview before applying
- Reset theme to defaults
- Export theme configuration
- Import theme configuration
- Validate theme configuration
- Show theme scope hierarchy
- Apply contrast adjustments
- Use semantic tokens throughout app
- Handle theme changes without page flash
- Apply theme to wizard screens
- Cache theme in localStorage
- Load theme before React renders

**Key Features Tested**:
- Theme mode switching (light/dark)
- Accent color changes
- Theme persistence
- ThemeEngine integration (no direct DOM manipulation)
- Theme locks and scope hierarchy
- Theme preview
- Theme import/export
- Contrast adjustments
- Semantic token usage
- Theme caching
- Flash prevention

---

## Compliance with GLOBAL_RULES_EASYSALE.md

All E2E tests follow the EasySale global rules:

### ✅ Branding
- No hardcoded product names (FlexiPOS, CAPS POS)
- All references use "EasySale"

### ✅ Theming & Styling
- Tests verify semantic token usage
- Tests check for absence of hardcoded Tailwind base colors
- Tests verify ThemeEngine usage (no direct DOM manipulation)
- Tests validate theme system compliance

### ✅ Theme System Testing
- Theme changes route through ThemeEngine
- No direct `root.style.setProperty()` calls
- Theme locks enforced
- Scope precedence respected
- Theme persists across page refresh
- Theme loads without flash

### ✅ Module Flags
- All tests verify module flag enforcement
- Tests confirm redirect to dashboard when module disabled
- Tests validate feature visibility based on configuration

---

## Running the Tests

### Run All Feature Flag E2E Tests

```bash
# Run all new E2E tests
npx playwright test appointment-scheduling.spec.ts time-tracking.spec.ts estimate-generation.spec.ts theme-changes.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test time-tracking.spec.ts

# Run in specific browser
npx playwright test theme-changes.spec.ts --project=chromium
```

### Run Individual Test Suites

```bash
# Appointment scheduling
npx playwright test appointment-scheduling.spec.ts

# Time tracking
npx playwright test time-tracking.spec.ts

# Estimate generation
npx playwright test estimate-generation.spec.ts

# Theme changes
npx playwright test theme-changes.spec.ts
```

### Debug Mode

```bash
# Debug specific test
npx playwright test time-tracking.spec.ts --debug

# Debug with UI
npx playwright test --ui
```

---

## Test Execution Requirements

### Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   cd frontend
   npx playwright install
   ```

2. **Development server must be running**:
   ```bash
   npm run dev
   ```
   
   Or configure Playwright to start the server automatically (already configured in `playwright.config.ts`).

### Environment

- **Base URL**: `http://localhost:5173`
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Browsers**: Chromium, Firefox, WebKit

### Test Data

Tests use mock credentials:
- Admin: `admin@example.com` / `admin123`
- User: `test@example.com` / `password`

Tests may require:
- Mock API responses (configured via `page.route()`)
- Test database with sample data
- Module flags enabled in configuration

---

## Test Patterns Used

### 1. Module Flag Testing

All tests verify module flag enforcement:

```typescript
test('should handle module flag - redirect when disabled', async ({ page }) => {
  await page.route('**/api/config', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.modules.timeTracking = { enabled: false };
    await route.fulfill({ json });
  });
  
  await page.goto('/time-tracking');
  await page.waitForURL('/');
});
```

### 2. Semantic Token Validation

Tests verify no hardcoded colors:

```typescript
test('should use semantic tokens for styling', async ({ page }) => {
  await page.waitForSelector('h1:has-text("Time Tracking")');
  const html = await page.content();
  
  expect(html).not.toContain('text-blue-');
  expect(html).not.toContain('text-gray-');
  expect(html).not.toContain('bg-gray-');
});
```

### 3. Loading and Error States

Tests verify proper state handling:

```typescript
test('should display loading state', async ({ page }) => {
  await page.route('**/api/time-entries*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });
  
  await expect(page.locator('text=Loading time entries...')).toBeVisible();
});
```

### 4. Form Validation

Tests verify required field validation:

```typescript
test('should validate required fields', async ({ page }) => {
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=Date is required')).toBeVisible();
});
```

---

## Acceptance Criteria

### ✅ Appointment Scheduling Tested End-to-End
- Calendar displays appointments correctly
- Drag-and-drop rescheduling works
- Appointment creation wizard functional
- Appointment editing and cancellation work
- Configuration settings respected
- Module flag controls visibility

### ✅ Time Tracking Tested End-to-End
- Clock in/out functional
- Manual time entry works
- Time tracking dashboard displays correctly
- Time reports generate accurately
- Module flag controls visibility

### ✅ Estimate Generation Tested End-to-End
- Estimate creation functional
- Estimate editing works
- PDF export generates correctly
- Estimate conversion to invoice/work order works
- Module flag controls visibility

### ✅ Theme Changes Tested End-to-End
- Theme mode switching works
- Accent color changes apply
- Theme persists across page refresh
- Theme changes propagate to entire app
- ThemeEngine used (no direct DOM manipulation)
- Theme locks enforced
- Semantic tokens used throughout

---

## Known Limitations

1. **Server Dependency**: Tests require development server to be running
2. **Test Data**: Some tests may require specific test data in the database
3. **Timing**: Some tests use `waitForTimeout()` which may be flaky
4. **Mock APIs**: Some tests mock API responses for testing edge cases

---

## Future Improvements

1. **Page Object Model**: Create page objects for complex pages
2. **Test Helpers**: Extract common patterns into reusable helpers
3. **Visual Regression**: Add visual regression tests for theme changes
4. **Performance Testing**: Add performance assertions for theme changes
5. **Accessibility Testing**: Add accessibility checks using axe-core

---

## Related Documentation

- [E2E Tests README](./README.md)
- [Playwright Configuration](../playwright.config.ts)
- [Feature Flags Spec](.kiro/specs/feature-flags-implementation/)
- [GLOBAL_RULES_EASYSALE.md](../GLOBAL_RULES_EASYSALE.md)

---

*Last updated: 2026-01-30*

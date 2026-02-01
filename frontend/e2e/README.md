# End-to-End Tests

This directory contains Playwright end-to-end tests for the EasySale system.

## Overview

E2E tests verify complete user workflows across the entire application stack, from the UI through the backend API to the database. These tests ensure that critical paths work correctly in a production-like environment.

## Test Structure

```
e2e/
├── login.spec.ts                  # Login and authentication flows
├── pos-workflow.spec.ts           # Complete POS transaction workflows
├── appointment-scheduling.spec.ts # Appointment calendar and scheduling
├── time-tracking.spec.ts          # Time tracking and clock in/out
├── estimate-generation.spec.ts    # Estimate creation and PDF generation
├── theme-changes.spec.ts          # Theme system and branding changes
├── settings-module.spec.ts        # Settings module core workflows
├── settings-advanced.spec.ts      # Settings module advanced scenarios
├── visual-regression.spec.ts      # Visual regression tests
├── helpers/
│   └── settings-helpers.ts        # Reusable test helpers for Settings
└── README.md                      # This file
```

## Running Tests

### Prerequisites

1. Install Playwright browsers (first time only):
   ```bash
   npx playwright install
   ```

2. Ensure the development server is running:
   ```bash
   npm run dev
   ```

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test login.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View Test Reports

```bash
# Show HTML report
npm run test:e2e:report

# Or open directly
npx playwright show-report
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.getByLabel('Username').fill('admin');
    
    // Act
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Assert
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Best Practices

1. **Use Semantic Selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for Elements**: Use `await expect().toBeVisible()` instead of `waitForTimeout`
3. **Test User Flows**: Focus on complete workflows, not individual components
4. **Keep Tests Independent**: Each test should be able to run in isolation
5. **Use Page Object Model**: For complex pages, create page objects
6. **Handle Async Operations**: Always await async operations
7. **Test Accessibility**: Use `getByRole` to ensure accessible markup

### Common Patterns

**Login Helper**:
```typescript
async function login(page, username, password) {
  await page.goto('/');
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}
```

**Wait for API Response**:
```typescript
await page.waitForResponse(response => 
  response.url().includes('/api/products') && response.status() === 200
);
```

**Handle Dialogs**:
```typescript
page.on('dialog', dialog => dialog.accept());
await page.getByRole('button', { name: 'Delete' }).click();
```

## Test Coverage

### Critical Paths

1. **Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Logout
   - Session persistence

2. **POS Workflow**
   - Search products
   - Add to cart
   - Apply discounts
   - Process payment
   - Print receipt

3. **Offline Mode**
   - Queue transactions offline
   - Sync when back online
   - Handle conflicts

4. **Returns**
   - Lookup receipt
   - Process return
   - Refund payment

5. **Settings Module - User Management**
   - Display users list with filters
   - Create new user with store/station assignment
   - Edit existing user
   - Bulk store assignment
   - Validate required fields
   - Enforce POS role requirements

6. **Settings Module - Settings Search**
   - Search and navigate to settings
   - Show recent searches
   - Handle fuzzy matching

7. **Settings Module - Effective Settings**
   - Display effective settings view
   - Show setting source hierarchy
   - Export effective settings
   - Display current context

8. **Settings Module - Audit Log**
   - Display audit log entries
   - Filter by entity type and date range
   - Display before/after values
   - Export audit log to CSV

9. **Settings Module - Hardware Configuration**
   - Display hardware configuration sections
   - Configure receipt printer
   - Test printer connection
   - Configure barcode scanner
   - Configure payment terminal
   - Display hardware status
   - Apply hardware templates

10. **Settings Module - Integrations**
    - Display available integrations
    - Enable and configure integrations
    - Test integration connection
    - Display sync status
    - Configure sync settings
    - Disable integration
    - View integration error logs

11. **Appointment Scheduling**
    - Display calendar with month/week/day views
    - Create new appointment
    - Edit existing appointment
    - Switch between calendar views
    - Navigate between dates
    - Validate required fields
    - Handle module flag (redirect when disabled)
    - Display loading and error states

12. **Time Tracking**
    - Display time tracking dashboard
    - Clock in/out functionality
    - Create manual time entry
    - Display today's and week's hours summary
    - Switch between dashboard/entries/reports tabs
    - Generate time reports
    - Export time report to CSV
    - Track breaks when enabled
    - Validate required fields
    - Handle module flag (redirect when disabled)

13. **Estimate Generation**
    - Display estimates list page
    - Create new estimate with line items
    - Filter estimates by status
    - View estimate details
    - Edit existing estimate
    - Generate PDF export
    - Convert estimate to invoice
    - Convert estimate to work order
    - Update estimate status
    - Calculate totals correctly
    - Add and remove line items
    - Apply discounts
    - Validate required fields
    - Handle module flag (redirect when disabled)

14. **Theme Changes**
    - Display branding settings page
    - Switch between light and dark mode
    - Change accent color
    - Persist theme changes across page refresh
    - Apply theme changes to entire app
    - Use ThemeEngine (no direct DOM manipulation)
    - Respect theme locks
    - Show theme preview before applying
    - Reset theme to defaults
    - Export/import theme configuration
    - Validate theme configuration
    - Show theme scope hierarchy
    - Apply contrast adjustments
    - Use semantic tokens throughout app
    - Handle theme changes without page flash
    - Apply theme to wizard screens
    - Cache theme in localStorage
    - Load theme before React renders

### Edge Cases

- Empty form submissions
- Network errors
- Concurrent operations
- Large datasets
- Mobile viewports

## Debugging Tests

### Debug Mode

```bash
# Run in debug mode (opens inspector)
npm run test:e2e:debug

# Debug specific test
npx playwright test login.spec.ts --debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshot at point of failure
- Video of entire test run
- Trace file for detailed debugging

View in test report:
```bash
npm run test:e2e:report
```

### Console Logs

View browser console logs:
```typescript
page.on('console', msg => console.log(msg.text()));
```

### Network Requests

Monitor network activity:
```typescript
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

## CI/CD Integration

E2E tests run automatically in CI:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Performance

### Test Execution Time

- **Target**: < 5 minutes for full suite
- **Current**: ~2 minutes (varies by machine)

### Optimization Tips

1. Run tests in parallel (default)
2. Use `fullyParallel: true` in config
3. Minimize `waitForTimeout` usage
4. Reuse authentication state
5. Mock external APIs when possible

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check Node.js version matches CI
- Clear browser cache: `npx playwright install --force`
- Check for timing issues (add explicit waits)

### Flaky Tests

- Add explicit waits for async operations
- Use `toBeVisible()` instead of checking existence
- Increase timeout for slow operations
- Check for race conditions

### Browser Not Found

```bash
# Reinstall browsers
npx playwright install
```

### Port Already in Use

```bash
# Kill process on port 5173
npx kill-port 5173
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Contributing

When adding new E2E tests:

1. Follow existing test structure
2. Use descriptive test names
3. Add comments for complex workflows
4. Update this README if adding new test files
5. Ensure tests pass locally before committing
6. Keep tests fast and focused

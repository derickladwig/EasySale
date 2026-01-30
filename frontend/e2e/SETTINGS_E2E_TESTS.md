# Settings Module E2E Tests

## Overview

Comprehensive end-to-end tests for the Settings module, covering all major workflows and requirements from the settings-consolidation specification.

## Test Coverage

### Test Files

1. **settings-module.spec.ts** - Core workflows (205 tests across 5 browsers)
   - User Management
   - Settings Search
   - Effective Settings View
   - Audit Log
   - Hardware Configuration
   - Integrations
   - Navigation and Consistency

2. **settings-advanced.spec.ts** - Advanced scenarios (130 tests across 5 browsers)
   - Advanced User Management (validation, edge cases)
   - Advanced Hardware Configuration (error handling)
   - Advanced Integration Scenarios (API validation, OAuth)
   - Performance and Stress Tests
   - Accessibility Tests

3. **helpers/settings-helpers.ts** - Reusable test utilities
   - Login helpers
   - Navigation helpers
   - User creation helpers
   - Hardware configuration helpers
   - Integration configuration helpers
   - Validation helpers

### Total Test Count

- **335 tests** across all browsers (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- **67 unique test scenarios**
- **6 test suites**

## Requirements Coverage

### Requirement 1.1: Settings Information Architecture ✅
- Navigate between settings tabs
- Display consistent page layout
- Show scope badges

### Requirement 2.1: Users & Roles Management ✅
- Display users list with filters
- Search users
- Filter by status, role, assignments
- Bulk operations

### Requirement 2.7: Store Assignment ✅
- Create user with store assignment
- Validate store requirement for POS roles
- Bulk assign store

### Requirement 2.8: Station Policy ✅
- Configure station policy (any, specific, none)
- Validate station requirements

### Requirement 8.3: Audit Logging ✅
- Display audit log entries
- Filter by entity type and date range
- Display before/after values
- Export audit log to CSV
- Search audit log

### Requirement 10.1: Settings Search ✅
- Search and navigate to settings
- Show recent searches
- Handle fuzzy matching

### Requirement 11.1: Effective Settings View ✅
- Display effective settings
- Show setting source hierarchy
- Export effective settings
- Display current context

### Requirement 16.1: Integrations ✅
- Display available integrations
- Enable and configure integrations
- Test integration connection
- Display sync status
- Configure sync settings
- Disable integration
- View integration error logs

### Requirement 21.1: Hardware Configuration ✅
- Display hardware configuration sections
- Configure receipt printer
- Configure label printer
- Configure barcode scanner
- Configure cash drawer
- Configure payment terminal
- Test hardware connection
- Display hardware status
- Apply hardware templates

## Test Scenarios

### User Management (18 scenarios)

#### Core Workflows
1. Display users list with filters
2. Create new user with store and station assignment
3. Filter users by status
4. Search users by username
5. Edit existing user
6. Perform bulk store assignment
7. Show warning for users with missing assignments
8. Validate required fields
9. Prevent saving POS role without store assignment

#### Advanced Scenarios
10. Handle concurrent user edits gracefully
11. Validate email format
12. Validate password strength
13. Validate password confirmation match
14. Prevent duplicate usernames
15. Handle bulk operations with partial failures
16. Preserve unsaved changes warning
17. Handle pagination with large user lists
18. Support keyboard navigation in user list

### Settings Search (3 scenarios)
1. Search and navigate to settings
2. Show recent searches
3. Handle fuzzy matching

### Effective Settings View (4 scenarios)
1. Display effective settings view
2. Show setting source hierarchy
3. Export effective settings
4. Display current context

### Audit Log (6 scenarios)
1. Display audit log entries
2. Filter audit log by entity type
3. Filter audit log by date range
4. Display before/after values
5. Export audit log to CSV
6. Search audit log

### Hardware Configuration (13 scenarios)

#### Core Workflows
1. Display hardware configuration sections
2. Configure receipt printer
3. Test printer connection
4. Configure barcode scanner
5. Configure payment terminal
6. Display hardware status
7. Apply hardware template

#### Advanced Scenarios
8. Handle hardware connection failures gracefully
9. Validate IP address format
10. Validate port numbers
11. Handle template application conflicts
12. Persist hardware configuration across sessions
13. Support keyboard navigation in hardware forms

### Integrations (13 scenarios)

#### Core Workflows
1. Display available integrations
2. Enable and configure WooCommerce integration
3. Test integration connection
4. Configure Stripe Terminal integration
5. Display integration sync status
6. Configure sync settings
7. Disable integration
8. View integration error logs

#### Advanced Scenarios
9. Handle API credential validation
10. Handle sync conflicts
11. Display integration error details
12. Handle OAuth flow interruption
13. Validate webhook URLs

### Navigation and Consistency (4 scenarios)
1. Navigate between settings tabs
2. Display consistent page layout across tabs
3. Display scope badges consistently
4. Maintain context across navigation

### Performance and Stress Tests (4 scenarios)
1. Handle rapid tab switching
2. Handle large search results
3. Handle multiple concurrent exports
4. Maintain responsiveness during bulk operations

### Accessibility (4 scenarios)
1. Support keyboard navigation in user list
2. Support keyboard navigation in modals
3. Have proper ARIA labels
4. Announce dynamic content changes

## Running the Tests

### Prerequisites

```bash
# Install Playwright browsers (first time only)
npx playwright install
```

### Run All Settings Tests

```bash
# Run all settings E2E tests
npm run test:e2e -- settings-module.spec.ts settings-advanced.spec.ts

# Run in UI mode (interactive)
npm run test:e2e:ui -- settings-module.spec.ts

# Run in debug mode
npm run test:e2e:debug -- settings-module.spec.ts

# Run specific browser
npx playwright test settings-module.spec.ts --project=chromium
```

### Run Specific Test Suites

```bash
# User Management tests only
npx playwright test settings-module.spec.ts -g "User Management"

# Hardware Configuration tests only
npx playwright test settings-module.spec.ts -g "Hardware Configuration"

# Integrations tests only
npx playwright test settings-module.spec.ts -g "Integrations"

# Advanced scenarios only
npx playwright test settings-advanced.spec.ts

# Accessibility tests only
npx playwright test settings-advanced.spec.ts -g "Accessibility"
```

### View Test Reports

```bash
# Show HTML report
npm run test:e2e:report

# Or open directly
npx playwright show-report
```

## Test Data Requirements

### Users
- **admin** user created during setup (full permissions)
- At least one **store** configured
- At least one **station** configured

### Settings
- Default settings should be configured
- At least one integration available (WooCommerce, Stripe, etc.)
- Hardware devices can be mocked or real

## Test Patterns

### Authentication
All tests use the `loginAsAdminAndNavigateToSettings` helper:

```typescript
await loginAsAdminAndNavigateToSettings(page);
await navigateToSettingsTab(page, 'Users & Roles');
```

### User Creation
Use the `createUser` helper for consistent user creation:

```typescript
await createUser(page, {
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'cashier',
  password: 'TestPass123!',
  storeIndex: 1,
  stationPolicy: 'any',
});
```

### Hardware Configuration
Use the `configureHardwareDevice` helper:

```typescript
await configureHardwareDevice(page, 'receipt printer', {
  'printer type': 'ESC_POS',
  'connection type': 'USB',
  'port': '/dev/usb/lp0',
});
```

### Integration Configuration
Use the `configureIntegration` helper:

```typescript
await configureIntegration(page, 'woocommerce', {
  'store url': 'https://mystore.com',
  'consumer key': 'ck_test_123',
  'consumer secret': 'cs_test_456',
});
```

## Known Limitations

### OAuth Flows
OAuth integration tests (QuickBooks) verify UI elements but don't complete the full OAuth flow, as this requires external authentication.

### Hardware Testing
Hardware connection tests verify the UI flow but may not connect to real hardware devices. Mock responses are acceptable for E2E tests.

### Network Conditions
Some tests simulate offline mode using `page.context().setOffline(true)`, but full network condition testing may require additional setup.

## Debugging Tests

### Debug Mode
```bash
# Run in debug mode with inspector
npm run test:e2e:debug -- settings-module.spec.ts
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
Add console logging to tests:
```typescript
page.on('console', msg => console.log(msg.text()));
```

### Network Monitoring
Monitor network activity:
```typescript
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries on failure
- Single worker (sequential execution)
- GitHub Actions reporter
- Artifact upload for test results

```yaml
- name: Run Settings E2E tests
  run: npm run test:e2e -- settings-module.spec.ts settings-advanced.spec.ts

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Maintenance

### Adding New Tests

1. Add test to appropriate file:
   - Core workflows → `settings-module.spec.ts`
   - Advanced scenarios → `settings-advanced.spec.ts`

2. Use existing helpers from `helpers/settings-helpers.ts`

3. Follow naming conventions:
   - Descriptive test names
   - Group related tests in `describe` blocks
   - Use consistent selectors (prefer `getByRole`, `getByLabel`)

4. Update this documentation with new test scenarios

### Updating Helpers

When adding new reusable functionality:

1. Add to `helpers/settings-helpers.ts`
2. Export the function
3. Document parameters and usage
4. Use in multiple tests to validate

## Performance Targets

- **Test execution time**: < 10 minutes for full suite
- **Individual test timeout**: 30 seconds
- **Page load time**: < 2 seconds
- **Search debounce**: 500ms

## Success Criteria

✅ All 335 tests pass across all browsers
✅ All requirements (1.1, 2.1, 2.7, 2.8, 8.3, 10.1, 11.1, 16.1, 21.1) covered
✅ Core workflows tested end-to-end
✅ Edge cases and error handling validated
✅ Accessibility standards verified
✅ Performance under stress tested

## Next Steps

1. Run tests against staging environment
2. Integrate into CI/CD pipeline
3. Add visual regression tests for UI consistency
4. Expand accessibility test coverage
5. Add performance benchmarking

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Settings Consolidation Spec](.kiro/specs/settings-consolidation/)
- [Test Helpers](./helpers/settings-helpers.ts)
- [E2E README](./README.md)

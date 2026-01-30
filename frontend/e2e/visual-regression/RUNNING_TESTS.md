# Running Visual Regression Tests

## Overview

The visual regression test suite captures 48 baseline screenshots of golden pages across different theme and viewport combinations to ensure visual consistency.

## Prerequisites

1. **Application must be running**: Start the development server before running tests
   ```bash
   npm run dev
   ```

2. **Test database seeded**: Ensure test data is available for consistent screenshots

## Running Tests

### Generate Baseline Screenshots (First Time)

```bash
# Run visual regression tests and generate baselines
npm run test:e2e -- design-system-visual.spec.ts --update-snapshots
```

This will create 48 baseline screenshots in `frontend/e2e/visual-regression/screenshots/`:
- 6 golden pages (Dashboard, Sell, Settings, Inventory, Customers, Reports)
- 2 theme modes (light, dark)
- 2 accent colors (blue, green)
- 2 breakpoints (desktop 1920px, tablet 768px)

### Run Visual Regression Tests

```bash
# Compare current screenshots against baselines
npm run test:e2e -- design-system-visual.spec.ts
```

### Update Baselines After Changes

```bash
# Update baselines after intentional design changes
npm run test:e2e -- design-system-visual.spec.ts --update-snapshots
```

## Test Coverage

### Golden Pages
1. **Dashboard** (`/`) - Main dashboard with widgets
2. **Sell** (`/sell`) - Point of sale interface
3. **Settings** (`/admin`) - Settings page with groups
4. **Inventory** (`/warehouse`) - Inventory management
5. **Customers** (`/customers`) - Customer list and details
6. **Reports** (`/reporting`) - Reporting interface

### Theme Variations
- **Light mode** with blue accent
- **Light mode** with green accent
- **Dark mode** with blue accent
- **Dark mode** with green accent

### Breakpoints
- **Desktop**: 1920×1080px
- **Tablet**: 768×1024px

### Total Screenshots
6 pages × 2 themes × 2 accents × 2 breakpoints = **48 screenshots**

## Additional Test Suites

### Component States
Tests specific component states:
- Settings search results
- Inventory empty state
- Customer details expanded view

### Responsive Behavior
Tests responsive layouts:
- Mobile viewport (375px)
- Sidebar collapsed state

### Accessibility
Tests accessibility features:
- Focus states with keyboard navigation
- High contrast mode
- Reduced motion

## Troubleshooting

### Tests Failing Due to Timing Issues

If tests fail due to timing issues, increase wait times in the test:

```typescript
await page.waitForTimeout(1000); // Increase from 500ms
```

### Screenshots Don't Match

1. **Check if design changed intentionally**: Update baselines with `--update-snapshots`
2. **Font rendering differences**: May need to adjust threshold in test config
3. **Animation timing**: Ensure animations are disabled in test setup

### Application Not Loading

1. Verify dev server is running: `npm run dev`
2. Check console for errors
3. Ensure test data is seeded correctly

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm run preview &
        
      - name: Wait for application
        run: npx wait-on http://localhost:4173
      
      - name: Run visual regression tests
        run: npm run test:e2e -- design-system-visual.spec.ts
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-test-results
          path: frontend/test-results/
```

## Best Practices

1. **Always run tests before committing**: Catch visual regressions early
2. **Review screenshot diffs carefully**: Ensure changes are intentional
3. **Update baselines after design changes**: Keep baselines in sync with design
4. **Run full suite before releases**: Ensure no regressions across all pages
5. **Use CI/CD for automated testing**: Catch regressions in pull requests

## Contrast Validation

The test suite includes automatic contrast validation for WCAG AA compliance:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

Contrast issues are logged to console during test runs in CI mode.

## Performance

- **Full suite runtime**: ~5-10 minutes (48 screenshots)
- **Single page runtime**: ~30 seconds
- **Parallel execution**: Supported with Playwright workers

## Maintenance

### When to Update Baselines

- After intentional design system changes
- After component library updates
- After theme token modifications
- After layout contract changes

### When to Add New Tests

- New golden pages added
- New theme modes or accents added
- New breakpoints required
- New component states to test

## Support

For issues or questions:
1. Check Playwright documentation: https://playwright.dev
2. Review test logs in `frontend/test-results/`
3. Check screenshot diffs in test output

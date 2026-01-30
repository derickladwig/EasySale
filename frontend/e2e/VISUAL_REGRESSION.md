# Visual Regression Testing Guide

## Overview

Visual regression testing ensures that UI changes don't introduce unintended visual bugs. This test suite captures screenshots at various breakpoints, text sizes, densities, and aspect ratios to verify visual consistency across the design system.

## Test Coverage

### Breakpoints
- **xs** (375x667) - iPhone SE
- **sm** (640x1136) - Small tablet
- **md** (768x1024) - iPad
- **lg** (1024x768) - Desktop
- **xl** (1280x720) - Large desktop
- **2xl** (1920x1080) - Full HD

### Text Sizes
- Small (87.5%)
- Medium (100%)
- Large (112.5%)
- Extra Large (125%)

### Density Settings
- Compact (75% spacing)
- Comfortable (100% spacing)
- Spacious (125% spacing)

### Aspect Ratios
- Portrait (3:4)
- Square (1:1)
- Standard (5:4)
- Widescreen (16:9)
- Ultrawide (21:9)

### Pages Tested
- Home (Dashboard)
- Sell (POS)
- Lookup (Product Search)
- Warehouse (Inventory)
- Customers (CRM)
- Reporting (Analytics)
- Admin (Settings)

## Running Tests

### First Time Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

### Capture Baseline Screenshots

Run the visual regression tests to capture baseline screenshots:

```bash
npm run test:e2e -- visual-regression.spec.ts --update-snapshots
```

This will create a `__screenshots__` directory with baseline images for all test scenarios.

### Run Visual Regression Tests

After making UI changes, run the tests to compare against baselines:

```bash
npm run test:e2e -- visual-regression.spec.ts
```

### View Test Results

If tests fail, view the HTML report:

```bash
npm run test:e2e:report
```

The report shows:
- Side-by-side comparison of expected vs actual screenshots
- Diff highlighting visual changes
- Test execution details

## Updating Baselines

When intentional UI changes are made:

1. **Review the changes** in the test report to ensure they're expected
2. **Update baselines** if changes are correct:
   ```bash
   npm run test:e2e -- visual-regression.spec.ts --update-snapshots
   ```
3. **Commit the new screenshots** to version control

## Test Organization

### Test Suites

1. **Breakpoints** - Tests all pages at all breakpoints
2. **Text Sizes** - Tests home page with different text sizes
3. **Density Settings** - Tests home page with different spacing densities
4. **Aspect Ratios** - Tests home page at various aspect ratios
5. **Component States** - Tests specific component states (hover, focus, error)
6. **Extreme Viewports** - Tests minimum (320px) and maximum (4K) viewports

### Screenshot Naming Convention

Screenshots follow this pattern:
- `{page}-{breakpoint}.png` - e.g., `home-lg.png`
- `{page}-text-{size}.png` - e.g., `home-text-large.png`
- `{page}-density-{density}.png` - e.g., `home-density-compact.png`
- `{page}-aspect-{ratio}.png` - e.g., `home-aspect-widescreen.png`

## Best Practices

### When to Run Tests

- **Before committing** UI changes
- **In CI/CD pipeline** on pull requests
- **After design system updates**
- **Before releases**

### Handling Failures

1. **Review the diff** in the HTML report
2. **Determine if change is intentional**:
   - ✅ Intentional: Update baselines
   - ❌ Bug: Fix the code
3. **Never blindly update baselines** without reviewing changes

### Performance Tips

- **Run specific tests** during development:
  ```bash
  npm run test:e2e -- visual-regression.spec.ts -g "home page at lg"
  ```
- **Use headed mode** to debug:
  ```bash
  npm run test:e2e:debug -- visual-regression.spec.ts
  ```
- **Parallelize tests** in CI (already configured)

## Troubleshooting

### Tests are flaky

**Problem**: Screenshots differ slightly between runs

**Solutions**:
- Increase `waitForTimeout` values
- Disable animations: `animations: 'disabled'`
- Use `waitForLoadState('networkidle')`
- Set consistent viewport sizes

### Screenshots look different on CI

**Problem**: CI screenshots don't match local screenshots

**Solutions**:
- Use Docker for consistent rendering
- Configure Playwright to use specific browser versions
- Ensure fonts are installed in CI environment

### Tests are slow

**Problem**: Visual regression tests take too long

**Solutions**:
- Run tests in parallel (already configured)
- Reduce number of breakpoints tested
- Test only critical pages in CI
- Use faster storage for screenshots

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      - name: Run visual regression tests
        run: npm run test:e2e -- visual-regression.spec.ts
        
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-regression-report
          path: playwright-report/
```

## Maintenance

### Regular Tasks

- **Review baselines quarterly** to ensure they're still relevant
- **Update test coverage** when new pages are added
- **Clean up old screenshots** when pages are removed
- **Document visual changes** in commit messages

### Adding New Tests

1. Add new page to `pages` array in test file
2. Run with `--update-snapshots` to create baselines
3. Commit new screenshots
4. Update this documentation

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Design System Documentation](../docs/DESIGN_SYSTEM.md)
- [Component Guidelines](../docs/COMPONENT_GUIDELINES.md)

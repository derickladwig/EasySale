# Visual Regression Testing

This directory contains visual regression tests for the unified design system.

## Structure

```
visual-regression/
├── fixtures.ts           # Test fixtures with seeded data and frozen time
├── helpers.ts            # Utilities for theme, viewport, and contrast validation
├── screenshots/
│   └── baseline/         # Baseline screenshots for comparison
└── tests/                # Visual regression test files
```

## Running Tests

```bash
# Run all visual regression tests
npm run test:visual

# Update baseline screenshots
npm run test:visual -- --update-snapshots

# Run tests for specific page
npm run test:visual -- dashboard
```

## Test Configuration

### Themes
- Modes: light, dark
- Accents: blue, green, purple, orange, red

### Viewports
- Desktop: 1280x720
- Tablet: 768x1024
- Mobile: 375x667

### Pages Tested
- Dashboard
- Sell
- Settings
- Inventory
- Customers
- Reports

## Baseline Screenshots

Baseline screenshots are stored in `screenshots/baseline/` with naming convention:
```
{page}-{mode}-{accent}-{viewport}.png
```

Example: `dashboard-light-blue-desktop.png`

## Contrast Validation

All screenshots are validated for WCAG AA contrast ratios:
- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1

## Test Data

Tests use a golden dataset defined in `fixtures.ts` to ensure deterministic results:
- Frozen time: 2024-01-20T10:00:00Z
- Seeded products, customers, and sales data
- Disabled animations and transitions

## Troubleshooting

### Flaky Tests
- Ensure animations are disabled
- Check that fonts are loaded
- Verify network is idle before screenshot

### Contrast Failures
- Review color token definitions in `src/styles/themes.css`
- Ensure sufficient contrast between text and background
- Check accent color combinations

### Screenshot Differences
- Update baselines after intentional design changes
- Review diff images in test output
- Verify changes are expected before updating baselines

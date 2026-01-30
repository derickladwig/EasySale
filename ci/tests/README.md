# CI Property-Based Tests

This directory contains property-based tests for CI/CD build integrity using fast-check.

## Overview

Property-based tests verify universal properties that should hold true across all valid inputs. These tests run a minimum of 100 iterations with randomly generated test cases to ensure robustness.

## Tests

### Property 1: Stale Path Detection

**File:** `stale-path-detection.property.test.ts`

**Validates Requirements:** 1.4, 1.7, 1.8

**Property:** For any CI script or release script, scanning for stale path patterns (backend/rust, caps-pos-api, EasySale-api) should find zero matches in Core_Runtime_Paths.

**Test Coverage:**
- ✓ Core property: Zero stale patterns in actual CI scripts
- ✓ Scanner detects stale patterns when present
- ✓ Scanner ignores clean content
- ✓ Correct line number identification
- ✓ Archive directory exclusion
- ✓ Multiple pattern detection
- ✓ Case-insensitive matching
- ✓ File discovery integration

**Minimum Iterations:** 100 per property test

## Running Tests

### Install Dependencies

```bash
cd ci
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Test Framework

- **Testing Framework:** Vitest
- **Property-Based Testing:** fast-check
- **Environment:** Node.js

## Configuration

- **vitest.config.ts:** Test configuration
- **tsconfig.json:** TypeScript configuration
- **package.json:** Dependencies and scripts

## Stale Path Patterns

The following patterns are considered stale and should not exist in Core_Runtime_Paths:

1. `backend/rust` - Legacy backend path (should be `backend/`)
2. `caps-pos-api` - Old API name (should be `EasySale-server`)
3. `EasySale-api` - Incorrect API name (should be `EasySale-server`)

## Excluded Paths

The following paths are excluded from scanning:

- `archive/` - Archived code
- `node_modules/` - Dependencies
- `.git/` - Version control
- `target/` - Rust build artifacts
- `dist/` - Build output
- `build/` - Build output
- `coverage/` - Test coverage
- `.next/` - Next.js cache
- `.cache/` - Cache directories

## CI Integration

These tests are designed to run in CI/CD pipelines to ensure build integrity. They should be run:

1. On every pull request
2. Before creating release artifacts
3. As part of the readiness gate

### GitHub Actions Example

```yaml
name: CI Property Tests

on: [pull_request, push]

jobs:
  property-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd ci
          npm ci
          
      - name: Run property tests
        run: |
          cd ci
          npm test
```

## Adding New Property Tests

To add a new property test:

1. Create a new test file: `{feature}.property.test.ts`
2. Import fast-check: `import fc from 'fast-check'`
3. Define the property to test
4. Use `fc.assert()` with `fc.property()` to test the property
5. Set `numRuns: 100` minimum
6. Document the property in this README

### Example Template

```typescript
/**
 * Property-Based Test: {Property Name}
 * 
 * Feature: production-readiness-windows-installer
 * Property {N}: {Property Description}
 * 
 * **Validates: Requirements X.Y, X.Z**
 * 
 * {Detailed property description}
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Property {N}: {Property Name}', () => {
  it('should {property description}', () => {
    fc.assert(
      fc.property(
        // Generators
        fc.string(),
        // Test function
        (input) => {
          // Test logic
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Troubleshooting

### Tests Failing

If property tests fail:

1. Check the error message for the failing property
2. Review the generated test case that caused the failure
3. Verify the property definition is correct
4. Check if the implementation needs fixing

### File Discovery Issues

If file discovery is not finding expected files:

1. Check the glob patterns in `CI_SCRIPT_PATTERNS`
2. Verify files are not in excluded paths
3. Check file extensions match the patterns
4. Review the `matchesPattern()` function logic

### Performance Issues

If tests are slow:

1. Reduce `numRuns` temporarily for debugging (but restore to 100 for CI)
2. Check for expensive operations in test logic
3. Consider using `fc.sample()` to preview generated values
4. Profile tests with `npm run test -- --reporter=verbose`

## Related Documentation

- [fast-check Documentation](https://fast-check.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Property-Based Testing Guide](https://fast-check.dev/docs/introduction/getting-started/)
- [Production Readiness Spec](.kiro/specs/production-readiness-windows-installer/)

## Version History

- **2026-01-25**: Initial release (Task 2.6)
  - Created Property 1: Stale Path Detection
  - Implemented scanner with 100+ iterations
  - Added integration tests for file discovery
  - Documented test framework and patterns

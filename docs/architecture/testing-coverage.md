# Test Coverage Configuration

## Overview

This document describes the test coverage configuration and requirements for the CAPS POS system.

## Coverage Targets

### Frontend (Vitest + V8)

**Overall Targets:**
- **Business Logic** (domains/): 80% minimum
- **UI Components** (common/components/): 60% minimum
- **Feature Modules** (features/): 60% minimum

**Current Configuration** (`vitest.config.ts`):
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
  perFile: true,
}
```

### Backend (Cargo Tarpaulin)

**Overall Targets:**
- **Business Logic**: 80% minimum
- **Handlers**: 70% minimum
- **Models**: 80% minimum
- **Database Queries**: 70% minimum

**Configuration** (`.cargo/config.toml` or command line):
```bash
cargo tarpaulin --out Xml --output-dir ./coverage
```

## Running Coverage Reports

### Frontend

```bash
cd frontend

# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Backend

```bash
cd backend/rust

# Install tarpaulin (first time only)
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir ./coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## CI/CD Integration

### GitHub Actions

Coverage reports are automatically generated and uploaded to Codecov on every push and pull request.

**Frontend Coverage Job:**
```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage reports
  uses: codecov/codecov-action@v4
  with:
    files: ./frontend/coverage/lcov.info
    flags: frontend
```

**Backend Coverage Job:**
```yaml
- name: Generate coverage report
  run: cargo tarpaulin --out Xml --output-dir ./coverage

- name: Upload coverage reports
  uses: codecov/codecov-action@v4
  with:
    files: ./backend/rust/coverage/cobertura.xml
    flags: backend
```

### Coverage Badges

Coverage badges are displayed in the README:

```markdown
[![codecov](https://codecov.io/gh/derickladwig/EasySale/branch/main/graph/badge.svg)](https://codecov.io/gh/derickladwig/EasySale)
```

## Excluded Files

### Frontend

The following files are excluded from coverage:
- `node_modules/`
- `src/test/` - Test utilities
- `**/*.test.{ts,tsx}` - Test files
- `**/*.spec.{ts,tsx}` - Spec files
- `**/types.ts` - Type definitions
- `**/*.d.ts` - TypeScript declarations
- `dist/` - Build output
- `.vite/` - Vite cache

### Backend

The following files are excluded from coverage:
- `tests/` - Test files
- `target/` - Build output
- `main.rs` - Entry point (minimal logic)

## Coverage Requirements by Module

### High Priority (80% minimum)

These modules contain critical business logic and must have high coverage:

**Frontend:**
- `src/domains/cart/` - Cart calculations
- `src/domains/pricing/` - Pricing rules
- `src/domains/stock/` - Inventory logic
- `src/domains/auth/` - Authentication

**Backend:**
- `src/models/` - Data models
- `src/services/` - Business logic services
- `src/auth/` - Authentication and authorization

### Medium Priority (60% minimum)

These modules contain UI and integration code:

**Frontend:**
- `src/common/components/` - Reusable components
- `src/features/` - Feature modules
- `src/common/contexts/` - React contexts

**Backend:**
- `src/handlers/` - HTTP handlers
- `src/db/` - Database access

### Low Priority (No minimum)

These modules are difficult to test or have minimal logic:
- Configuration files
- Type definitions
- Test utilities
- Build scripts

## Best Practices

### Writing Testable Code

1. **Separate business logic from UI**: Keep logic in `domains/` modules
2. **Use pure functions**: Easier to test, no side effects
3. **Inject dependencies**: Use dependency injection for testability
4. **Avoid global state**: Makes tests independent
5. **Keep functions small**: Easier to test and understand

### Writing Good Tests

1. **Test behavior, not implementation**: Focus on what, not how
2. **Use descriptive test names**: Explain what is being tested
3. **Arrange-Act-Assert pattern**: Clear test structure
4. **One assertion per test**: Makes failures easier to diagnose
5. **Mock external dependencies**: Keep tests fast and reliable

### Improving Coverage

1. **Identify uncovered code**: Use coverage reports to find gaps
2. **Prioritize critical paths**: Test important features first
3. **Add edge case tests**: Cover error conditions and boundaries
4. **Refactor untestable code**: Make code more testable
5. **Review coverage in PRs**: Ensure new code is tested

## Monitoring Coverage

### Local Development

Run coverage reports locally before committing:

```bash
# Frontend
cd frontend && npm run test:coverage

# Backend
cd backend/rust && cargo tarpaulin
```

### Pull Requests

Coverage reports are automatically generated for all pull requests. The CI pipeline will:

1. Run all tests with coverage
2. Upload reports to Codecov
3. Comment on PR with coverage changes
4. Show coverage diff (lines added/removed)

### Codecov Dashboard

View detailed coverage reports at:
- https://codecov.io/gh/derickladwig/EasySale

The dashboard shows:
- Overall coverage percentage
- Coverage by file and directory
- Coverage trends over time
- Uncovered lines highlighted

## Troubleshooting

### Frontend Coverage Issues

**Problem**: Coverage report shows 0% for all files

**Solution**: Ensure tests are running with coverage:
```bash
npm run test:coverage
```

**Problem**: Some files not included in coverage

**Solution**: Check `vitest.config.ts` exclude patterns

### Backend Coverage Issues

**Problem**: Tarpaulin fails to install

**Solution**: Install system dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev pkg-config

# macOS
brew install openssl pkg-config
```

**Problem**: Coverage report incomplete

**Solution**: Run with verbose output:
```bash
cargo tarpaulin --verbose --out Html
```

## Future Improvements

1. **Mutation Testing**: Add mutation testing to verify test quality
2. **Visual Regression Testing**: Add visual diff testing for UI components
3. **Performance Testing**: Add performance benchmarks with coverage
4. **Integration Coverage**: Measure coverage of integration tests separately
5. **E2E Coverage**: Track coverage from end-to-end tests

## References

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Cargo Tarpaulin Documentation](https://github.com/xd009642/tarpaulin)
- [Codecov Documentation](https://docs.codecov.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

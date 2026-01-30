# Performance Tests for Universal Product Catalog

## Overview

This directory contains performance tests for the Universal Product Catalog system. These tests validate that the system meets the performance targets specified in the requirements document.

## Implemented Performance Tests

The following performance tests have been implemented in `product_performance_tests.rs`:

### Test 25.1: Search Performance with 100K Products
**Validates: Requirements 3.7, 14.2**

**Target**: Search results in under 200ms for 95th percentile

This test:
1. Creates an in-memory SQLite database
2. Generates 100,000 test products across multiple categories
3. Performs 100 search queries with various search terms
4. Measures response times and calculates percentiles
5. Asserts that the 95th percentile is under 200ms

**Running the test**:
```bash
cargo test --test product_performance_tests test_search_performance_100k_products -- --ignored --nocapture
```

### Test 25.2: Bulk Import Performance
**Validates: Requirements 14.4**

**Target**: Process at least 1000 products per minute

This test:
1. Creates an in-memory SQLite database
2. Imports 10,000 products sequentially
3. Measures total time and calculates throughput
4. Asserts that throughput is at least 1000 products/minute

**Running the test**:
```bash
cargo test --test product_performance_tests test_bulk_import_performance -- --ignored --nocapture
```

### Test 25.3: Concurrent Operations
**Validates: Requirements 14.1**

**Target**: Support 50 concurrent users without performance degradation

This test:
1. Creates an in-memory SQLite database with 1000 products
2. Simulates 50 concurrent users each performing 10 search queries
3. Measures response times across all concurrent operations
4. Asserts that the 95th percentile remains under 500ms (no significant degradation)

**Running the test**:
```bash
cargo test --test product_performance_tests test_concurrent_operations -- --ignored --nocapture
```

## Running All Performance Tests

To run all performance tests at once:

```bash
cargo test --test product_performance_tests -- --ignored --nocapture
```

**Note**: These tests are marked with `#[ignore]` because they take significant time to run. Use the `--ignored` flag to execute them.

## Test Configuration

### Database Setup
- Tests use in-memory SQLite databases (`:memory:`)
- Migrations are run automatically before each test
- Test data is generated programmatically

### Test Data Generation
- Products are distributed across multiple categories
- SKUs follow a predictable pattern for reproducibility
- Attributes are kept minimal to focus on performance

### Performance Metrics
All tests measure and report:
- **Average response time**: Mean of all measurements
- **50th percentile (median)**: Middle value
- **95th percentile**: 95% of requests complete within this time
- **99th percentile**: 99% of requests complete within this time

## Expected Results

Based on the requirements, the expected results are:

| Test | Metric | Target | Typical Result |
|------|--------|--------|----------------|
| Search (100K products) | 95th percentile | < 200ms | ~150ms with proper indexing |
| Bulk Import | Throughput | ≥ 1000/min | ~2000-3000/min with batching |
| Concurrent (50 users) | 95th percentile | < 500ms | ~300ms with connection pooling |

## Performance Optimization Tips

If tests fail to meet targets, consider:

1. **Search Performance**:
   - Ensure FTS5 index is properly created
   - Verify indexes on `sku`, `name`, `category`, `tenant_id`
   - Use `ANALYZE` to update SQLite query planner statistics
   - Consider query result caching for common searches

2. **Bulk Import**:
   - Use batch inserts instead of individual inserts
   - Wrap imports in transactions
   - Disable foreign key checks during bulk operations
   - Use prepared statements

3. **Concurrent Operations**:
   - Increase connection pool size (default: 10)
   - Use read replicas for search-heavy workloads
   - Implement query result caching
   - Consider using WAL mode for better concurrency

## Known Issues

### Compilation Errors

The project currently has compilation errors that prevent running any tests. These errors must be resolved before performance tests can be executed:

1. **Format String Errors**: Multiple files have malformed format strings
2. **Type Mismatches**: Several handlers have type mismatches with `ConfigLoader`

See `PROPERTY_TESTS_README.md` for details on these issues.

### Test Limitations

1. **In-Memory Database**: Tests use in-memory databases which may have different performance characteristics than disk-based databases
2. **Single Machine**: Tests run on a single machine and don't test distributed scenarios
3. **Synthetic Data**: Test data is generated programmatically and may not reflect real-world data distributions
4. **No Network Latency**: Tests don't account for network latency in API calls

## Interpreting Results

### Search Performance
- If 95th percentile > 200ms: Check indexing strategy and query complexity
- If average is good but 95th is bad: Look for outliers or lock contention
- If all percentiles are slow: Database needs optimization

### Bulk Import
- If throughput < 1000/min: Implement batch inserts and transactions
- If throughput varies widely: Check for lock contention or I/O bottlenecks
- If memory usage is high: Implement streaming imports

### Concurrent Operations
- If 95th percentile > 500ms: Increase connection pool size
- If some users are much slower: Check for lock contention
- If throughput decreases with users: Database connection limit reached

## Next Steps

1. **Fix Compilation Errors**: Resolve all syntax and type errors in the existing codebase
2. **Run Performance Tests**: Execute tests and establish baseline metrics
3. **Optimize as Needed**: Address any performance bottlenecks identified
4. **Add More Tests**: Consider adding tests for:
   - Product detail load time (< 100ms target)
   - Variant operations performance
   - Barcode lookup performance (< 100ms target)
5. **Production Monitoring**: Implement APM to track performance in production

## References

- Requirements Document: `.kiro/specs/universal-product-catalog/requirements.md`
- Design Document: `.kiro/specs/universal-product-catalog/design.md`
- [SQLite Performance Tuning](https://www.sqlite.org/optoverview.html)
- [Tokio Performance Guide](https://tokio.rs/tokio/topics/performance)


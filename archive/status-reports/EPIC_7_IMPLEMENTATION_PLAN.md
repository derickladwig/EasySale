# Epic 7 Implementation Plan: Testing & Documentation

**Date**: 2026-01-17  
**Status**: Ready to Start

## Overview

Epic 7 consists of comprehensive integration tests and documentation for the Universal Data Sync system. This is the final epic before the system is production-ready.

## Task Breakdown

### Testing Tasks (17.1-17.5) - Estimated 22-30 hours

#### Task 17.1: WooCommerce Integration Tests (4-6 hours)
- Create `backend/rust/tests/woocommerce_integration.rs`
- Test API connectivity with mock server
- Test order/product/customer fetching with pagination
- Test webhook signature validation (valid and invalid)
- Test transformation accuracy
- **Requirements**: 12.1, 12.2, 12.3

#### Task 17.2: QuickBooks Integration Tests (6-8 hours)
- Create `backend/rust/tests/quickbooks_integration.rs`
- Test OAuth flow with sandbox environment
- Test customer/item/invoice CRUD operations
- Test error handling: 429, 5010, 6240, 6000
- Test SyncToken handling for updates
- Test minor version 75 is set on all requests
- **Requirements**: 11.1, 11.2, 11.3, 11.4

#### Task 17.3: Supabase Integration Tests (3-4 hours)
- Create `backend/rust/tests/supabase_integration.rs`
- Test connection and CRUD operations
- Test upsert idempotency (same record twice = one record)
- Test ID mapping storage and retrieval
- **Requirements**: 13.1, 13.3

#### Task 17.4: End-to-End Sync Tests (6-8 hours)
- Create `backend/rust/tests/e2e_sync.rs`
- Test full flow: WooCommerce → Internal → QuickBooks
- Test full flow: WooCommerce → Internal → Supabase
- Test incremental sync via webhook trigger
- Test failed record retry
- Test dry run mode (no external writes)
- **Requirements**: 2.1, 2.2

#### Task 17.5: Mapping Engine Tests (3-4 hours)
- Create `backend/rust/tests/mapping_tests.rs`
- Test field mapping with dot notation
- Test array mapping for line items
- Test transformation functions
- Test validation (invalid fields, QBO custom field limit)
- **Requirements**: 3.1, 3.3, 3.4

### Documentation Tasks (18.1-18.5) - Estimated 8-12 hours

#### Task 18.1: Setup Guide (2-3 hours)
- Create `docs/sync/SETUP_GUIDE.md`
- WooCommerce: How to generate Consumer Key/Secret in WP Admin
- QuickBooks: How to create app in Intuit Developer Portal, OAuth setup
- Supabase: How to get project URL and service role key
- Include screenshots and step-by-step instructions
- **Requirements**: 14.1

#### Task 18.2: Mapping Guide (2-3 hours)
- Create `docs/sync/MAPPING_GUIDE.md`
- Document default mappings and their purpose
- Explain how to customize mappings
- Document available transformation functions
- **Document QBO 3-custom-field limitation**
- **Requirements**: 3.2, 3.5

#### Task 18.3: Troubleshooting Guide (2-3 hours)
- Create `docs/sync/TROUBLESHOOTING.md`
- Common errors and solutions
- Rate limiting behavior and mitigation
- Conflict resolution strategies
- QBO error codes (5010, 6240, 6000) and fixes
- **Requirements**: 3.5, 8.2

#### Task 18.4: API Migration Notes (1-2 hours)
- Create `docs/sync/API_MIGRATION.md`
- **WooCommerce REST API v3**: Legacy API removed June 2024
- **QuickBooks minor version 75**: Required August 1, 2025
- **QuickBooks CloudEvents**: Required May 15, 2026
- Include migration checklist and testing steps
- **Requirements**: 1.3, 1.4, 11.8

#### Task 18.5: Internal Architecture Documentation (1-2 hours)
- Create `docs/sync/ARCHITECTURE.md`
- Module responsibilities and data flows
- Guidelines for adding new connectors
- Runbooks for support: interpreting logs, resolving errors, manual resyncs
- **Requirements**: 9.5, 7.5

## Implementation Strategy

### Phase 1: Testing Infrastructure (Tasks 17.1-17.3)
1. Start with WooCommerce tests (most mature connector)
2. Move to QuickBooks tests (most complex)
3. Finish with Supabase tests (simplest)
4. Use mock servers where appropriate to avoid external dependencies

### Phase 2: Integration Testing (Tasks 17.4-17.5)
1. Create end-to-end sync tests
2. Create mapping engine tests
3. Ensure all tests can run in CI/CD

### Phase 3: Documentation (Tasks 18.1-18.5)
1. Start with setup guide (most user-facing)
2. Create mapping guide
3. Create troubleshooting guide
4. Document API migrations
5. Create internal architecture docs

## Testing Approach

### Mock vs Real Services
- **WooCommerce**: Use mock HTTP server (wiremock or similar)
- **QuickBooks**: Use sandbox environment (requires credentials)
- **Supabase**: Use test project or mock
- **Database**: Use in-memory SQLite for tests

### Test Organization
```
backend/rust/tests/
├── woocommerce_integration.rs
├── quickbooks_integration.rs
├── supabase_integration.rs
├── e2e_sync.rs
├── mapping_tests.rs
└── common/
    ├── mod.rs
    ├── fixtures.rs
    └── mock_servers.rs
```

### Test Data
- Create reusable test fixtures
- Use realistic data samples
- Test edge cases (empty fields, special characters, etc.)

## Documentation Structure

```
docs/sync/
├── SETUP_GUIDE.md
├── MAPPING_GUIDE.md
├── TROUBLESHOOTING.md
├── API_MIGRATION.md
├── ARCHITECTURE.md
└── images/
    ├── woocommerce-keys.png
    ├── quickbooks-oauth.png
    └── supabase-keys.png
```

## Dependencies Required

### Testing Dependencies
```toml
[dev-dependencies]
actix-rt = "2.9"
tempfile = "3.8"
proptest = "1.4"
wiremock = "0.5"  # For HTTP mocking
mockall = "0.12"  # For trait mocking
```

### Documentation Tools
- Markdown editor
- Screenshot tool
- Diagram tool (optional - for architecture diagrams)

## Success Criteria

### Testing
- [ ] All integration tests pass
- [ ] Test coverage > 70% for sync modules
- [ ] Tests can run in CI/CD without external dependencies
- [ ] Property tests validate invariants

### Documentation
- [ ] Setup guide enables new user to configure all connectors
- [ ] Mapping guide explains customization clearly
- [ ] Troubleshooting guide covers common issues
- [ ] API migration notes prepare for upcoming changes
- [ ] Architecture docs enable new developers to contribute

## Risks & Mitigation

### Risk 1: QuickBooks Sandbox Access
- **Risk**: May not have sandbox credentials
- **Mitigation**: Use mock server if sandbox unavailable

### Risk 2: Test Flakiness
- **Risk**: External API tests may be flaky
- **Mitigation**: Use mocks, implement retries, add timeouts

### Risk 3: Documentation Staleness
- **Risk**: Docs may become outdated as code changes
- **Mitigation**: Include docs in code review process

## Timeline Estimate

- **Testing Tasks**: 22-30 hours (3-4 days)
- **Documentation Tasks**: 8-12 hours (1-2 days)
- **Total**: 30-42 hours (4-6 days)

## Current Status

- **Epic 5 (Logging & Monitoring)**: 100% Complete ✅
- **Epic 6 (User Interface)**: 100% Complete ✅
- **Epic 7 (Testing & Documentation)**: 0% Complete (Ready to start)

## Next Steps

1. Start with Task 17.1 (WooCommerce Integration Tests)
2. Set up testing infrastructure and common utilities
3. Create mock servers for external APIs
4. Implement tests systematically
5. Move to documentation once tests are complete

---

**Ready to begin Epic 7 implementation!**

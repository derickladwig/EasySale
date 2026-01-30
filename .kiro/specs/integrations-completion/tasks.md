# Implementation Plan: Integrations Completion

## Overview

This implementation plan covers Phase 1 (Integration Management + Data Manager) and Phase 2 (Stripe Hosted Checkout). The lite build remains fully functional for core POS. The full build adds integrations that require personal setup.

**Key Rule:** Cards are hidden unless fully functional. No "Coming Soon" placeholders.

## Tasks

### Phase 1: Database Schema

- [x] 1. Create database migrations
  - [x] 1.1 Create migration 026_integrations_phase1.sql
    - Create `stripe_connected_accounts` table for Stripe Connect tokens
    - Create `integration_logs` table for audit trail
    - Create `data_batches` table for Data Manager tracking
    - Add indexes for efficient querying
    - _Requirements: 1.3, 9.6, 11.5_
  
  - [x] 1.2 Write property test for tenant isolation
    - **Property 8: Tenant Isolation**
    - **Validates: Requirements 4.2, 4.3, 4.5**

### Phase 1: Stripe Connect OAuth

- [x] 2. Implement Stripe Connect connector
  - [x] 2.1 Create Stripe connector module structure
    - Create `backend/crates/server/src/connectors/stripe/mod.rs`
    - Create `backend/crates/server/src/connectors/stripe/oauth.rs`
    - Create `backend/crates/server/src/connectors/stripe/client.rs`
    - Read platform credentials from environment (STRIPE_CLIENT_ID, STRIPE_SECRET_KEY)
    - _Requirements: 1.2, 1.7, 6.6_
  
  - [x] 2.2 Implement Stripe OAuth flow
    - Generate authorization URL with state parameter
    - Store state in oauth_states table with expiry
    - Exchange code for tokens on callback
    - Store connected account ID and tokens (encrypted)
    - _Requirements: 1.2, 1.3, 1.6_
  
  - [x] 2.3 Implement Stripe API client
    - HTTP client using platform secret key
    - All requests include Stripe-Account header for connected account
    - Get account summary (business name, country, currency)
    - _Requirements: 1.4, 1.8_
  
  - [x] 2.4 Write property test for OAuth state validation
    - **Property 1: OAuth State Validation**
    - **Validates: Requirements 1.2, 1.3, 1.6**

- [x] 3. Implement Stripe integration handlers
  - [x] 3.1 Add Stripe endpoints to integrations.rs
    - POST /api/integrations/stripe/auth-url
    - GET /api/integrations/stripe/callback
    - GET /api/integrations/stripe/status
    - GET /api/integrations/stripe/summary
    - POST /api/integrations/stripe/test
    - DELETE /api/integrations/stripe/disconnect
    - GET /api/integrations/stripe/logs
    - _Requirements: 1.1, 1.4, 1.5, 1.8, 10.7_
  
  - [x] 3.2 Write property test for disconnect removes data
    - **Property 4: Disconnect Removes Data**
    - **Validates: Requirements 1.5, 2.5, 3.5, 6.3**

### Phase 1: Square Integration (API Key)

- [x] 4. Implement Square connector
  - [x] 4.1 Create Square connector module structure
    - Create `backend/crates/server/src/connectors/square/mod.rs`
    - Create `backend/crates/server/src/connectors/square/client.rs`
    - _Requirements: 2.3, 2.7_
  
  - [x] 4.2 Implement Square API client
    - HTTP client with Bearer auth
    - Test connection via GET /v2/locations
    - Get location summary (name, address, capabilities)
    - _Requirements: 2.3, 2.8_

- [x] 5. Implement Square integration handlers
  - [x] 5.1 Add Square endpoints to integrations.rs
    - POST /api/integrations/square/credentials
    - GET /api/integrations/square/status
    - GET /api/integrations/square/summary
    - POST /api/integrations/square/test
    - DELETE /api/integrations/square/disconnect
    - GET /api/integrations/square/logs
    - _Requirements: 2.1, 2.4, 2.5, 2.8, 10.7_

### Phase 1: Clover Integration (OAuth)

- [x] 6. Implement Clover connector
  - [x] 6.1 Create Clover connector module structure
    - Create `backend/crates/server/src/connectors/clover/mod.rs`
    - Create `backend/crates/server/src/connectors/clover/oauth.rs`
    - Create `backend/crates/server/src/connectors/clover/client.rs`
    - Read app credentials from environment (CLOVER_APP_ID, CLOVER_APP_SECRET)
    - _Requirements: 3.2, 3.7, 6.6_
  
  - [x] 6.2 Implement Clover OAuth flow
    - Generate authorization URL with state parameter
    - Exchange code for tokens on callback
    - Store tokens and merchant_id (encrypted)
    - Implement token refresh
    - _Requirements: 3.2, 3.3, 3.8_
  
  - [x] 6.3 Implement Clover API client
    - HTTP client with OAuth Bearer auth
    - Get merchant summary (name, address)
    - _Requirements: 3.4, 3.9_

- [x] 7. Implement Clover integration handlers
  - [x] 7.1 Add Clover endpoints to integrations.rs
    - POST /api/integrations/clover/auth-url
    - GET /api/integrations/clover/callback
    - GET /api/integrations/clover/status
    - GET /api/integrations/clover/summary
    - POST /api/integrations/clover/test
    - DELETE /api/integrations/clover/disconnect
    - GET /api/integrations/clover/logs
    - _Requirements: 3.1, 3.4, 3.5, 3.9, 10.7_

### Phase 1: Checkpoint

- [x] 8. Checkpoint - Backend connectors complete
  - Ensure all connector tests pass
  - Verify OAuth flows work with test credentials
  - Verify credential encryption works
  - Ask the user if questions arise

### Phase 1: Integration Logs

- [x] 9. Implement integration logging
  - [x] 9.1 Add integration logs endpoint
    - GET /api/integrations/{provider}/logs
    - Query integration_logs table with pagination
    - Filter by level (info/warning/error)
    - _Requirements: 9.3_
  
  - [x] 9.2 Add logging helper function
    - Create `log_integration_event()` function
    - Call from all integration operations (connect, test, disconnect, errors)
    - _Requirements: 9.3_

### Phase 1: Supabase Summary

- [x] 10. Extend Supabase integration
  - [x] 10.1 Add Supabase summary endpoint
    - GET /api/integrations/supabase/summary
    - Return: project_name, last_sync_at, pending_queue_count
    - _Requirements: 4.6_

### Phase 1: Data Manager

- [x] 11. Implement Data Manager handlers
  - [x] 11.1 Create data_manager.rs handlers
    - POST /api/data-manager/seed (create demo data with batch_id)
    - POST /api/data-manager/upload (CSV import with batch_id)
    - GET /api/data-manager/batches (list all batches)
    - GET /api/data-manager/batches/{id} (batch status)
    - DELETE /api/data-manager/batches/{id} (purge by batch_id)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 11.2 Write property test for batch operations atomicity
    - **Property 12: Batch Operations Atomicity**
    - **Validates: Requirements 11.2, 11.3, 11.6**

### Phase 1: Extend Capabilities

- [x] 12. Extend capabilities system
  - [x] 12.1 Update backend capabilities endpoint
    - Add new feature flags: integrations, payments, stripe, square, clover, data_manager
    - Return build_variant in response
    - _Requirements: 14.7, 15.5_
  
  - [x] 12.2 Update frontend capabilities service
    - Extend Capabilities interface with new feature flags
    - _Requirements: 14.7_
  
  - [x] 12.3 Add feature hooks to CapabilitiesContext
    - useHasIntegrations(), useHasStripe(), useHasSquare(), useHasClover(), useHasDataManager()
    - _Requirements: 14.7_

### Phase 1: Conditional Compilation

- [x] 13. Implement Cargo feature flags
  - [x] 13.1 Update Cargo.toml with feature flags
    - Define features: lite, export, full, integrations, payments
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 13.2 Add conditional compilation to handlers
    - Use #[cfg(feature = "integrations")] for integration modules
    - Use #[cfg(feature = "payments")] for payment modules
    - _Requirements: 14.2, 15.2_
  
  - [x] 13.3 Update route registration with conditional compilation
    - Only register integration routes when feature enabled
    - _Requirements: 14.2_

### Phase 1: Frontend - Sync API

- [x] 14. Extend frontend syncApi.ts
  - [x] 14.1 Add Stripe API methods
    - getStripeAuthUrl(), getStripeStatus(), getStripeSummary()
    - testStripeConnection(), disconnectStripe(), getStripeLogs()
    - _Requirements: 10.1, 10.2_
  
  - [x] 14.2 Add Square API methods
    - connectSquare(), getSquareStatus(), getSquareSummary()
    - testSquareConnection(), disconnectSquare(), getSquareLogs()
    - _Requirements: 10.1, 10.2_
  
  - [x] 14.3 Add Clover API methods
    - getCloverAuthUrl(), getCloverStatus(), getCloverSummary()
    - testCloverConnection(), disconnectClover(), getCloverLogs()
    - _Requirements: 10.1, 10.2_
  
  - [x] 14.4 Add Supabase summary method
    - getSupabaseSummary()
    - _Requirements: 10.1_
  
  - [x] 14.5 Add Data Manager API methods
    - seedData(), uploadData(), getDataBatches(), getBatchStatus(), purgeBatch()
    - _Requirements: 10.1, 10.2_

### Phase 1: Frontend - Components

- [x] 15. Create IntegrationLogsDrawer component
  - [x] 15.1 Create frontend/src/settings/components/IntegrationLogsDrawer.tsx
    - Slide-out drawer with log entries
    - Filter by level (info/warning/error)
    - Pagination support
    - Use semantic tokens for styling (no hardcoded colors)
    - _Requirements: 9.3_

- [x] 16. Create DataManagerPage
  - [-] 16.1 Create frontend/src/settings/pages/DataManagerPage.tsx
    - Seed demo data button
    - CSV upload form
    - Batch list with status
    - Purge button per batch
    - Use semantic tokens for styling
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

### Phase 1: Frontend - Integrations Page

- [x] 17. Extend IntegrationsPage for new providers
  - [x] 17.1 Add Stripe card with OAuth flow
    - "Connect with Stripe" button (initiates OAuth)
    - Test/Disconnect buttons (after connected)
    - Summary section (business name, country, currency, masked account ID)
    - View Logs button
    - Only render if useHasStripe() returns true
    - _Requirements: 1.1, 1.8, 5.1, 5.2, 5.7, 9.1, 14.3_
  
  - [x] 17.2 Add Square card with API key flow
    - Access token input (password field)
    - Location ID input
    - Connect/Test/Disconnect buttons
    - Summary section (location name, address, capabilities)
    - View Logs button
    - Only render if useHasSquare() returns true
    - _Requirements: 2.1, 2.8, 5.1, 5.2, 5.7, 9.1, 14.3_
  
  - [x] 17.3 Add Clover card with OAuth flow
    - "Connect with Clover" button (initiates OAuth)
    - Test/Disconnect buttons (after connected)
    - Summary section (merchant name, address)
    - View Logs button
    - Only render if useHasClover() returns true
    - _Requirements: 3.1, 3.9, 5.1, 5.2, 5.7, 9.1, 14.3_
  
  - [x] 17.4 Update Supabase card with summary
    - Display project name, last sync time, pending queue count
    - View Logs button
    - _Requirements: 4.6, 5.7_

### Phase 1: Credential Security

- [x] 18. Implement credential security measures
  - [x] 18.1 Ensure credentials never appear in responses
    - Mask API keys and tokens in status/summary responses
    - Never return full credentials from any endpoint
    - _Requirements: 6.2_
  
  - [x] 18.2 Ensure credentials never appear in logs
    - Sanitize log messages
    - Use redaction for sensitive fields
    - _Requirements: 6.5_
  
  - [x] 18.3 Write property test for credential secrecy
    - **Property 3: Credential Secrecy**
    - **Validates: Requirements 1.7, 6.2, 6.4, 6.5**

### Phase 1: Navigation Filtering

- [x] 19. Update navigation for feature gating
  - [x] 19.1 Filter settings navigation based on capabilities
    - Hide Integrations tab if !useHasIntegrations()
    - Hide Data Manager tab if !useHasDataManager()
    - _Requirements: 14.8_

### Phase 1: Checkpoint

- [x] 20. Checkpoint - Phase 1 complete
  - Verify all integration cards display correctly (full build)
  - Verify cards are hidden in lite build
  - Verify connect/test/disconnect/summary/logs flows work
  - Verify Data Manager seed/upload/purge works
  - Verify status persists across page refresh
  - Ask the user if questions arise

### Phase 2: Database Schema

- [x] 21. Create payments migration
  - [x] 21.1 Create migration 052_payments_phase2.sql
    - Create `payments` table for Checkout Sessions
    - Create `webhook_events` table for idempotent webhook processing
    - Add indexes for order_id, provider_ref, status
    - _Requirements: 13.4_

### Phase 2: Stripe Checkout

- [x] 22. Implement Stripe Checkout Session
  - [x] 22.1 Create checkout.rs in Stripe connector
    - Create Checkout Session under connected account
    - Return checkout URL
    - _Requirements: 12.1, 12.2_
  
  - [x] 22.2 Implement idempotent session creation
    - Same order_id returns existing session if not expired
    - _Requirements: 12.9_
  
  - [x] 22.3 Write property test for idempotent checkout
    - **Property 9: Idempotent Checkout Session**
    - **Validates: Requirements 12.9**

- [x] 23. Implement Stripe webhook handler
  - [x] 23.1 Create payments.rs handlers
    - POST /api/payments/checkout-session
    - POST /api/payments/webhooks/stripe
    - GET /api/payments/orders/{order_id}/payment
    - _Requirements: 12.1, 12.3, 12.8_
  
  - [x] 23.2 Implement webhook signature verification
    - Verify signature using STRIPE_WEBHOOK_SECRET
    - Reject invalid signatures
    - _Requirements: 12.6_
  
  - [x] 23.3 Implement payment status updates
    - Update payment record on checkout.session.completed
    - Update payment record on checkout.session.expired
    - _Requirements: 12.4, 12.5, 13.2_
  
  - [x] 23.4 Write property test for webhook signature verification
    - **Property 10: Webhook Signature Verification**
    - **Validates: Requirements 12.6**
  
  - [x] 23.5 Write property test for payment status updates
    - **Property 11: Payment Status Updates from Webhooks**
    - **Validates: Requirements 12.4, 12.5, 13.2**

### Phase 2: Frontend - Checkout

- [x] 24. Implement Stripe checkout UI
  - [x] 24.1 Create StripeCheckoutButton component
    - Create frontend/src/sales/components/StripeCheckoutButton.tsx
    - "Pay with Stripe" button
    - Only render if useHasPayments() returns true
    - _Requirements: 12.1, 14.3_
  
  - [x] 24.2 Implement checkout flow
    - Call createCheckoutSession API
    - Display checkout URL (link or QR code)
    - Poll or refresh for payment status
    - _Requirements: 12.2, 12.8_

- [x] 25. Add payment API methods to syncApi
  - [x] 25.1 Add payment methods
    - createCheckoutSession(), getPaymentStatus()
    - _Requirements: 10.1, 10.2_

### Phase 2: Checkpoint

- [x] 26. Checkpoint - Phase 2 complete
  - Verify Checkout Session creation works
  - Verify webhook updates payment status
  - Verify payment status displays on order
  - Ask the user if questions arise

### Documentation

- [x] 27. Create setup documentation
  - [x] 27.1 Create docs/integrations/stripe-connect-setup.md
    - How to create Stripe Connect app
    - How to get platform credentials
    - How to set OAuth redirect URI
    - How to create webhook endpoint
    - _Requirements: 14.10_
  
  - [x] 27.2 Create docs/integrations/square-setup.md
    - How to get Square API credentials
    - _Requirements: 14.10_
  
  - [x] 27.3 Create docs/integrations/clover-setup.md
    - How to create Clover app
    - How to get app credentials
    - _Requirements: 14.10_

### Final

- [x] 28. Final checkpoint - All features complete
  - Verify lite build works (core POS, manual payment selection)
  - Verify full build works (all integrations + Stripe checkout)
  - Verify no hardcoded colors (use semantic tokens)
  - Verify navigation filtering works
  - Build passes (frontend + backend)
  - Ask the user if questions arise

## Notes

- All tasks are required (no optional markers)
- Phase 1: Integration management (connect/test/status/summary/logs/disconnect)
- Phase 2: Stripe Checkout Sessions with webhooks
- Lite build: Core POS with manual payment type selection
- Full build: All integrations requiring personal setup
- No "Coming Soon" placeholders - cards hidden if not implemented
- All new components must use semantic tokens (no hardcoded colors)
- Each task references specific requirements for traceability

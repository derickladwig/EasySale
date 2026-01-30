# Requirements Document

## Introduction

This document specifies the requirements for completing payment provider integrations (Stripe, Square, Clover) and Supabase Hub enhancements with full end-to-end usability. Phase 1 covers integration management with real data reads. Phase 2 covers Stripe hosted checkout (Payment Links/Checkout Sessions) for POS orders with webhook updates. Terminal hardware flows are out of scope.

**Key Rule:** Cards are hidden unless fully functional. No "Coming Soon" placeholders.

## Glossary

- **Integration_System**: The module responsible for managing external platform connections, credentials, and status
- **Payment_Connector**: A backend module that interfaces with a payment provider's API (Stripe, Square, or Clover)
- **Credential_Service**: The service that securely stores and retrieves encrypted API keys and OAuth tokens
- **Sync_Orchestrator**: The service that coordinates data synchronization between the POS and external platforms
- **Connection_Status**: The current state of an integration (connected, disconnected, error)
- **OAuth_Flow**: The authentication process using OAuth 2.0 for platforms requiring user authorization
- **Webhook_Handler**: A backend endpoint that receives real-time event notifications from external platforms
- **Idempotency_Key**: A unique identifier ensuring operations are not duplicated on retry
- **Tenant_ID**: The unique identifier for a business/tenant in the multi-tenant system
- **Checkout_Session**: A Stripe session for collecting payment information via hosted checkout
- **Data_Manager**: The module for bulk data operations (seed load, upload, purge)

## Requirements

### Requirement 1: Stripe Payment Integration (Connect OAuth)

**User Story:** As a store owner, I want to connect my Stripe account to EasySale via OAuth, so that I can accept payments through Stripe's hosted checkout.

#### Acceptance Criteria

1. WHEN a user navigates to Settings → Integrations THEN the Integration_System SHALL display a Stripe integration card with current connection status
2. WHEN a user clicks "Connect Stripe" THEN the Integration_System SHALL redirect to Stripe's OAuth authorization URL with proper state parameter
3. WHEN Stripe OAuth callback is received THEN the Integration_System SHALL validate the state parameter, exchange the code for tokens, and store the connected account ID securely
4. WHEN a user clicks "Test Connection" for Stripe THEN the Payment_Connector SHALL validate the connection by calling Stripe's API
5. WHEN a user clicks "Disconnect" for Stripe THEN the Credential_Service SHALL delete the stored tokens and connected account mapping
6. IF the OAuth state parameter is invalid or expired THEN the Integration_System SHALL reject the callback and display a security error
7. THE Payment_Connector SHALL never log or expose the full Stripe tokens or connected account ID in responses or logs
8. WHEN Stripe is connected THEN the Integration_System SHALL display a summary of account data (business name, country, default currency, masked connected account ID)

### Requirement 2: Square Payment Integration

**User Story:** As a store owner, I want to connect Square to my POS, so that I can view my Square account data.

#### Acceptance Criteria

1. WHEN a user navigates to Settings → Integrations THEN the Integration_System SHALL display a Square integration card with current connection status
2. WHEN a user configures Square credentials (access token, location ID) THEN the Credential_Service SHALL encrypt and store the credentials
3. WHEN a user clicks "Test Connection" for Square THEN the Payment_Connector SHALL validate the access token by calling Square's Locations API
4. WHEN Square credentials are stored successfully THEN the Integration_System SHALL update the connection status to "connected"
5. WHEN a user clicks "Disconnect" for Square THEN the Credential_Service SHALL delete the stored credentials and update status to "disconnected"
6. IF invalid Square credentials are provided THEN the Integration_System SHALL display a clear error message without storing the invalid credentials
7. THE Payment_Connector SHALL never log or expose the full Square access token in responses or logs
8. WHEN Square is connected THEN the Integration_System SHALL display a summary of location data (location name, address, capabilities)

### Requirement 3: Clover Payment Integration

**User Story:** As a store owner, I want to connect Clover to my POS via OAuth, so that I can view my Clover merchant data.

#### Acceptance Criteria

1. WHEN a user navigates to Settings → Integrations THEN the Integration_System SHALL display a Clover integration card with current connection status
2. WHEN a user initiates Clover OAuth connection THEN the Integration_System SHALL redirect to Clover's OAuth authorization URL with proper state parameter
3. WHEN Clover OAuth callback is received THEN the Integration_System SHALL validate the state parameter, exchange the code for tokens, and store them securely
4. WHEN a user clicks "Test Connection" for Clover THEN the Payment_Connector SHALL validate the OAuth tokens by calling Clover's Merchant API
5. WHEN a user clicks "Disconnect" for Clover THEN the Credential_Service SHALL delete the stored OAuth tokens and update status to "disconnected"
6. IF the OAuth state parameter is invalid or expired THEN the Integration_System SHALL reject the callback and display a security error
7. THE Payment_Connector SHALL never log or expose Clover OAuth tokens in responses or logs
8. WHERE Clover OAuth tokens expire THEN the Integration_System SHALL automatically refresh them using the refresh token
9. WHEN Clover is connected THEN the Integration_System SHALL display a summary of merchant data (merchant name, address)

### Requirement 4: Supabase Hub Enhancement

**User Story:** As a store owner, I want the Supabase Hub to reliably sync data with proper tenant isolation.

#### Acceptance Criteria

1. WHEN a user configures Supabase credentials THEN the Integration_System SHALL validate the project URL format and service role key
2. WHEN data is synced to Supabase THEN the Sync_Orchestrator SHALL include an idempotency key to prevent duplicate records
3. WHEN data is synced to Supabase THEN the Sync_Orchestrator SHALL include the tenant_id to ensure proper data isolation
4. WHEN a sync operation fails THEN the Sync_Orchestrator SHALL queue the operation for retry with exponential backoff
5. THE Supabase_Client SHALL enforce tenant_id scoping on all read and write operations
6. WHEN viewing Supabase status THEN the Integration_System SHALL display the last successful sync timestamp and pending queue count

### Requirement 5: Integration UI Consistency

**User Story:** As a user, I want all integration cards to behave consistently with real data.

#### Acceptance Criteria

1. WHEN an integration card is displayed THEN the Integration_System SHALL show: name, description, status indicator, and action buttons
2. WHEN an integration is connected THEN the Integration_System SHALL display a green status indicator, "Connected" label, and summary data
3. WHEN an integration is disconnected THEN the Integration_System SHALL display a gray status indicator and "Not Connected" label
4. WHEN an integration has an error THEN the Integration_System SHALL display a red status indicator and the error message
5. WHEN credentials are being saved THEN the Integration_System SHALL display a loading state and disable the save button
6. THE Integration_System SHALL display "Test Connection" and "Save" buttons for all integration configuration forms
7. WHEN an integration is connected THEN the Integration_System SHALL display a summary section with real data from the provider

### Requirement 6: Credential Security

**User Story:** As a system administrator, I want all integration credentials to be stored securely.

#### Acceptance Criteria

1. THE Credential_Service SHALL encrypt all API keys and OAuth tokens before storing in the database
2. THE Credential_Service SHALL never return full credentials in API responses (only masked versions)
3. WHEN credentials are deleted THEN the Credential_Service SHALL permanently remove them from storage
4. THE Integration_System SHALL never include credentials in frontend state that persists to localStorage
5. THE Integration_System SHALL never log full credentials in application logs
6. WHEN OAuth redirect URIs are configured THEN the Integration_System SHALL read them from environment variables
7. IF a production environment detects localhost in an OAuth redirect URI THEN the Integration_System SHALL reject the configuration

### Requirement 7: Integration Card Visibility

**User Story:** As a user, I want to only see integration cards that are fully functional.

#### Acceptance Criteria

1. THE Integration_System SHALL only display integration cards for providers with fully implemented backend endpoints
2. THE Integration_System SHALL NOT display "Coming Soon" placeholders or disabled cards for unimplemented features
3. WHEN a backend endpoint does not exist THEN the Integration_System SHALL hide the corresponding integration card entirely
4. THE Integration_System SHALL NOT present any UI element that does not have a working backend implementation

### Requirement 8: Connection Testing

**User Story:** As a user, I want to test my integration connections to verify credentials are correct.

#### Acceptance Criteria

1. WHEN a user clicks "Test Connection" THEN the Payment_Connector SHALL make a lightweight API call to verify credentials
2. WHEN the test succeeds THEN the Integration_System SHALL display a success message and update the last verified timestamp
3. WHEN the test fails THEN the Integration_System SHALL display the specific error message from the external platform
4. WHEN testing a connection THEN the Integration_System SHALL display a loading indicator on the test button
5. THE Payment_Connector SHALL use appropriate test endpoints that don't create or modify data

### Requirement 9: Frontend Control Surface

**User Story:** As a user, I want every integration to be fully controllable through the UI.

**Rule:** An integration is considered implemented only if fully controllable via frontend UI. Backend-only functionality is disallowed.

#### Acceptance Criteria

1. EACH integration (Stripe, Square, Clover, Supabase) SHALL have a visible control surface at Settings → Integrations page
2. EACH integration card SHALL expose: Connect, Disconnect, Test Connection, Status indicator, Summary data
3. WHERE an integration has logs THEN the UI SHALL expose a Logs view with timestamp and severity
4. IF no frontend component exists for an integration THEN that integration SHALL be hidden entirely
5. THE Integration_System SHALL NOT present any backend capability that lacks a corresponding UI control
6. Integration status, last sync time, and configuration SHALL persist across app restarts

### Requirement 10: UI ↔ API Wiring Contract

**User Story:** As a developer, I want a clear contract between UI controls and backend endpoints.

#### Acceptance Criteria

1. EVERY UI button or form in the Integrations page SHALL call a real backend endpoint
2. EVERY backend integration endpoint SHALL be reachable from at least one UI control
3. UI state SHALL be derived from backend responses, not hardcoded values
4. Error states SHALL be displayed with the actual error message from the backend
5. WHEN a user clicks a button THEN the UI SHALL show loading state until the backend responds
6. THE Integration_System SHALL NOT display mock data or placeholder responses as real functionality
7. EACH provider SHALL implement these backend endpoints:
   - GET /api/integrations/{provider}/status
   - POST /api/integrations/{provider}/auth-url (for OAuth providers: Stripe, Clover)
   - GET /api/integrations/{provider}/callback (for OAuth providers)
   - POST /api/integrations/{provider}/credentials (for API key providers: Square, Supabase)
   - POST /api/integrations/{provider}/test
   - DELETE /api/integrations/{provider}/disconnect
   - GET /api/integrations/{provider}/summary
   - GET /api/integrations/{provider}/logs

### Requirement 11: Data Manager

**User Story:** As a store owner, I want to manage bulk data operations (seed load, upload, purge).

#### Acceptance Criteria

1. WHEN a user navigates to Settings → Data Manager THEN the Data_Manager SHALL display options for seed load, upload, and purge
2. WHEN a user uploads a CSV file THEN the Data_Manager SHALL validate the format and import records with a batch ID
3. WHEN a user requests a purge THEN the Data_Manager SHALL delete records by batch ID with confirmation
4. WHEN a bulk operation is in progress THEN the Data_Manager SHALL display progress and allow cancellation
5. THE Data_Manager SHALL log all bulk operations for audit purposes
6. WHEN a bulk operation fails THEN the Data_Manager SHALL rollback partial changes and display the error

### Requirement 12: Stripe Hosted Checkout (Phase 2)

**User Story:** As a store owner, I want to create Stripe Checkout Sessions for POS orders so customers can pay via Stripe's hosted page.

#### Acceptance Criteria

1. WHEN a user completes a POS order and selects "Pay with Stripe" THEN the Integration_System SHALL create a Stripe Checkout Session
2. WHEN a Checkout Session is created THEN the Integration_System SHALL return a checkout URL for display as QR code or link
3. WHEN a customer completes payment THEN Stripe SHALL send a webhook event to the POS
4. WHEN a checkout.session.completed webhook is received THEN the Integration_System SHALL update the order payment status to "paid"
5. WHEN a checkout.session.expired webhook is received THEN the Integration_System SHALL update the order payment status to "expired"
6. THE Integration_System SHALL verify webhook signatures using the webhook secret from environment variables
7. THE Integration_System SHALL store payment records with: order_id, stripe_session_id, amount, currency, status, timestamps
8. WHEN viewing an order THEN the Integration_System SHALL display the payment status and Stripe reference
9. THE Integration_System SHALL support idempotent Checkout Session creation (same order_id returns existing session if not expired)

### Requirement 14: Feature Gating by Build Variant and User Tier

**User Story:** As a platform operator, I want integrations to be gated by build variant (lite/full) and user tier (free/paid), so that free users on the lite build don't see or access premium features.

#### Acceptance Criteria

1. THE Integration_System SHALL support three build variants: lite, export, full
2. WHEN the lite build is compiled THEN the Integration_System SHALL NOT include Stripe, Square, Clover, or QuickBooks integration crates
3. WHEN the lite build is running THEN the Integration_System SHALL hide all payment provider cards from the UI
4. WHEN a free user is logged in THEN the Integration_System SHALL disable (but show) premium integration cards with "Upgrade to access" message
5. WHEN a paid user is logged in THEN the Integration_System SHALL enable all integration cards available in the build variant
6. THE build system SHALL use Cargo features to conditionally compile integration crates
7. THE frontend SHALL read feature flags from the backend to determine which cards to show/hide/disable
8. THE navigation SHALL NOT show tabs or menu items for features not available in the current build variant
9. THE lite build SHALL NOT download or bundle integration-related dependencies (no bloat)
10. THE UI and global styling rules SHALL be identical across all build variants

### Requirement 15: Build Variant Configuration

**User Story:** As a developer, I want clear separation between build variants, so that the lite build is minimal and the full build has all features.

#### Acceptance Criteria

1. THE Cargo.toml SHALL define features: `lite`, `export`, `full`, `integrations`, `payments`
2. WHEN building with `--features lite` THEN only core POS functionality SHALL be compiled
3. WHEN building with `--features full` THEN all integrations and payment features SHALL be compiled
4. THE frontend build SHALL read `VITE_BUILD_VARIANT` environment variable to determine feature availability
5. THE backend SHALL expose GET /api/capabilities endpoint returning available features for the current build
6. THE Integration_System SHALL check capabilities before rendering integration cards


### Requirement 13: Payment Records Persistence

**User Story:** As a store owner, I want payment records to be persisted for tracking and reconciliation.

#### Acceptance Criteria

1. THE Integration_System SHALL create a payment record when a Checkout Session is created
2. THE Integration_System SHALL update the payment record when webhook events are received
3. WHEN viewing payment history THEN the Integration_System SHALL display all payment records with status
4. THE Integration_System SHALL store: order_id, provider, provider_ref, amount, currency, status, webhook_events, timestamps
5. THE Integration_System SHALL support querying payments by order_id, status, and date range

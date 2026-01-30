-- Migration: Payments Phase 2
-- Description: Create payments table for Stripe Checkout Sessions
-- Requirements: 13.4

-- Payments table for tracking Checkout Sessions
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_ref TEXT,  -- Stripe checkout session ID
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, expired, failed
    checkout_url TEXT,
    metadata TEXT,  -- JSON metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    expires_at TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- Webhook events table for tracking received webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL,  -- Provider's event ID for idempotency
    payload TEXT NOT NULL,  -- Raw JSON payload
    processed BOOLEAN NOT NULL DEFAULT 0,
    processed_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

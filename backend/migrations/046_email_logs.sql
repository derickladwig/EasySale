-- Email logs table for tracking sent receipts and notifications
-- Migration: 046_email_logs.sql

CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(id)
);

-- Index for querying by tenant and transaction
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_transaction ON email_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

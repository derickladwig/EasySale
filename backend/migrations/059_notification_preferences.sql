-- Migration 059: Notification Preferences
-- Add notification preferences table for user email notification settings

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    
    -- Notification types
    low_stock_alerts BOOLEAN NOT NULL DEFAULT 1,
    appointment_reminders BOOLEAN NOT NULL DEFAULT 1,
    invoice_notifications BOOLEAN NOT NULL DEFAULT 1,
    work_order_completion BOOLEAN NOT NULL DEFAULT 1,
    payment_receipts BOOLEAN NOT NULL DEFAULT 1,
    
    -- Email settings
    email_address TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id);

-- Email queue for retry logic
CREATE TABLE IF NOT EXISTS email_queue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    
    -- Email details
    to_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Template info
    template_name TEXT,
    template_data TEXT, -- JSON
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sending, sent, failed
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TEXT,
    last_error TEXT,
    
    -- Scheduling
    scheduled_for TEXT NOT NULL,
    sent_at TEXT,
    
    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_tenant ON email_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';

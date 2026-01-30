-- Migration: Sync Queue Resilience Features
-- Description: Adds idempotency keys and priority ordering to sync_queue
-- Tasks: TASK-006 (Idempotency Keys), TASK-008 (Ordering Constraints)
-- Date: 2026-01-29

-- Add idempotency_key column for deduplication
ALTER TABLE sync_queue ADD COLUMN idempotency_key TEXT;

-- Add priority column for dependency-ordered processing
ALTER TABLE sync_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 99;

-- Create unique index on idempotency_key (only for non-null values)
-- This prevents duplicate operations from being queued
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_idempotency 
    ON sync_queue(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Create index for priority-ordered fetching
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority 
    ON sync_queue(tenant_id, sync_status, priority, created_at);

-- Update existing records with priority based on entity_type
UPDATE sync_queue SET priority = 
    CASE entity_type
        WHEN 'customer' THEN 0
        WHEN 'product' THEN 1
        WHEN 'inventory' THEN 2
        WHEN 'order' THEN 3
        WHEN 'invoice' THEN 4
        WHEN 'payment' THEN 5
        ELSE 99
    END
WHERE priority = 99;

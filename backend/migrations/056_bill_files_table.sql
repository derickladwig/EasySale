-- Migration 056: Bill Files Table
-- Created: 2026-01-31
-- Purpose: Store file metadata for uploaded documents (vendor bills, review cases, etc.)

-- Create bill_files table for file management
CREATE TABLE IF NOT EXISTS bill_files (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'vendor_bill', 'review_case', 'product', etc.
    entity_id TEXT NOT NULL,    -- ID of the related entity
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    deleted_at TEXT             -- Soft delete support
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bill_files_tenant ON bill_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bill_files_entity ON bill_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bill_files_created ON bill_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_files_uploaded_by ON bill_files(uploaded_by);

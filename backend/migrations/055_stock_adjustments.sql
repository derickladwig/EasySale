-- Migration 055: Stock Adjustments Audit Table
-- Created: 2026-01-30
-- Purpose: Track all stock adjustments with full audit trail

-- Create stock adjustments table for audit trail
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id TEXT NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('add', 'subtract', 'set')),
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_tenant ON stock_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_user ON stock_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_reason ON stock_adjustments(reason);

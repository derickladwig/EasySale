-- Migration 057: Add location and store tracking to stock adjustments
-- Created: 2026-01-31
-- Purpose: Enable multi-store and multi-location inventory tracking

-- Add store_id and location_id columns to stock_adjustments
ALTER TABLE stock_adjustments ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE stock_adjustments ADD COLUMN location_id TEXT;

-- Add indexes for store and location queries
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_store ON stock_adjustments(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_location ON stock_adjustments(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_store_product ON stock_adjustments(store_id, product_id);

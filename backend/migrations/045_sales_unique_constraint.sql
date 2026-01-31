-- Migration 045: Add UNIQUE constraint to transaction_number
-- Date: 2026-01-30
-- Description: Ensure transaction numbers are unique per tenant

-- Add unique index on tenant_id + transaction_number combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_transactions_unique_number 
ON sales_transactions(tenant_id, transaction_number);

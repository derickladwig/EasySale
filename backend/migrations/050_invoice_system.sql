-- Migration: Invoice System for Work Orders
-- Purpose: Enable automatic invoice creation when work orders are completed
-- Created: 2026-01-31

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    work_order_id INTEGER,
    customer_id INTEGER NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT,
    subtotal REAL NOT NULL,
    tax_amount REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(tenant_id, invoice_number)
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 0,
    discount_rate REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Add invoiced_at column to work_orders table (if not already exists)
-- Note: This column was added in migration 002, but we include it here for completeness
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we handle this in application code
-- ALTER TABLE work_orders ADD COLUMN invoiced_at TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_product ON invoice_line_items(product_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp 
AFTER UPDATE ON invoices
BEGIN
    UPDATE invoices SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default invoice number sequence for each tenant
-- Invoice numbers will be formatted as INV-YYYYMMDD-NNNN
-- This is handled in the application layer, not in the database

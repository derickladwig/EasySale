-- Estimates table for quote generation
-- Estimates can be converted to invoices or work orders

CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
    estimate_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    estimate_date TEXT NOT NULL,
    expiration_date TEXT,
    subtotal REAL NOT NULL DEFAULT 0.0,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    total_amount REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected, expired, converted
    terms TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    converted_to_invoice_id TEXT,
    converted_to_work_order_id TEXT,
    store_id TEXT NOT NULL DEFAULT 'default-store',
    sync_version INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(tenant_id, estimate_number)
);

CREATE INDEX IF NOT EXISTS idx_estimates_tenant_id ON estimates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(estimate_date);

-- Estimate line items table
CREATE TABLE IF NOT EXISTS estimate_line_items (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    product_id TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 0.0,
    discount_rate REAL NOT NULL DEFAULT 0.0,
    line_total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_product_id ON estimate_line_items(product_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_estimates_timestamp 
AFTER UPDATE ON estimates
BEGIN
    UPDATE estimates SET updated_at = datetime('now') WHERE id = NEW.id;
END;

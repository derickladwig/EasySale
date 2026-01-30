-- Migration 044: Sales Transactions Table
-- Date: 2026-01-27
-- Description: Create sales_transactions and sales_line_items tables for reporting

-- Sales transactions table
CREATE TABLE IF NOT EXISTS sales_transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    transaction_number TEXT NOT NULL,
    customer_id TEXT,
    employee_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    station_id TEXT,
    total_amount REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    items_count INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT NOT NULL DEFAULT 'completed',
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    voided_at TEXT,
    voided_by TEXT,
    void_reason TEXT,
    sync_version INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_tenant_id ON sales_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer_id ON sales_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_employee_id ON sales_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_store_id ON sales_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON sales_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON sales_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_number ON sales_transactions(transaction_number);

-- Sales line items table (also referenced as sales_transaction_lines in some queries)
CREATE TABLE IF NOT EXISTS sales_line_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL,
    cost REAL,
    profit REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_line_items_transaction_id ON sales_line_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_product_id ON sales_line_items(product_id);

-- Create alias view for compatibility with queries using sales_transaction_lines
CREATE VIEW IF NOT EXISTS sales_transaction_lines AS
SELECT * FROM sales_line_items;

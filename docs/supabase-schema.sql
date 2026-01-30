-- Supabase Schema for Universal Data Sync
-- 
-- This schema creates tables for storing synchronized data from external platforms
-- (WooCommerce, QuickBooks, POS) for analytics and backup purposes.
--
-- Requirements: 13.2, 13.4

-- ============================================================================
-- Orders Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL, -- 'woocommerce', 'pos', 'manual'
    source_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    billing_address JSONB,
    shipping_address JSONB,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shipping_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_status TEXT, -- 'pending', 'paid', 'refunded', 'partial'
    raw_data JSONB, -- Original payload from source system
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint for upsert idempotency
    CONSTRAINT unique_order_source UNIQUE (source_system, source_id)
);

CREATE INDEX idx_orders_source ON orders(source_system, source_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_synced ON orders(synced_at);

-- ============================================================================
-- Order Lines Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    source_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    sku TEXT,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    tax_class TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_order_line_source UNIQUE (source_system, source_id)
);

CREATE INDEX idx_order_lines_order ON order_lines(order_id);
CREATE INDEX idx_order_lines_product ON order_lines(product_id);
CREATE INDEX idx_order_lines_sku ON order_lines(sku);

-- ============================================================================
-- Products Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    source_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT, -- 'simple', 'variable', 'service'
    price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    taxable BOOLEAN DEFAULT true,
    track_inventory BOOLEAN DEFAULT false,
    stock_quantity DECIMAL(10, 3),
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_product_source UNIQUE (source_system, source_id)
);

CREATE INDEX idx_products_source ON products(source_system, source_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_synced ON products(synced_at);

-- ============================================================================
-- Customers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    source_id TEXT NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_customer_source UNIQUE (source_system, source_id)
);

CREATE INDEX idx_customers_source ON customers(source_system, source_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(display_name);
CREATE INDEX idx_customers_synced ON customers(synced_at);

-- ============================================================================
-- Invoices Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    source_id TEXT NOT NULL,
    doc_number TEXT,
    customer_id UUID REFERENCES customers(id),
    txn_date DATE NOT NULL,
    due_date DATE,
    total_amt DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2),
    status TEXT, -- 'draft', 'sent', 'paid', 'overdue'
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_invoice_source UNIQUE (source_system, source_id)
);

CREATE INDEX idx_invoices_source ON invoices(source_system, source_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_doc_number ON invoices(doc_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_synced ON invoices(synced_at);

-- ============================================================================
-- ID Mappings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    source_entity TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_system TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint for upsert idempotency
    CONSTRAINT unique_id_mapping UNIQUE (source_system, source_entity, source_id, target_system, target_entity)
);

CREATE INDEX idx_id_mappings_source ON id_mappings(source_system, source_entity, source_id);
CREATE INDEX idx_id_mappings_target ON id_mappings(target_system, target_entity, target_id);

-- ============================================================================
-- Sync Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    source_system TEXT NOT NULL,
    target_system TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'warning', 'error'
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- No unique constraint - allow multiple log entries
    CHECK (status IN ('success', 'warning', 'error'))
);

CREATE INDEX idx_sync_logs_sync_id ON sync_logs(sync_id);
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at);
CREATE INDEX idx_sync_logs_source ON sync_logs(source_system);
CREATE INDEX idx_sync_logs_target ON sync_logs(target_system);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) - Optional
-- ============================================================================

-- Enable RLS on all tables (uncomment if using multi-tenant Supabase)
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE id_mappings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (customize based on your auth setup)
-- CREATE POLICY "Users can view their own data" ON orders
--     FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- Sales summary by source system
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
    source_system,
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS order_count,
    SUM(total) AS total_sales,
    SUM(tax_total) AS total_tax,
    SUM(shipping_total) AS total_shipping,
    AVG(total) AS avg_order_value
FROM orders
WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY source_system, DATE_TRUNC('day', created_at);

-- Product performance
CREATE OR REPLACE VIEW product_performance AS
SELECT 
    p.sku,
    p.name,
    p.source_system,
    COUNT(ol.id) AS times_sold,
    SUM(ol.quantity) AS total_quantity,
    SUM(ol.total) AS total_revenue
FROM products p
LEFT JOIN order_lines ol ON p.id = ol.product_id
GROUP BY p.id, p.sku, p.name, p.source_system;

-- Customer lifetime value
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT 
    c.id,
    c.display_name,
    c.email,
    c.source_system,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS lifetime_value,
    MAX(o.created_at) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.display_name, c.email, c.source_system;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE orders IS 'Synchronized orders from all source systems';
COMMENT ON TABLE order_lines IS 'Line items for synchronized orders';
COMMENT ON TABLE products IS 'Synchronized products from all source systems';
COMMENT ON TABLE customers IS 'Synchronized customers from all source systems';
COMMENT ON TABLE invoices IS 'Synchronized invoices from accounting systems';
COMMENT ON TABLE id_mappings IS 'Cross-system entity ID mappings for sync coordination';
COMMENT ON TABLE sync_logs IS 'Audit log of all sync operations';

COMMENT ON COLUMN orders.raw_data IS 'Original JSON payload from source system for debugging';
COMMENT ON COLUMN orders.synced_at IS 'Timestamp when record was last synced from source';
COMMENT ON COLUMN id_mappings.source_system IS 'Source system name (woocommerce, pos, etc.)';
COMMENT ON COLUMN id_mappings.target_system IS 'Target system name (quickbooks, supabase, etc.)';

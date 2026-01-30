-- Performance optimization indexes for frequently queried columns
-- Task 28.4: Add database indexes

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_station_id ON users(station_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_pricing_tier ON customers(pricing_tier);

-- Sessions table indexes (some already created in migration 001)
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_store_role ON users(store_id, role);

-- Analyze tables to update statistics for query optimizer
ANALYZE;

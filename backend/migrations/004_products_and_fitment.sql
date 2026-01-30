-- Products and Fitment Database Schema
-- This migration adds product catalog and vehicle fitment data

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    unit_price REAL NOT NULL,
    cost REAL NOT NULL,
    quantity_on_hand REAL NOT NULL DEFAULT 0.0,
    reorder_point REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_version INTEGER NOT NULL DEFAULT 0,
    store_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Vehicle fitment table (ACES/PIES standard inspired)
-- Maps products to compatible vehicles
CREATE TABLE IF NOT EXISTS vehicle_fitment (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year_start INTEGER NOT NULL,
    year_end INTEGER NOT NULL,
    engine TEXT,
    trim TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fitment_product_id ON vehicle_fitment(product_id);
CREATE INDEX IF NOT EXISTS idx_fitment_make_model ON vehicle_fitment(make, model);
CREATE INDEX IF NOT EXISTS idx_fitment_year ON vehicle_fitment(year_start, year_end);

-- Maintenance schedules table
-- Stores manufacturer-recommended maintenance intervals
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT,
    year_start INTEGER,
    year_end INTEGER,
    service_type TEXT NOT NULL,
    description TEXT NOT NULL,
    mileage_interval INTEGER,
    time_interval_months INTEGER,
    priority TEXT NOT NULL DEFAULT 'medium', -- high, medium, low
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_make_model ON maintenance_schedules(make, model);
CREATE INDEX IF NOT EXISTS idx_maintenance_year ON maintenance_schedules(year_start, year_end);

-- Insert sample products for testing
INSERT OR IGNORE INTO products (id, sku, name, description, category, subcategory, unit_price, cost, quantity_on_hand, store_id)
VALUES 
    ('prod-001', 'OIL-5W30-5L', 'Synthetic Motor Oil 5W-30 5L', 'Premium synthetic motor oil', 'Automotive', 'Fluids', 29.99, 15.00, 50.0, 'store-001'),
    ('prod-002', 'FILTER-OIL-STD', 'Standard Oil Filter', 'Universal oil filter', 'Automotive', 'Filters', 8.99, 4.50, 100.0, 'store-001'),
    ('prod-003', 'BRAKE-PAD-FRONT', 'Front Brake Pads', 'Ceramic brake pads', 'Automotive', 'Brakes', 49.99, 25.00, 30.0, 'store-001'),
    ('prod-004', 'AIR-FILTER-STD', 'Engine Air Filter', 'Standard engine air filter', 'Automotive', 'Filters', 12.99, 6.50, 75.0, 'store-001'),
    ('prod-005', 'WIPER-BLADE-24', 'Wiper Blade 24"', 'All-season wiper blade', 'Automotive', 'Wipers', 14.99, 7.50, 40.0, 'store-001');

-- Insert sample fitment data
INSERT OR IGNORE INTO vehicle_fitment (id, product_id, make, model, year_start, year_end, engine, notes)
VALUES
    ('fit-001', 'prod-001', 'Honda', 'Civic', 2016, 2023, '1.5L Turbo', 'Compatible with all trims'),
    ('fit-002', 'prod-001', 'Honda', 'Accord', 2018, 2023, '1.5L Turbo', 'Compatible with all trims'),
    ('fit-003', 'prod-002', 'Honda', 'Civic', 2016, 2023, NULL, 'Universal fit'),
    ('fit-004', 'prod-002', 'Honda', 'Accord', 2018, 2023, NULL, 'Universal fit'),
    ('fit-005', 'prod-003', 'Honda', 'Civic', 2016, 2023, NULL, 'Front brake pads'),
    ('fit-006', 'prod-004', 'Honda', 'Civic', 2016, 2023, NULL, 'Engine air filter'),
    ('fit-007', 'prod-005', 'Honda', 'Civic', 2016, 2023, NULL, 'Driver side 24"');

-- Insert sample maintenance schedules
INSERT OR IGNORE INTO maintenance_schedules (id, make, model, year_start, year_end, service_type, description, mileage_interval, time_interval_months, priority)
VALUES
    ('maint-001', 'Honda', 'Civic', 2016, 2023, 'Oil Change', 'Engine oil and filter replacement', 8000, 6, 'high'),
    ('maint-002', 'Honda', 'Civic', 2016, 2023, 'Tire Rotation', 'Rotate tires for even wear', 10000, NULL, 'medium'),
    ('maint-003', 'Honda', 'Civic', 2016, 2023, 'Air Filter Replacement', 'Replace engine air filter', 24000, 12, 'medium'),
    ('maint-004', 'Honda', 'Civic', 2016, 2023, 'Brake Inspection', 'Inspect brake pads, rotors, and fluid', 16000, 12, 'high'),
    ('maint-005', 'Honda', 'Civic', 2016, 2023, 'Transmission Fluid', 'Replace transmission fluid', 48000, 36, 'medium'),
    ('maint-006', 'Honda', 'Accord', 2018, 2023, 'Oil Change', 'Engine oil and filter replacement', 8000, 6, 'high'),
    ('maint-007', 'Honda', 'Accord', 2018, 2023, 'Tire Rotation', 'Rotate tires for even wear', 10000, NULL, 'medium'),
    ('maint-008', 'Honda', 'Accord', 2018, 2023, 'Air Filter Replacement', 'Replace engine air filter', 24000, 12, 'medium'),
    ('maint-009', 'Honda', 'Accord', 2018, 2023, 'Brake Inspection', 'Inspect brake pads, rotors, and fluid', 16000, 12, 'high');


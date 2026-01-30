-- Remove Vehicle Functionality Migration
-- This migration removes the vehicles table and makes work_orders.vehicle_id optional
-- since vehicle tracking is not needed for most consumers

-- Drop vehicles table and related indexes
DROP INDEX IF EXISTS idx_vehicles_customer_id;
DROP INDEX IF EXISTS idx_vehicles_vin;
DROP TABLE IF EXISTS vehicles;

-- Remove vehicle_id index from work_orders
DROP INDEX IF EXISTS idx_work_orders_vehicle_id;

-- Recreate work_orders table with vehicle_id as optional
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new work_orders table with vehicle_id as optional
CREATE TABLE IF NOT EXISTS work_orders_new (
    id TEXT PRIMARY KEY,
    work_order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    vehicle_id TEXT,  -- Now optional
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_total REAL,
    actual_total REAL,
    labor_total REAL NOT NULL DEFAULT 0.0,
    parts_total REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    invoiced_at TEXT,
    assigned_technician_id TEXT,
    is_warranty INTEGER NOT NULL DEFAULT 0,
    sync_version INTEGER NOT NULL DEFAULT 0,
    store_id TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
);

-- Step 2: Copy data from old table to new table
INSERT INTO work_orders_new 
SELECT id, work_order_number, customer_id, vehicle_id, status, description, 
       estimated_total, actual_total, labor_total, parts_total, created_at, updated_at, 
       completed_at, invoiced_at, assigned_technician_id, is_warranty, sync_version, store_id
FROM work_orders;

-- Step 3: Drop old table
DROP TABLE work_orders;

-- Step 4: Rename new table to original name
ALTER TABLE work_orders_new RENAME TO work_orders;

-- Step 5: Recreate indexes (excluding vehicle_id index)
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number);


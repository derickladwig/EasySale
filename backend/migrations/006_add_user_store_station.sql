-- Migration: Add store and station fields to users table
-- Required for multi-store operations and station assignment

-- Add store_id column to users
ALTER TABLE users ADD COLUMN store_id TEXT REFERENCES stores(id);

-- Add station_policy column to users (values: 'none', 'any', 'specific')
ALTER TABLE users ADD COLUMN station_policy TEXT NOT NULL DEFAULT 'none';

-- Add station_id column to users
ALTER TABLE users ADD COLUMN station_id TEXT REFERENCES stations(id);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_station_id ON users(station_id);

-- Update existing admin user to have 'none' station policy (admins don't need stations)
UPDATE users SET station_policy = 'none' WHERE role = 'admin';

-- Update existing cashier user to have 'any' station policy and assign to default store
UPDATE users SET station_policy = 'any', store_id = 'default-store' WHERE role = 'cashier';

-- Update existing manager user to have 'any' station policy and assign to default store
UPDATE users SET station_policy = 'any', store_id = 'default-store' WHERE role = 'manager';

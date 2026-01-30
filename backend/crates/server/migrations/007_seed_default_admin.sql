-- Migration: Seed default admin user
-- Description: Creates a default admin user for initial system access
-- Username: admin
-- Password: admin123 (CHANGE THIS IN PRODUCTION!)

-- Insert default admin user (use INSERT OR IGNORE to make it idempotent)
-- Password hash for 'admin123' using bcrypt with cost 12
INSERT OR IGNORE INTO users (
    id, 
    username, 
    email, 
    password_hash, 
    role, 
    first_name, 
    last_name, 
    store_id, 
    station_policy, 
    station_id, 
    is_active, 
    created_at, 
    updated_at
)
VALUES (
    'admin-default', 
    'admin', 
    'admin@capspos.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhJ6VpW', 
    'admin', 
    'System', 
    'Administrator', 
    NULL, 
    'none', 
    NULL, 
    1, 
    datetime('now'), 
    datetime('now')
);

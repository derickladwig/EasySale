-- Migration 016: Vendors Table
-- Creates the vendors table for managing supplier information

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tax_id TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    
    -- JSON object for vendor detection
    -- Example: {"keywords": ["ACME", "ACME SUPPLY"], "tax_ids": ["123456789"], "patterns": ["ACME.*INC"]}
    identifiers TEXT NOT NULL DEFAULT '{}',
    
    -- Multi-tenant isolation
    tenant_id TEXT NOT NULL,
    
    -- Status
    is_active INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_active ON vendors(tenant_id, is_active);

-- Insert sample vendors for testing
INSERT OR IGNORE INTO vendors (id, name, tax_id, email, phone, identifiers, tenant_id, is_active)
VALUES 
    (
        'vendor-001',
        'ACME Supply Co.',
        '123456789',
        'orders@acmesupply.com',
        '555-0100',
        '{"keywords": ["ACME", "ACME SUPPLY", "ACME SUPPLY CO"], "tax_ids": ["123456789"], "patterns": ["ACME.*SUPPLY"]}',
        'default-tenant',
        1
    ),
    (
        'vendor-002',
        'AutoParts Direct',
        '987654321',
        'sales@autopartsdirect.com',
        '555-0200',
        '{"keywords": ["AUTOPARTS", "AUTO PARTS DIRECT", "APD"], "tax_ids": ["987654321"], "patterns": ["AUTO.*PARTS.*DIRECT"]}',
        'default-tenant',
        1
    ),
    (
        'vendor-003',
        'Industrial Supplies Inc.',
        '456789123',
        'info@industrialsupplies.com',
        '555-0300',
        '{"keywords": ["INDUSTRIAL SUPPLIES", "ISI", "IND SUPPLIES"], "tax_ids": ["456789123"], "patterns": ["INDUSTRIAL.*SUPPLIES"]}',
        'default-tenant',
        1
    );

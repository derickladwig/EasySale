-- Migration 021: Vendor Templates Table
-- Creates the vendor_templates table for storing vendor-specific parsing configurations

-- Vendor templates table
CREATE TABLE IF NOT EXISTS vendor_templates (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1, -- Only one active template per vendor
    
    -- Template configuration (JSON)
    -- Example structure:
    -- {
    --   "vendor_identifiers": {
    --     "keywords": ["ACME", "ACME SUPPLY"],
    --     "tax_ids": ["123456789"],
    --     "patterns": ["ACME.*SUPPLY"]
    --   },
    --   "header_fields": {
    --     "invoice_no": {"regex": ["Invoice\\s*#?:\\s*([A-Z0-9-]+)"], "zone": {...}},
    --     "invoice_date": {"regex": ["Date:\\s*(\\d{1,2}/\\d{1,2}/\\d{4})"], "zone": {...}},
    --     "totals": {
    --       "subtotal_regex": ["Subtotal:\\s*\\$?([0-9,]+\\.\\d{2})"],
    --       "tax_regex": ["Tax:\\s*\\$?([0-9,]+\\.\\d{2})"],
    --       "total_regex": ["Total:\\s*\\$?([0-9,]+\\.\\d{2})"]
    --     }
    --   },
    --   "line_table": {
    --     "start_keywords": ["Qty", "Description", "Price"],
    --     "end_keywords": ["Subtotal", "Total"],
    --     "columns": {
    --       "vendor_sku": {"regex_hint": "...", "zone": {...}},
    --       "description": {...},
    --       "qty": {...},
    --       "unit_price": {...},
    --       "ext_price": {...}
    --     }
    --   },
    --   "normalization": {
    --     "stopwords": ["EA", "EACH", "PC", "ITEM"],
    --     "units": {
    --       "CASE": {"multiplier": 12, "unit": "EA"},
    --       "GAL": {"multiplier": 3785.41, "unit": "ML"}
    --     }
    --   }
    -- }
    config_json TEXT NOT NULL,
    
    -- Multi-tenant isolation
    tenant_id TEXT NOT NULL,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_vendor ON vendor_templates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON vendor_templates(active);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON vendor_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_version ON vendor_templates(version DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_templates_vendor_active ON vendor_templates(vendor_id, active);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_vendor ON vendor_templates(tenant_id, vendor_id);

-- Insert sample templates for testing
INSERT OR IGNORE INTO vendor_templates (id, vendor_id, name, version, active, config_json, tenant_id)
VALUES 
    (
        'template-001',
        'vendor-001',
        'ACME Supply Standard Invoice',
        1,
        1,
        '{
            "vendor_identifiers": {
                "keywords": ["ACME", "ACME SUPPLY"],
                "tax_ids": ["123456789"]
            },
            "header_fields": {
                "invoice_no": {"regex": ["Invoice\\\\s*#?:\\\\s*([A-Z0-9-]+)"]},
                "invoice_date": {"regex": ["Date:\\\\s*(\\\\d{1,2}/\\\\d{1,2}/\\\\d{4})"]},
                "totals": {
                    "subtotal_regex": ["Subtotal:\\\\s*\\\\$?([0-9,]+\\\\.\\\\d{2})"],
                    "tax_regex": ["Tax:\\\\s*\\\\$?([0-9,]+\\\\.\\\\d{2})"],
                    "total_regex": ["Total:\\\\s*\\\\$?([0-9,]+\\\\.\\\\d{2})"]
                }
            },
            "line_table": {
                "start_keywords": ["Item", "Qty", "Price"],
                "end_keywords": ["Subtotal"],
                "columns": {
                    "vendor_sku": {"position": 0},
                    "description": {"position": 1},
                    "qty": {"position": 2},
                    "unit_price": {"position": 3},
                    "ext_price": {"position": 4}
                }
            },
            "normalization": {
                "stopwords": ["EA", "EACH"],
                "units": {
                    "CASE": {"multiplier": 12, "unit": "EA"}
                }
            }
        }',
        'default'
    ),
    (
        'template-002',
        'vendor-002',
        'AutoParts Direct Standard Invoice',
        1,
        1,
        '{
            "vendor_identifiers": {
                "keywords": ["AUTOPARTS", "AUTO PARTS DIRECT"],
                "tax_ids": ["987654321"]
            },
            "header_fields": {
                "invoice_no": {"regex": ["Invoice:\\\\s*([A-Z0-9-]+)"]},
                "invoice_date": {"regex": ["Date:\\\\s*(\\\\d{4}-\\\\d{2}-\\\\d{2})"]},
                "totals": {
                    "subtotal_regex": ["Subtotal:\\\\s*\\\\$([0-9,]+\\\\.\\\\d{2})"],
                    "tax_regex": ["Tax:\\\\s*\\\\$([0-9,]+\\\\.\\\\d{2})"],
                    "total_regex": ["Total:\\\\s*\\\\$([0-9,]+\\\\.\\\\d{2})"]
                }
            },
            "line_table": {
                "start_keywords": ["Part#", "Description", "Qty"],
                "end_keywords": ["Subtotal"],
                "columns": {
                    "vendor_sku": {"position": 0},
                    "description": {"position": 1},
                    "qty": {"position": 2},
                    "unit_price": {"position": 3},
                    "ext_price": {"position": 4}
                }
            },
            "normalization": {
                "stopwords": ["PC", "PIECE"],
                "units": {
                    "BOX": {"multiplier": 10, "unit": "EA"}
                }
            }
        }',
        'default'
    );

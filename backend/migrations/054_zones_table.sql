-- Migration: Create zones table for document zone editor
-- Zones define regions on documents for OCR field extraction

CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT,
    zone_type TEXT,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES review_cases(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_zones_case_id ON zones(case_id);
CREATE INDEX IF NOT EXISTS idx_zones_tenant_id ON zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zones_case_tenant ON zones(case_id, tenant_id);

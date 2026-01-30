-- Migration: Add tenant_id to remaining backup tables
-- Description: Adds tenant_id column to backup tables that weren't covered in migration 009
-- Note: Migration 009 already added tenant_id to backup_jobs and backup_settings
-- This migration adds it to the remaining backup subsystem tables

-- Add tenant_id columns (nullable) to tables not covered in migration 009
ALTER TABLE backup_manifests ADD COLUMN tenant_id TEXT;
ALTER TABLE backup_destinations ADD COLUMN tenant_id TEXT;
ALTER TABLE backup_dest_objects ADD COLUMN tenant_id TEXT;
ALTER TABLE restore_jobs ADD COLUMN tenant_id TEXT;
ALTER TABLE backup_alerts ADD COLUMN tenant_id TEXT;

-- Set defaults for all tenant_id columns
UPDATE backup_manifests SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE backup_destinations SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE backup_dest_objects SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE restore_jobs SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE backup_alerts SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_manifests_tenant ON backup_manifests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_destinations_tenant ON backup_destinations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_tenant ON backup_dest_objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_tenant ON restore_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_alerts_tenant ON backup_alerts(tenant_id);

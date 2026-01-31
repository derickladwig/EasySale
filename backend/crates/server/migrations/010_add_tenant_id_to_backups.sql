-- Migration: Add tenant_id to backup tables
-- Description: Adds tenant_id column to backup tables for multi-tenant support

-- Add tenant_id to backup_jobs
ALTER TABLE backup_jobs ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_backup_jobs_tenant ON backup_jobs(tenant_id);

-- Add tenant_id to backup_settings
ALTER TABLE backup_settings ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

-- Add tenant_id to backup_manifests
ALTER TABLE backup_manifests ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_backup_manifests_tenant ON backup_manifests(tenant_id);

-- Add tenant_id to backup_destinations
ALTER TABLE backup_destinations ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_backup_destinations_tenant ON backup_destinations(tenant_id);

-- Add tenant_id to backup_dest_objects
ALTER TABLE backup_dest_objects ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_tenant ON backup_dest_objects(tenant_id);

-- Add tenant_id to restore_jobs
ALTER TABLE restore_jobs ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_restore_jobs_tenant ON restore_jobs(tenant_id);

-- Add tenant_id to backup_alerts
ALTER TABLE backup_alerts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_backup_alerts_tenant ON backup_alerts(tenant_id);

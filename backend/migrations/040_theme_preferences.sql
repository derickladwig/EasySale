-- Migration: Theme Preferences
-- Purpose: Store theme preferences with scope support (store and user)
-- Created: 2026-01-20
-- Requirements: 6.1, 6.2, 6.4 (unified-design-system spec)

-- Note: Theme preferences are stored in the generic settings table
-- This migration adds indexes and default values for theme-related settings

-- Create indexes for theme-related queries
CREATE INDEX IF NOT EXISTS idx_settings_theme_keys ON settings(key) 
WHERE key LIKE 'theme.%';

CREATE INDEX IF NOT EXISTS idx_settings_store_scope ON settings(scope, scope_id) 
WHERE scope = 'store';

CREATE INDEX IF NOT EXISTS idx_settings_user_scope ON settings(scope, scope_id) 
WHERE scope = 'user';

-- Insert default theme settings for existing tenants (if not already present)
-- These serve as fallback values when no store or user preferences exist

-- Theme mode (light/dark/auto)
INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.mode', 'light', 'global', NULL, 'string');

-- Theme accent color (blue/green/purple/orange/red)
INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.accent', 'blue', 'global', NULL, 'string');

-- Theme density (compact/comfortable/spacious)
INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.density', 'comfortable', 'global', NULL, 'string');

-- Theme locks (store-level only)
-- These prevent user overrides for specific theme dimensions
INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.locks.lockMode', 'false', 'global', NULL, 'boolean');

INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.locks.lockAccent', 'false', 'global', NULL, 'boolean');

INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.locks.lockContrast', 'false', 'global', NULL, 'boolean');

-- Store branding (store-level only)
INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.logo', '', 'global', NULL, 'string');

INSERT OR IGNORE INTO settings (key, value, scope, scope_id, data_type)
VALUES ('theme.companyName', '', 'global', NULL, 'string');

-- Note: Migration of user_preferences.theme was removed because that table doesn't exist
-- If user_preferences table is added in the future, a separate migration should handle the data migration

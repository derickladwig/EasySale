-- Migration: Settings Registry Keys
-- Purpose: Document and index settings keys used by the Settings Registry
-- Created: 2026-01-24
-- Requirements: 5.8, 5.9 (unified-design-system spec)

-- Note: This migration adds indexes for settings keys used by the Settings Registry
-- The settings table already exists (created in migration 035)
-- Default values live in code (frontend/src/settings/definitions/*)
-- Only store and user scopes are persisted in the database

-- Create indexes for commonly queried setting groups
CREATE INDEX IF NOT EXISTS idx_settings_personal ON settings(key) 
WHERE key LIKE 'user.%';

CREATE INDEX IF NOT EXISTS idx_settings_store_config ON settings(key) 
WHERE key LIKE 'store.%';

CREATE INDEX IF NOT EXISTS idx_settings_sell ON settings(key) 
WHERE key LIKE 'sell.%' OR key LIKE 'payments.%';

CREATE INDEX IF NOT EXISTS idx_settings_inventory ON settings(key) 
WHERE key LIKE 'inventory.%' OR key LIKE 'products.%';

CREATE INDEX IF NOT EXISTS idx_settings_customers ON settings(key) 
WHERE key LIKE 'customers.%' OR key LIKE 'ar.%';

CREATE INDEX IF NOT EXISTS idx_settings_security ON settings(key) 
WHERE key LIKE 'security.%';

CREATE INDEX IF NOT EXISTS idx_settings_devices ON settings(key) 
WHERE key LIKE 'devices.%' OR key LIKE 'offline.%';

CREATE INDEX IF NOT EXISTS idx_settings_integrations ON settings(key) 
WHERE key LIKE 'integrations.%';

CREATE INDEX IF NOT EXISTS idx_settings_localization ON settings(key) 
WHERE key LIKE 'localization.%' OR key LIKE 'advanced.%';

-- Note: Setting definitions and default values are defined in:
-- frontend/src/settings/definitions/personal.ts
-- frontend/src/settings/definitions/stores-tax.ts
-- frontend/src/settings/definitions/sell-payments.ts
-- frontend/src/settings/definitions/inventory-products.ts
-- frontend/src/settings/definitions/customers-ar.ts
-- frontend/src/settings/definitions/users-security.ts
-- frontend/src/settings/definitions/devices-offline.ts
-- frontend/src/settings/definitions/integrations.ts
-- frontend/src/settings/definitions/advanced.ts

-- Scope Rules:
-- - Policy settings: Only 'store' and 'global' scopes allowed
-- - Preference settings: 'user', 'store', and 'global' scopes allowed
-- - 'global' scope is never persisted (default values live in code)
-- - Only 'store' and 'user' scopes are written to the database

-- Scope Precedence:
-- - Policy settings: store > user > default (code)
-- - Preference settings: user > store > default (code)
-- - Theme locks (store-level) can prevent user overrides


/**
 * @deprecated QUARANTINED - Warehouse renamed to Inventory
 * 
 * Quarantined: 2026-01-29
 * Reason: Renamed to "inventory" for more generic terminology
 * Replacement: frontend/src/inventory/
 * 
 * See: frontend/src/legacy_quarantine/warehouse/QUARANTINE_NOTICE.md
 * 
 * Migration:
 * - Import from '../../inventory' instead
 * - Route changed from /warehouse to /inventory
 * - Permission changed from access_warehouse to access_inventory
 */

// Re-export from new location for backward compatibility
export * from '../../inventory';

# Quarantine Notice

## Directory: warehouse/

**Quarantined**: 2026-01-29
**Reason**: Renamed to "inventory" for more generic terminology
**Replacement**: `frontend/src/inventory/`

## What Changed

The "Warehouse" navigation tab and associated files were renamed to "Inventory" to use more generic, universal terminology that applies to all retail business types.

### File Mapping

| Old Location | New Location |
|--------------|--------------|
| `warehouse/pages/WarehousePage.tsx` | `inventory/pages/InventoryPage.tsx` |
| `warehouse/pages/PartsMappingPage.tsx` | `inventory/pages/PartsMappingPage.tsx` |
| `warehouse/pages/index.ts` | `inventory/pages/index.ts` |
| `warehouse/hooks/useInventoryQuery.ts` | `inventory/hooks/useInventoryQuery.ts` |
| `warehouse/index.ts` | `inventory/index.ts` |

### Route Changes

| Old Route | New Route |
|-----------|-----------|
| `/warehouse` | `/inventory` |

### Permission Changes

| Old Permission | New Permission |
|----------------|----------------|
| `access_warehouse` | `access_inventory` |

Note: `access_warehouse` is still a valid permission type in the system for backward compatibility, but all navigation and route guards now use `access_inventory`.

### Files Updated

The following files were updated to use the new naming:

**Core Files:**
- `frontend/src/App.tsx` - Route and import changes
- `frontend/src/config/routeRegistry.ts` - Route definitions
- `frontend/src/config/navigation.ts` - Navigation items
- `frontend/src/config/defaultConfig.ts` - Default config
- `frontend/src/nav/navConfig.ts` - Nav configuration
- `frontend/src/common/config/navigation.ts` - Legacy nav config
- `frontend/src/common/contexts/PermissionsContext.tsx` - Added `access_inventory` permission
- `frontend/src/home/pages/HomePage.tsx` - Quick actions

**Test Files:**
- `frontend/src/__tests__/routes.test.tsx`
- `frontend/src/test/properties/single-navigation.property.test.tsx`
- `frontend/src/test/properties/route-navigation-sync.property.test.tsx`
- `frontend/src/test/properties/navigation-filtering.property.test.ts`
- `frontend/src/test/properties/empty-state-vs-mock-data.property.test.ts`
- `frontend/src/test/properties/no-demo-data-in-prod.property.test.ts`
- `frontend/src/test/fixtures/users.ts`
- `frontend/src/settings/settings-scope.property.test.ts`
- `frontend/src/common/contexts/__tests__/PermissionsContext.test.tsx`
- `frontend/src/admin/capability-driven-navigation.property.test.ts`

**Stories:**
- `frontend/src/AppLayout.stories.tsx` - Renamed `OnWarehousePage` to `OnInventoryPage`

## Backward Compatibility

The old `warehouse` directory files now re-export from the new `inventory` location:
- `WarehousePage` is exported as an alias for `InventoryPage`
- `useInventoryQuery` hook is re-exported
- `PartsMappingPage` is re-exported

This allows existing imports to continue working while migration happens.

## Migration Guide

1. Update imports from `./warehouse/` to `./inventory/`
2. Update route paths from `/warehouse` to `/inventory`
3. Update permission checks from `access_warehouse` to `access_inventory`
4. Update component names from `WarehousePage` to `InventoryPage`

## NO DELETES Policy

Per project policy, these files are quarantined rather than deleted to preserve history and enable auditing. The old files now contain re-exports to the new location.

# Navigation Configuration Documentation

## Overview

EasySale uses a data-driven navigation system where menu items are defined in configuration and filtered based on user permissions and system capabilities.

## Navigation Item Interface

```typescript
interface NavigationItem {
  path: string;           // Route path
  label: string;          // Display label
  icon: string | LucideIcon;  // Icon component or name
  permission: Permission; // Required permission
  description?: string;   // Tooltip/description
  badge?: number;         // Notification count
  badgeKey?: string;      // Key for dynamic badge
  capability?: string;    // Required capability flag
  section?: 'main' | 'admin';  // Navigation section
}
```

## Main Navigation Items

| Path | Label | Permission | Section |
|------|-------|------------|---------|
| `/sell` | Sell | `access_sell` | main |
| `/lookup` | Lookup | `access_sell` | main |
| `/customers` | Customers | `access_sell` | main |
| `/warehouse` | Warehouse | `access_warehouse` | main |
| `/documents` | Documents | `access_warehouse` | main |
| `/review` | Review | `review_vendor_bills` | main |
| `/reporting` | Reporting | `access_admin` | main |
| `/admin` | Admin | `access_admin` | main |

## Admin Sub-Navigation

| Path | Label | Permission |
|------|-------|------------|
| `/admin/setup` | Setup Wizard | `access_admin` |
| `/admin/users` | Users & Roles | `access_admin` |
| `/admin/store` | Store Configuration | `access_admin` |
| `/admin/locations` | Locations & Registers | `access_admin` |
| `/admin/taxes` | Taxes & Rounding | `access_admin` |
| `/admin/pricing` | Pricing Rules | `access_admin` |
| `/admin/receipts` | Receipt Templates | `access_admin` |
| `/admin/branding` | Branding | `access_admin` |
| `/admin/integrations` | Integrations | `access_admin` |
| `/admin/data` | Data & Imports | `access_admin` |
| `/admin/exports` | Exports | `access_admin` |
| `/admin/capabilities` | Capabilities | `access_admin` |
| `/admin/health` | System Health | `access_admin` |
| `/admin/advanced` | Advanced | `access_admin` |

## Profile Menu Items

| Path/Action | Label | Icon |
|-------------|-------|------|
| `/profile` | My Profile | User |
| `/preferences` | Preferences | Sliders |
| `logout` | Sign Out | LogOut |

## Permission Gating

Navigation items are filtered based on:

1. **Permission Check**: User must have the required permission
2. **Capability Check**: System capability must be enabled (if specified)

```typescript
const isVisible = (item: NavigationItem, user: User, capabilities: Capabilities) => {
  const hasPermission = user.permissions.includes(item.permission);
  const hasCapability = !item.capability || capabilities[item.capability];
  return hasPermission && hasCapability;
};
```

## Badge System

Dynamic badges show notification counts:

| Badge Key | Source | Description |
|-----------|--------|-------------|
| `needsReview` | Review API | Cases needing review |
| `pendingSync` | Sync API | Pending sync items |

## Configuration Files

- `src/config/navigationConfig.ts` - Navigation item definitions
- `src/common/components/Navigation.tsx` - Navigation renderer
- `src/features/admin/components/AdminLayout.tsx` - Admin sub-navigation

## Requirements Validated

- **3.4**: Navigation supports permission filters
- **3.5**: Navigation supports capability filters
- **3.6**: Navigation supports badge counts
- **13.3**: Menu definition and gating rules documented

# Settings Map - Current State Audit

**Date:** 2026-01-09
**Status:** Initial Audit Complete

## Executive Summary

The Settings module is currently **not implemented** - only a placeholder AdminPage exists. This is actually ideal for our consolidation effort, as we can build it correctly from the start rather than refactoring existing inconsistent code.

## Current Settings Structure

### Frontend
- **Location:** `frontend/src/features/admin/`
- **Current State:** Placeholder only
- **Files:**
  - `pages/AdminPage.tsx` - Empty placeholder with "System administration interface will be implemented here"
  - No Settings components exist
  - No Settings pages exist
  - No Settings hooks exist

### Backend
- **Location:** `backend/rust/src/`
- **Current State:** No Settings handlers or models
- **Existing Related Code:**
  - `models/user.rs` - User model exists with role-based permissions
  - Permission system exists with `manage_settings` permission defined
  - No Settings-specific handlers
  - No Settings-specific models
  - No Store or Station models

## Settings Classification by Scope

### Global Settings (System-wide)
**Not yet implemented. Planned settings:**
- Feature flags (Loyalty, Service Orders, Paint Mixing, E-commerce Sync)
- Performance monitoring configuration
- Backup schedule and retention
- Default language and currency
- Tax configuration defaults

### Store Settings (Per-store)
**Not yet implemented. Planned settings:**
- Store information (name, address, contact)
- Store timezone and currency
- Receipt footer text
- Tax rules and rates
- Hardware templates
- Integration configurations (QuickBooks, WooCommerce, payment processors)

### Station Settings (Per-terminal)
**Not yet implemented. Planned settings:**
- Hardware configuration (printers, scanners, cash drawer, payment terminal)
- Offline mode enabled/disabled
- Station-specific display preferences

### User Settings (Per-user)
**Not yet implemented. Planned settings:**
- Display name and email
- Password
- Theme preference (Light, Dark, Auto)
- Language preference
- Notification preferences

## Permission Enforcement

### Current State
- **Permission System:** ✅ Exists and working
- **Permissions Defined:**
  - `manage_settings` - Required for Settings access
  - `manage_users` - Required for user management
  - `access_admin` - Required for admin module access
- **Enforcement Locations:**
  - Frontend: Route guards check permissions before rendering pages
  - Backend: No Settings endpoints exist yet to enforce

### Required Permissions for Settings Pages
| Page | Required Permission | Notes |
|------|-------------------|-------|
| My Preferences | (none) | All users can edit their own preferences |
| Company & Stores | `manage_settings` | Admin only |
| Users & Roles | `manage_users` | Admin/Manager |
| Network | `manage_settings` | Admin only |
| Product Config | `manage_settings` | Admin/Manager |
| Data Management | `manage_settings` | Admin only |
| Tax Rules | `manage_settings` | Admin/Manager |
| Integrations | `manage_settings` | Admin only |
| Hardware | `manage_settings` | Admin/Manager |
| Feature Flags | `manage_settings` | Admin only |
| Localization | `manage_settings` | Admin/Manager |
| Performance | `manage_settings` | Admin only |
| Audit Log | `view_audit_logs` | Admin/Manager |

## Database Schema

### Existing Tables
- ✅ `users` - User accounts with role and permissions
- ✅ `sessions` - User sessions with JWT tokens
- ✅ `customers` - Customer management
- ✅ `vehicles` - Vehicle tracking
- ✅ `layaways` - Layaway system
- ✅ `work_orders` - Service orders
- ✅ `commissions` - Commission tracking
- ✅ `loyalty_accounts` - Loyalty program
- ✅ `credit_accounts` - Credit accounts
- ✅ `gift_cards` - Gift card system
- ✅ `promotions` - Promotion engine

### Missing Tables (Required for Settings)
- ❌ `stores` - Store information and configuration
- ❌ `stations` - POS terminal/device configuration
- ❌ `settings` - Generic settings storage
- ❌ `hardware_configs` - Hardware device configuration
- ❌ `integration_configs` - External integration settings
- ❌ `audit_logs` - Settings change audit trail (partially exists for other entities)

## Current User Model

### User Fields
```rust
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub is_active: bool,
    pub last_login_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

### Missing User Fields (Required for Settings)
- ❌ `store_id` - Primary store assignment
- ❌ `station_policy` - Station assignment policy ("any", "specific", "none")
- ❌ `station_id` - Specific station assignment (if policy = "specific")

## Existing Components (Reusable for Settings)

### Layout Components
- ✅ `PageHeader` - Standard page header with title, subtitle, breadcrumbs
- ✅ `Panel` - Content container with title
- ✅ `Button` - Standard button component
- ✅ `Input` - Form input component
- ✅ `Select` - Dropdown select component
- ✅ `Checkbox` - Checkbox component
- ✅ `Modal` - Modal dialog component
- ✅ `Tabs` - Tab navigation component
- ✅ `Table` - Basic table component

### Missing Components (Required for Settings)
- ❌ `SettingsPageShell` - Standard Settings page layout
- ❌ `SettingsTable` - Enhanced table with sorting, filtering, bulk selection
- ❌ `BulkActionsBar` - Bulk operation controls
- ❌ `EntityEditorModal` - Base modal for editing entities
- ❌ `SettingsSearch` - Global settings search
- ❌ `EffectiveSettingsView` - Resolved settings display
- ❌ `InlineWarningBanner` - Warning indicators
- ❌ `FixIssuesWizard` - Guided issue resolution
- ❌ `PermissionMatrix` - Role × permission grid

## Navigation Structure

### Current Navigation
- Home
- Sell (POS)
- Warehouse (Inventory)
- Customers
- Reports
- Admin (placeholder)

### Planned Settings Navigation
```
Admin
├── My Preferences
├── Company & Stores
├── Users & Roles
│   ├── Users
│   ├── Roles
│   └── Audit Log
├── Network
├── Product Config
├── Data Management
├── Tax Rules
├── Integrations
├── Hardware
├── Feature Flags
├── Localization
└── Performance
```

## Gaps and Inconsistencies

### Critical Gaps
1. **No Store/Station models** - Required for multi-store operation
2. **No Settings storage** - No generic settings table
3. **No Hardware configuration** - No way to configure printers, scanners, etc.
4. **No Integration configuration** - No way to configure external integrations
5. **No Audit logging for Settings** - Audit system exists but not for Settings changes
6. **User model incomplete** - Missing store_id, station_policy, station_id fields

### Inconsistencies
**None found** - Since Settings is not implemented, there are no inconsistencies to fix. This is ideal!

## Recommendations

### Phase 1 Priority (Foundation)
1. ✅ **Start fresh** - No refactoring needed, build correctly from the start
2. Create shared Settings components (SettingsPageShell, SettingsTable, etc.)
3. Enhance User model with store/station fields
4. Create Store and Station models
5. Implement Users & Roles page as first Settings page

### Phase 2 Priority (Data Correctness)
1. Implement context provider system (UserContext with store/station)
2. Enforce store/station requirements
3. Add audit logging for Settings changes
4. Implement validation consistency

### Phase 3 Priority (UX Polish)
1. Add Settings Search
2. Add Effective Settings resolution
3. Implement remaining Settings pages
4. Performance optimization

## Success Metrics

### Current Baseline
- Settings pages: 0
- Settings components: 0
- Settings API endpoints: 0
- Settings tests: 0

### Target (Phase 1 Complete)
- Settings pages: 1 (Users & Roles)
- Settings components: 5 (SettingsPageShell, SettingsTable, BulkActionsBar, EntityEditorModal, InlineWarningBanner)
- Settings API endpoints: 10+ (users, stores, stations CRUD)
- Settings tests: 20+ (component tests, integration tests)

### Target (All Phases Complete)
- Settings pages: 13 (all Settings pages)
- Settings components: 9 (all shared components)
- Settings API endpoints: 60+ (all Settings operations)
- Settings tests: 100+ (comprehensive coverage)

## Conclusion

**Status: Ready to Build**

The Settings module is a blank slate, which is ideal for our consolidation effort. We can build it correctly from the start using the patterns defined in the design document, without needing to refactor existing inconsistent code.

**Next Steps:**
1. Create shared Settings components (Task 2)
2. Enhance User model (Task 3)
3. Create Store and Station models (Task 4)
4. Implement Users & Roles page (Task 5)

**Estimated Timeline:**
- Phase 1 (Foundation): 2-3 days
- Phase 2 (Data Correctness): 2-3 days
- Phase 3 (UX Polish): 3-4 days
- **Total: 7-10 days for complete Settings module**

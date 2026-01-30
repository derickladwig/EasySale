# Layout Hierarchy Documentation

## Overview

EasySale uses a single layout shell architecture where `AppLayout` is the sole provider of navigation and chrome for all authenticated routes.

## Component Hierarchy

```
App.tsx
└── BrowserRouter
    └── AuthProvider
        └── PermissionsProvider
            └── TenantSetupProvider
                └── AppLayout (SINGLE SHELL)
                    ├── TopBar (header with branding)
                    │   ├── Logo
                    │   ├── Search
                    │   ├── SyncStatus
                    │   └── ProfileMenu
                    ├── Sidebar (navigation)
                    │   ├── Navigation items
                    │   └── Store info footer
                    └── <Outlet /> (page content)
                        └── Feature pages (no nested navigation)
```

## Key Principles

### Single Source of Navigation
- `AppLayout` is the ONLY component that renders navigation
- Pages do NOT wrap content in `AppShell` with sidebar prop
- No duplicate sidebars or navigation components

### Layout Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `AppLayout` | Header, sidebar, main content area |
| `TopBar` | Branding, search, sync status, profile menu |
| `Navigation` | Sidebar navigation items from config |
| `ProfileMenu` | User preferences, sign out |
| Feature Pages | Content only, no layout chrome |

### Route Structure

```
/ (AppLayout)
├── / (HomePage)
├── /sell (SellPage)
├── /lookup (LookupPage)
├── /warehouse (WarehousePage)
├── /documents (DocumentsPage)
├── /customers (CustomersPage)
├── /reporting (ReportingPage)
├── /preferences (PreferencesPage)
├── /admin (AdminLayout)
│   ├── /admin/setup
│   ├── /admin/users
│   ├── /admin/store
│   └── ... (other admin routes)
└── /review (ReviewPage)
```

## Admin Sub-Navigation

Admin routes use `AdminLayout` which provides:
- Sub-navigation tabs/list for admin sections
- Consistent admin page structure
- Permission-gated sub-routes

## Responsive Behavior

- Desktop: Fixed sidebar, full header
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation, hamburger menu

## Files

- `frontend/src/AppLayout.tsx` - Main layout shell
- `frontend/src/common/components/Navigation.tsx` - Navigation component
- `frontend/src/features/admin/components/AdminLayout.tsx` - Admin sub-layout
- `frontend/src/common/components/molecules/ProfileMenu.tsx` - Profile dropdown

## Requirements Validated

- **2.1**: System renders all authenticated routes inside exactly one AppLayout
- **2.2**: System does NOT nest sidebars
- **2.3**: Layout hierarchy documented
- **3.1**: System renders exactly one sidebar/nav on desktop

# Information Architecture Documentation

## Overview

This document describes the final navigation grouping and rationale for EasySale.

## Design Principles

1. **Daily Use First**: Most-used features at top level
2. **Admin Grouped**: Administrative functions under single Admin entry
3. **Settings in Profile**: Personal preferences in profile menu, not sidebar
4. **Permission-Based**: Items hidden if user lacks permission

## Top-Level Navigation (Daily Use)

| Item | Rationale |
|------|-----------|
| **Sell** | Primary POS function, most frequent use |
| **Lookup** | Quick product search during sales |
| **Customers** | Customer management during transactions |
| **Warehouse** | Inventory management |
| **Documents** | Document/OCR processing |
| **Review** | Vendor bill review (with badge for pending) |
| **Reporting** | Sales reports and analytics |
| **Admin** | Single entry point for all admin functions |

## Admin Section (Administrative Functions)

### Setup
- **Setup Wizard**: First-run and re-runnable configuration

### Users & Access
- **Users & Roles**: User management, role assignment

### Store Configuration
- **Store Configuration**: Basic store settings
- **Locations & Registers**: Multi-location setup
- **Taxes & Rounding**: Tax rules configuration
- **Pricing Rules**: Pricebook management
- **Receipt Templates**: Receipt customization

### Branding
- **Branding**: Logo, colors, theme

### Integrations
- **Integrations**: WooCommerce, QuickBooks, etc.

### Data Management
- **Data & Imports**: Import/export data
- **Exports**: Export approved cases

### System
- **Capabilities**: Feature flags
- **System Health**: Sync status, jobs
- **Advanced**: Advanced settings

## Profile Menu (Personal Settings)

| Item | Rationale |
|------|-----------|
| **My Profile** | User account settings |
| **Preferences** | Theme, density, shortcuts |
| **Sign Out** | Logout action |

## Settings Scope Classification

| Scope | Location | Examples |
|-------|----------|----------|
| **User** | Profile → Preferences | Theme, density, shortcuts |
| **Tenant** | Admin → Store/Branding | Tax rules, branding, integrations |
| **System** | Admin → Capabilities/Advanced | Feature flags, system config |

## Navigation Flow

```
User logs in
    ↓
Home Dashboard (/)
    ↓
├── Daily Work: Sell → Lookup → Customers
├── Inventory: Warehouse → Documents
├── Review: Review (badge shows pending)
├── Reports: Reporting
└── Admin: Admin → [sub-navigation]
         ├── Setup
         ├── Users
         ├── Store Config
         ├── Integrations
         └── System
```

## Mobile Navigation

On mobile devices:
- Bottom navigation for primary items
- Hamburger menu for full navigation
- Admin accessed via menu

## Requirements Validated

- **3.4**: Profile menu for personal settings
- **4.1**: Admin as grouped section with sub-routes
- **13.1, 13.2, 13.3**: Information architecture documented

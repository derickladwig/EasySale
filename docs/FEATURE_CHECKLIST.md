# EasySale POS System - Feature Checklist

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-01-25
- **Purpose**: Feature visibility audit and training needs assessment

---

## 1. Features Visible in UI

### ✅ Authentication & Access
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Password Login | `/login` | ✅ Ready | Username/password authentication |
| PIN Login | `/login` | ✅ Ready | Quick PIN-based access |
| Remember Username | `/login` | ✅ Ready | LocalStorage persistence |
| Demo Mode Accounts | `/login` | ✅ Ready | Shows when profile=demo |
| Access Denied Page | `/access-denied` | ✅ Ready | Permission error handling |
| Fresh Install Wizard | `/fresh-install` | ✅ Ready | Backup restore or fresh start |
| First-Run Setup | `/setup` | ✅ Ready | Initial configuration wizard |

### ✅ Dashboard & Navigation
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard Home | `/` | ✅ Ready | Stats, quick actions, alerts |
| Sidebar Navigation | All pages | ✅ Ready | Desktop sidebar |
| Bottom Navigation | All pages | ✅ Ready | Mobile bottom nav |
| Collapsible Sidebar | All pages | ✅ Ready | Tablet mode |
| Global Search | Header | ✅ Ready | Search bar in header |
| Sync Status Indicator | Header | ✅ Ready | Online/Syncing/Offline |
| Notifications Bell | Header | ✅ Ready | Alert notifications |
| Profile Menu | Header | ✅ Ready | User dropdown |

### ✅ Point of Sale
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Product Catalog | `/sell` | ✅ Ready | Grid/list view |
| Product Search | `/sell` | ✅ Ready | Name/SKU search |
| Category Filtering | `/sell` | ✅ Ready | Tab-based categories |
| Shopping Cart | `/sell` | ✅ Ready | Add/remove/quantity |
| Customer Selection | `/sell` | ✅ Ready | Walk-in or select |
| Discount Button | `/sell` | ✅ Ready | UI present (functionality TBD) |
| Coupon Button | `/sell` | ✅ Ready | UI present (functionality TBD) |
| Cash Payment | `/sell` | ✅ Ready | Payment button |
| Card Payment | `/sell` | ✅ Ready | Payment button |
| Other Payment | `/sell` | ✅ Ready | Payment button |

### ✅ Product Lookup
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Product Search | `/lookup` | ✅ Ready | Full-text search |
| Advanced Filters | `/lookup` | ✅ Ready | Brand, stock, price, sort |
| Category Tabs | `/lookup` | ✅ Ready | Category filtering |
| Product Details | `/lookup` | ✅ Ready | Right panel details |
| Create Product | `/lookup` | ✅ Ready | Modal form |
| Edit Product | `/lookup` | ✅ Ready | Modal form |
| Delete Product | `/lookup` | ✅ Ready | Confirmation dialog |
| Add to Sale | `/lookup` | ✅ Ready | Quick add button |

### ✅ Inventory Management
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Inventory List | `/inventory` | ✅ Ready | Main stock view |
| Inventory Stats | `/inventory` | ✅ Ready | Total, low, out of stock |
| Receiving Tab | `/inventory` | ⚠️ Placeholder | UI present, limited functionality |
| Transfers Tab | `/inventory` | ⚠️ Placeholder | UI present, limited functionality |
| Vendor Bills Tab | `/inventory` | ✅ Ready | Links to vendor bills |
| Alerts Tab | `/inventory` | ✅ Ready | Low/out of stock alerts |
| Barcode Scanner | `/inventory` | ✅ Ready | Camera + manual entry |
| Bulk Selection | `/inventory` | ✅ Ready | Multi-select checkboxes |
| Print Labels | `/inventory` | ✅ Ready | Bulk action button |
| Adjust Stock | `/inventory` | ✅ Ready | Bulk action button |
| Transfer Stock | `/inventory` | ✅ Ready | Bulk action button |

### ✅ Customer Management
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Customer List | `/customers` | ✅ Ready | Searchable list |
| Customer Stats | `/customers` | ✅ Ready | Total, business, individual |
| Customer Search | `/customers` | ✅ Ready | Name, email, phone |
| Type Filter | `/customers` | ✅ Ready | All/Individual/Business |
| Customer Details | `/customers` | ✅ Ready | Right panel profile |
| Loyalty Tiers | `/customers` | ✅ Ready | Standard/Silver/Gold/Platinum |
| Create Customer | `/customers` | ✅ Ready | Modal form |
| Edit Customer | `/customers` | ✅ Ready | Modal form |
| Delete Customer | `/customers` | ✅ Ready | Confirmation dialog |
| Recent Orders | `/customers` | ✅ Ready | Order history display |

### ✅ Documents & Vendor Bills
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Documents Hub | `/documents` | ✅ Ready | Central document view |
| Document Stats | `/documents` | ✅ Ready | NeedsReview, Processing, Failed |
| Next Action Center | `/documents` | ✅ Ready | Guided workflow |
| Document Filters | `/documents` | ✅ Ready | State, vendor, date |
| Processing Queue | `/documents` | ✅ Ready | Active OCR jobs |
| Vendor Bills List | `/vendor-bills` | ✅ Ready | Bill history |
| Upload Bills | `/vendor-bills/upload` | ✅ Ready | PDF upload |
| Bill Review | `/vendor-bills/:id` | ✅ Ready | Review extracted data |
| Template Manager | `/vendor-bills/templates` | ✅ Ready | Vendor templates |
| Template Editor | `/vendor-bills/templates/:id` | ✅ Ready | Edit extraction rules |
| Review Queue | `/review` | ✅ Ready | Cases needing review |
| Review Case Detail | `/review/:caseId` | ✅ Ready | Individual case review |

### ✅ Reporting
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Reports Page | `/reporting` | ✅ Ready | Report generation |
| Report Export | `/reporting` | ✅ Ready | CSV export with tenant isolation |

### ✅ Admin & Settings
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Admin Overview | `/admin` | ✅ Ready | Settings hub |
| General Settings | `/admin` | ✅ Ready | Language, theme, currency |
| Display Settings | `/admin` | ✅ Ready | Appearance options |
| Users & Roles | `/admin` | ✅ Ready | User management |
| Store Info | `/admin` | ✅ Ready | Store configuration |
| My Preferences | `/preferences` | ✅ Ready | Personal settings |
| Company & Stores | `/admin/store` | ✅ Ready | Company/location setup |
| Network & Sync | `/admin/network` | ✅ Ready | Sync settings |
| Localization | `/admin/branding` | ✅ Ready | Language, regional |
| Product Config | `/admin/pricing` | ✅ Ready | Categories, units |
| Data Management | `/admin/data` | ✅ Ready | Backup, import, export |
| Parts Mapping | `/admin/data/parts-mapping` | ✅ Ready | Product mapping |
| Product Import | `/admin/data/import` | ✅ Ready | Bulk import |
| Tax Rules | `/admin/taxes` | ✅ Ready | Tax configuration |
| Integrations | `/admin/integrations` | ✅ Ready | External services |
| Sync Dashboard | `/admin/health` | ✅ Ready | Sync monitoring |
| Feature Flags | `/admin/advanced` | ✅ Ready | Enable/disable features |
| Performance | `/admin/performance` | ✅ Ready | Metrics monitoring |
| Hardware | `/admin/hardware` | ✅ Ready | Device configuration |
| Network Settings | `/admin/network/lan` | ✅ Ready | LAN configuration |
| Receipts | `/admin/receipts` | ✅ Ready | Receipt templates |
| Setup Wizard | `/admin/setup` | ✅ Ready | Guided setup |
| Capabilities | `/admin/capabilities` | ✅ Ready | Feature capabilities |
| Exports | `/admin/exports` | ✅ Ready | Export management |

### ✅ Sales Management
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Sales Management | `/sales` | ✅ Ready | Layaway, work orders, etc. |

### ✅ Forms
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Form Templates | `/forms` | ✅ Ready | Custom form builder |

---

## 2. Features Documented but Not Visible

### ⚠️ Build Variant Gated Features
These features are controlled by build flags and may not be visible in all builds:

| Feature | Flag | Notes |
|---------|------|-------|
| Admin Section | `ENABLE_ADMIN` | Full admin in export/full builds only |
| Reporting | `ENABLE_REPORTING` | Export/full builds only |
| Vendor Bills | `ENABLE_VENDOR_BILLS` | Full build only |
| Documents | `ENABLE_DOCUMENTS` | Full build only |
| Exports | `ENABLE_EXPORTS` | Export/full builds only |
| Review Queue | `ENABLE_REVIEW` | Full build only |

### ⚠️ Capability Gated Features
These features require specific backend capabilities:

| Feature | Capability Key | Notes |
|---------|---------------|-------|
| Review Queue Nav | `cleanup.view` | Requires cleanup capability |
| Data Management | Export features | Requires export capability |
| Integrations | Export features | Requires export capability |
| Sync Dashboard | Sync features | Requires sync capability |

### ⚠️ Permission Gated Features
These features require specific user permissions:

| Feature | Permission | Notes |
|---------|-----------|-------|
| Sell Page | `access_sell` | Sales access |
| Lookup Page | `access_sell` | Product lookup |
| Inventory | `access_inventory` | Inventory access |
| Customers | `access_sell` | Customer access |
| Reporting | `access_admin` | Admin access |
| Admin | `access_admin` | Admin access |
| Upload Bills | `upload_vendor_bills` | Bill upload |
| View Bills | `view_vendor_bills` | Bill viewing |
| Review Bills | `review_vendor_bills` | Bill review |

---

## 3. Features Needing User Training

### 🎓 High Priority Training
| Feature | Complexity | Training Time | Notes |
|---------|-----------|---------------|-------|
| Point of Sale | Medium | 30 min | Core daily workflow |
| Barcode Scanning | Low | 10 min | Hardware integration |
| Customer Selection | Low | 10 min | Loyalty integration |
| Payment Processing | Medium | 20 min | Cash handling, card processing |

### 🎓 Medium Priority Training
| Feature | Complexity | Training Time | Notes |
|---------|-----------|---------------|-------|
| Inventory Management | Medium | 45 min | Stock tracking, receiving |
| Customer Management | Low | 20 min | Profile management |
| Product Lookup | Low | 15 min | Search and filtering |
| Vendor Bill Upload | Medium | 30 min | OCR workflow |

### 🎓 Admin Training (Managers Only)
| Feature | Complexity | Training Time | Notes |
|---------|-----------|---------------|-------|
| User Management | Medium | 30 min | Roles and permissions |
| Store Configuration | Medium | 30 min | Initial setup |
| Tax Rules | Medium | 20 min | Tax configuration |
| Hardware Setup | High | 45 min | Printers, scanners |
| Data Import/Export | Medium | 30 min | Bulk operations |
| Integrations | High | 60 min | QuickBooks, etc. |

### 🎓 Specialized Training
| Feature | Complexity | Training Time | Notes |
|---------|-----------|---------------|-------|
| Vendor Templates | High | 45 min | OCR template creation |
| Review Queue | Medium | 30 min | Document review workflow |
| Sync Dashboard | Medium | 20 min | Troubleshooting sync |
| Feature Flags | Low | 15 min | Enable/disable features |

---

## 4. UI Flow Summary

### Main Navigation Paths

```
Login Page
    ├── Fresh Install? → Fresh Install Wizard → Login
    ├── First Run? → Setup Wizard → Dashboard
    └── Normal Login → Dashboard

Dashboard (/)
    ├── Quick Actions
    │   ├── New Sale → /sell
    │   ├── Product Lookup → /lookup
    │   ├── Inventory → /inventory
    │   ├── Customers → /customers
    │   ├── Reports → /reporting
    │   └── Settings → /admin
    │
    └── Sidebar Navigation
        ├── Main Group
        │   ├── Dashboard → /
        │   ├── Sell → /sell
        │   └── Lookup → /lookup
        │
        ├── Operations Group
        │   ├── Inventory → /inventory
        │   ├── Customers → /customers
        │   └── Reports → /reporting
        │
        ├── Documents Group
        │   ├── Documents → /documents
        │   ├── Vendor Bills → /vendor-bills
        │   ├── Upload Bills → /vendor-bills/upload
        │   ├── Review Queue → /review
        │   └── Templates → /vendor-bills/templates
        │
        └── Admin Group
            ├── Admin → /admin
            └── Exports → /admin/exports

Admin (/admin)
    ├── My Preferences
    ├── Company & Stores
    ├── Network & Sync
    ├── Localization
    ├── Product Config
    ├── Data Management
    │   ├── Parts Mapping → /admin/data/parts-mapping
    │   └── Product Import → /admin/data/import
    ├── Tax Rules
    ├── Integrations
    ├── Sync Dashboard
    ├── Feature Flags
    ├── Performance
    ├── General
    ├── Display
    ├── Users & Roles
    ├── Store Info
    ├── Hardware
    ├── Backup & Sync
    ├── Security
    └── Notifications
```

### Key User Workflows

#### 1. Daily Sales Workflow
```
Login → Dashboard → Sell → Search/Scan Product → Add to Cart → 
Select Customer (optional) → Apply Discount (optional) → 
Select Payment → Complete Sale → Print Receipt
```

#### 2. Inventory Receiving Workflow
```
Login → Inventory → Vendor Bills Tab → Upload Bill → 
OCR Processing → Review Extracted Data → Approve → 
Stock Updated
```

#### 3. Customer Lookup Workflow
```
Login → Customers → Search Customer → View Profile → 
Start New Sale (with customer selected)
```

#### 4. End of Day Workflow
```
Login → Dashboard → View Today's Stats → 
Reports → Generate Daily Report → 
Admin → Backup (if needed)
```

---

## 5. Known Limitations

### Backend Stubs (Not Fully Implemented)
| Feature | Status | Notes |
|---------|--------|-------|
| Report Export | ✅ Complete | CSV export with security measures |
| Data Export | ✅ Complete | Full CSV export with validation |
| QuickBooks OAuth | ✅ Complete | Configurable via environment variable |

### UI Placeholders
| Feature | Status | Notes |
|---------|--------|-------|
| Receiving Tab | Placeholder | Basic UI, limited functionality |
| Transfers Tab | Placeholder | Basic UI, limited functionality |
| Payment Processing | UI Only | Buttons present, no terminal integration |
| Discount/Coupon | UI Only | Buttons present, logic TBD |

### Mobile Limitations
| Feature | Notes |
|---------|-------|
| Sidebar | Converts to bottom nav on mobile |
| Product Grid | Fewer columns on small screens |
| Detail Panels | Stack vertically on mobile |

---

## 6. Recommended Training Schedule

### Week 1: Core Operations
- Day 1: Login, Navigation, Dashboard (1 hour)
- Day 2: Point of Sale basics (2 hours)
- Day 3: Point of Sale advanced + practice (2 hours)
- Day 4: Product Lookup (1 hour)
- Day 5: Customer Management (1 hour)

### Week 2: Inventory & Documents
- Day 1: Inventory Overview (1 hour)
- Day 2: Barcode Scanning + Receiving (2 hours)
- Day 3: Vendor Bills + OCR (2 hours)
- Day 4: Review Queue (1 hour)
- Day 5: Practice scenarios (2 hours)

### Week 3: Admin (Managers Only)
- Day 1: User Management (1 hour)
- Day 2: Store Configuration (1 hour)
- Day 3: Tax Rules + Product Config (1 hour)
- Day 4: Hardware Setup (2 hours)
- Day 5: Integrations + Backup (2 hours)

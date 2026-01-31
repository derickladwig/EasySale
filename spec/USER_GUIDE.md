# EasySale — User Guide

**Version**: 1.1  
**Last Updated**: 2026-01-30  
**Target Audience**: Store owners, managers, cashiers, inventory staff

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation & Interface](#2-navigation--interface)
3. [Dashboard](#3-dashboard)
4. [Point of Sale](#4-point-of-sale)
5. [Product Lookup](#5-product-lookup)
6. [Inventory Management](#6-inventory-management)
7. [Customer Management](#7-customer-management)
8. [Documents & Vendor Bills](#8-documents--vendor-bills)
9. [Reporting](#9-reporting)
10. [Admin & Settings](#10-admin--settings)
11. [Offline Operation](#11-offline-operation)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Getting Started

### 1.1 First Run Experience

When you first access EasySale, you may see:

1. **Fresh Install Wizard** — If the system detects a new installation
   - Option to restore from backup
   - Option to start fresh
   
2. **First-Run Setup Wizard** — Configure your business
   - Company information
   - Store configuration
   - Tax rules
   - User accounts
   - Hardware setup
   - Branding

### 1.2 Login

**URL**: http://localhost:7945 (or your configured domain)

**Login Options**:
- **Password Login**: Username and password
- **PIN Login**: Quick 4-6 digit PIN (if configured)

**First-Time Setup**:
- On first launch, you'll create your admin account
- Choose a secure password (minimum 8 characters)

> ✅ **Security**: No default passwords - you set your own credentials.

**Login Page Features**:
- "Remember username" checkbox
- Password visibility toggle
- Status panel showing database and sync status
- Demo mode accounts (if enabled)

### 1.3 Status Panel

The login page shows system status:

| Status | Meaning |
|--------|---------|
| 🟢 Database: Connected | Local database is accessible |
| 🟢 Sync: Online | Connected to sync service |
| 🟡 Sync: Syncing | Currently synchronizing data |
| 🔴 Sync: Offline | No network connection (offline mode) |

---

## 2. Navigation & Interface

### 2.1 Main Navigation

**Desktop (Sidebar)**:
- Dashboard (Home)
- Sell (Point of Sale)
- Lookup (Product Search)
- Inventory
- Customers
- Reports
- Documents (Full build only)
- Vendor Bills (Full build only)
- Admin/Settings

**Mobile (Bottom Navigation)**:
- Quick access to top 4-5 items
- "More" menu for additional options

### 2.2 Header Bar

| Element | Purpose |
|---------|---------|
| Company Logo | Click to return to Dashboard |
| Global Search | Search products, customers, orders |
| Sync Status | Shows Online/Syncing/Offline |
| Notifications | Alerts and system messages |
| Profile Menu | User settings, logout |

### 2.3 Responsive Design

| Device | Layout |
|--------|--------|
| Desktop | Full sidebar + content area |
| Tablet | Collapsible sidebar |
| Mobile | Bottom navigation + hamburger menu |

---

## 3. Dashboard

### 3.1 Overview

The Dashboard is your command center for daily operations.

### 3.2 Statistics Cards

| Card | Description |
|------|-------------|
| Today's Sales | Total revenue with trend indicator |
| Transaction Count | Number of completed sales |
| Average Transaction | Average sale value |
| Items Sold | Total items sold today |

### 3.3 Quick Actions

Large, touch-friendly buttons for common tasks:

| Action | Description |
|--------|-------------|
| New Sale | Start a new transaction |
| Product Lookup | Search product catalog |
| Inventory | View stock levels |
| Customers | Manage customer profiles |
| Reports | Generate reports |
| Settings | System configuration |

### 3.4 Alerts Panel

Shows important notifications:
- Low stock warnings
- Out of stock alerts
- System notifications
- Sync status updates

### 3.5 Recent Transactions

- Last 10 transactions
- Customer name, amount, status
- Click to view details

---

## 4. Point of Sale

### 4.1 Layout

| Panel | Purpose |
|-------|---------|
| Left | Product catalog with search and categories |
| Right | Shopping cart and checkout |

### 4.2 Product Catalog

**Search**: Type product name or SKU in the search bar

**Category Tabs**: Filter products by category

**View Modes**:
- Grid view (default) — Product cards with images
- List view — Compact list format

**Product Cards Show**:
- Product image/icon
- Name and SKU
- Price
- Stock level indicator

### 4.3 Shopping Cart

**Customer Selection**:
- Walk-in customer (default)
- Search and select existing customer

**Cart Items**:
- Product name and unit price
- Quantity controls (+/-)
- Line total
- Remove button (X)

**Quick Actions**:
- Apply Discount
- Apply Coupon
- Clear Cart

### 4.4 Checkout

**Totals Display**:
- Subtotal
- Tax (configurable rate)
- Grand Total

**Payment Methods**:
| Method | Description |
|--------|-------------|
| Cash | Cash payment |
| Card | Credit/debit card |
| Other | Split payments, gift cards, etc. |

### 4.5 Barcode Scanning

- Scanner input auto-focuses on search bar
- Scan barcode to add product to cart
- Manual barcode entry supported

---

## 5. Product Lookup

### 5.1 Search Features

- Full-text search (name, SKU, brand)
- Category filtering via tabs
- Advanced filters:
  - Brand
  - Stock level (In Stock, Low, Out)
  - Price range
  - Sort options

### 5.2 Product List

Each product shows:
- Thumbnail/icon
- Name and SKU
- Brand badge
- Price and stock level

### 5.3 Product Detail Panel

Click a product to see:
- Large product image
- Full specifications
- Stock information
- Location in store
- Description
- Quick stats (last sold, popularity)

**Actions**:
- Add to Sale
- Edit Product
- Delete Product

### 5.4 Product Management

| Action | How |
|--------|-----|
| Create | Click "Add" button, fill form |
| Edit | Select product, click "Edit" |
| Delete | Select product, click "Delete", confirm |
| Import | Admin → Data Management → Import |

---

## 6. Inventory Management

### 6.1 Overview

**Statistics Cards**:
- Total Items
- Low Stock count
- Out of Stock count
- Pending Receiving

### 6.2 Tabs

| Tab | Purpose |
|-----|---------|
| Inventory | Main stock list |
| Receiving | Process incoming shipments |
| Transfers | Move stock between locations |
| Vendor Bills | OCR document processing |
| Alerts | Items needing attention |

### 6.3 Inventory List

**Columns**:
- Product name and SKU
- Location
- Current stock vs. minimum
- Status badge

**Status Badges**:
| Badge | Meaning |
|-------|---------|
| 🟢 In Stock | Above minimum level |
| 🟡 Low Stock | Below minimum, above zero |
| 🔴 Out of Stock | Zero quantity |

### 6.4 Barcode Scanning

Click "Scan" button to:
- Use device camera
- Enter barcode manually
- Quick product lookup

### 6.5 Bulk Actions

Select multiple items with checkboxes, then:
- Print Labels
- Adjust Stock
- Transfer to another location

---

## 7. Customer Management

### 7.1 Overview

**Statistics**:
- Total customers
- Business vs. Individual
- Total revenue

### 7.2 Customer List

**Search**: By name, email, or phone

**Filter**: All / Individual / Business

**Customer Cards Show**:
- Name and contact info
- Customer type badge
- Loyalty tier badge

### 7.3 Customer Detail Panel

**Contact Information**:
- Email, phone, address

**Loyalty Tier**:
| Tier | Benefits |
|------|----------|
| Standard | Base pricing |
| Silver | 5% discount |
| Gold | 10% discount |
| Platinum | 15% discount |

**Statistics**:
- Total spent
- Order count
- Average order value
- Last order date

**Recent Orders**: Purchase history

### 7.4 Customer Management

| Action | How |
|--------|-----|
| Create | Click "Add Customer", fill form |
| Edit | Select customer, click "Edit" |
| Delete | Select customer, click "Delete", confirm |
| New Sale | Select customer, click "New Sale" |

---

## 8. Documents & Vendor Bills

> **Note**: Available in Full build only

### 8.1 Documents Hub

**Statistics Cards**:
- Needs Review count
- Processing count
- Failed count

**Next Action Center**: Guided workflow suggestions

### 8.2 Document Tabs

| Tab | Purpose |
|-----|---------|
| Documents | All uploaded documents |
| Processing Queue | Active OCR jobs |

### 8.3 Vendor Bills Workflow

1. **Upload**: Click "Upload" and select PDF invoice
2. **Processing**: OCR extracts text automatically
3. **Review**: Check extracted data for accuracy
4. **Correct**: Fix any errors in extracted data
5. **Approve**: Confirm and import to inventory

### 8.4 Template Management

Create vendor templates to improve OCR accuracy:
- Define extraction rules per vendor
- Map fields to product attributes
- Save for future invoices

---

## 9. Reporting

### 9.1 Available Reports

| Report | Description |
|--------|-------------|
| Sales | Daily, weekly, monthly sales |
| Inventory | Stock levels, turnover |
| Customer | Purchase patterns, loyalty |
| Financial | Revenue, profit margins |

### 9.2 Report Features

- Date range selection
- Filter by category, location, etc.
- Print functionality
- Export (coming soon)

---

## 10. Admin & Settings

### 10.1 Settings Categories

| Category | Purpose |
|----------|---------|
| My Preferences | Personal display settings |
| Company & Stores | Business information |
| Network & Sync | Synchronization settings |
| Localization | Language, currency, region |
| Product Config | Categories, units, attributes |
| Data Management | Backup, import, export |
| Tax Rules | Tax rates and rules |
| Integrations | QuickBooks, WooCommerce |
| Sync Dashboard | Monitor sync status |
| Feature Flags | Enable/disable features |
| Performance | System metrics |
| Hardware | Printers, scanners, terminals |

### 10.2 User Management

**Create User**:
1. Go to Admin → Users & Roles
2. Click "Add User"
3. Fill in details
4. Assign role
5. Save

**Roles**:
| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Sales, inventory, reports |
| Cashier | Sales only |
| Inventory | Inventory only |

### 10.3 Hardware Setup

**Printers**:
- Receipt printers (ESC/POS)
- Label printers (Zebra, Brother)

**Scanners**:
- USB barcode scanners
- Camera-based scanning

**Payment Terminals**:
- Stripe Terminal
- Square
- PAX, Ingenico

---

## 11. Offline Operation

### 11.1 How It Works

EasySale is designed to work without internet:

1. All data stored locally in SQLite
2. Operations continue normally offline
3. Changes queued for sync
4. Automatic sync when online

### 11.2 Offline Indicators

| Indicator | Location | Meaning |
|-----------|----------|---------|
| 🔴 Offline | Header | No network connection |
| 🟡 Syncing | Header | Synchronizing data |
| 🟢 Online | Header | Connected and synced |

### 11.3 Working Offline

**What Works**:
- All sales transactions
- Product lookup
- Inventory management
- Customer management
- Reports (local data)

**What Doesn't Work**:
- Multi-store sync
- External integrations
- Cloud backups

### 11.4 Sync Recovery

When connectivity returns:
1. System detects network
2. Queued changes uploaded
3. Remote changes downloaded
4. Conflicts resolved (last-write-wins)
5. Status shows "Online"

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F3 | Focus search bar |
| Ctrl+N | New item (context-dependent) |
| ↑↓ | Navigate lists |
| Enter | Select/confirm |
| Esc | Cancel/close modal |
| Ctrl+S | Save (in forms) |

---

## 13. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Check username/password, try default credentials |
| Page won't load | Refresh browser, check network |
| Sync stuck | Check network, restart backend |
| Printer not working | Check connection, verify settings |
| Scanner not detected | Reconnect USB, check drivers |

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Database connection error" | Can't access local database | Restart backend |
| "Network error" | API request failed | Check backend is running |
| "Permission denied" | Insufficient access | Contact admin |
| "Session expired" | JWT token expired | Login again |

### Getting Help

1. Check this User Guide
2. Review [Troubleshooting](INSTALL.md#7-troubleshooting) in Install Guide
3. Search [GitHub Issues](https://github.com/derickladwig/EasySale/issues)
4. Open a new issue if needed

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| SKU | Stock Keeping Unit — unique product identifier |
| OCR | Optical Character Recognition — text extraction from images |
| POS | Point of Sale — checkout system |
| JWT | JSON Web Token — authentication token |
| HMR | Hot Module Replacement — live code updates |

## Appendix B: System Requirements

| Requirement | Specification |
|-------------|---------------|
| Browser | Chrome 90+, Firefox 90+, Edge 90+ |
| Screen | 1024x768 minimum, 1920x1080 recommended |
| Network | Required for sync, optional for local operation |

---

*For technical documentation, see [design.md](design.md) and [INSTALL.md](INSTALL.md).*

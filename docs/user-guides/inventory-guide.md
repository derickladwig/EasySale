# Warehouse and Inventory Management Guide

A comprehensive guide for managing inventory in EasySale POS.

## Getting Started

### Accessing the Warehouse Module

1. **Log in** to EasySale
2. Click **"Warehouse"** in the left navigation
3. You'll see the main inventory dashboard

**Required Role**: Inventory Clerk, Manager, or Admin

### Understanding Your Role

As an inventory clerk, you can:
- **Receive stock** from vendors
- **Adjust inventory** levels
- **Transfer stock** between locations
- **Perform cycle counts**
- **Generate inventory reports**

---

## Inventory Dashboard

The dashboard shows at-a-glance inventory information:

```
┌────────────────────────────────────────────────────────────────┐
│ Inventory Dashboard                                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ Total Items  │ │ Low Stock    │ │ Out of Stock │            │
│ │    5,420     │ │     42       │ │      8       │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ Stock Value  │ │ Pending      │ │ Adjustments  │            │
│ │  $450,000    │ │ Receipts: 3  │ │  Today: 12   │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                │
│ Quick Actions:                                                 │
│ [Receive Stock] [Adjust Inventory] [Transfer] [Cycle Count]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Receiving Stock

When shipments arrive from vendors, record them in the system.

### Standard Receiving Process

#### Step 1: Start New Receipt
1. Click **"Warehouse"** → **"Receive Stock"**
2. Enter **PO Number** (if applicable)
3. Select **Vendor** from dropdown
4. Select **Receiving Location** (usually Backroom/Warehouse)

#### Step 2: Add Items
**Option A: Scan Items**
1. Scan each item's barcode
2. System adds item to receipt
3. Enter quantity received
4. Repeat for all items

**Option B: Manual Entry**
1. Click **"Add Item"**
2. Search for product
3. Enter quantity received
4. Enter cost per unit (if different from default)
5. Click **"Add"**

**Option C: Import from PO**
1. If PO exists in system, click **"Import PO"**
2. Review expected items
3. Verify quantities received
4. Adjust as needed for shortages/overages

#### Step 3: Verify Receipt
Before completing, verify:
- All items are accounted for
- Quantities match packing slip
- Costs are correct
- Items are in good condition

#### Step 4: Complete Receipt
1. Review summary:
   - Total items
   - Total units
   - Total cost
2. Add notes if needed (e.g., "Box 3 damaged")
3. Click **"Complete Receipt"**
4. Receipt number generated
5. Print receiving report

### Handling Receiving Issues

#### Short Shipment
If fewer items received than ordered:
1. Enter actual quantity received
2. Add note explaining shortage
3. Contact vendor about missing items
4. Create separate receipt when items arrive

#### Over Shipment
If more items received than ordered:
1. Verify items are correct
2. Enter actual quantity received
3. Add note about overage
4. Contact vendor to clarify

#### Damaged Items
If items arrive damaged:
1. Don't add damaged items to inventory
2. Set damaged items aside
3. Note damage in receipt comments
4. Contact vendor for credit/replacement
5. Create adjustment if items accepted as-is

---

## Adjusting Inventory

Use adjustments to correct inventory discrepancies.

### When to Adjust

- **Physical count differs** from system
- **Damaged items** removed from stock
- **Items found** that weren't in system
- **Theft/loss** discovered
- **Expired items** removed

### Making an Adjustment

1. Click **"Warehouse"** → **"Adjust Inventory"**
2. Search for the product
3. Select **Location** (if multiple)
4. Enter:
   - **System Quantity**: What system shows (auto-filled)
   - **Actual Quantity**: What you counted
5. Select **Reason**:
   | Reason | When to Use |
   |--------|-------------|
   | Count | Physical count correction |
   | Damaged | Items damaged and removed |
   | Lost | Items missing/lost |
   | Found | Items discovered |
   | Theft | Known theft |
   | Expired | Items past expiration |
   | Vendor Return | Returned to vendor |
   | Other | Other (notes required) |
6. Enter **Notes** (always explain adjustments)
7. Click **"Submit Adjustment"**

### Adjustment Best Practices

- **Always add notes** explaining why
- **Document supporting info** (photos, reports)
- **Process promptly** - don't let discrepancies linger
- **Investigate patterns** - repeated issues need attention

---

## Transferring Stock

Move inventory between locations within your store.

### Common Transfer Scenarios

- Restocking sales floor from backroom
- Moving seasonal items to different area
- Consolidating inventory to one location

### Making a Transfer

1. Click **"Warehouse"** → **"Transfer Stock"**
2. Select **Product** (scan or search)
3. Select **From Location** (source)
4. Select **To Location** (destination)
5. Enter **Quantity** to transfer
6. Add **Notes** if needed
7. Click **"Complete Transfer"**

### Transfer Tips

- Physically move items **before** recording transfer
- Verify item is in **correct location** after transfer
- Use transfers instead of adjustments when moving stock

---

## Cycle Counting

Regular counting keeps inventory accurate.

### Types of Counts

| Count Type | Description | Frequency |
|------------|-------------|-----------|
| Full Inventory | Count everything | Annually |
| Cycle Count | Count portion | Daily/Weekly |
| Category Count | Count one category | Monthly |
| ABC Count | Count by value tier | Varies |

### Performing a Cycle Count

#### Step 1: Start Count
1. Click **"Warehouse"** → **"Cycle Count"**
2. Select **Location** to count
3. Select **Scope**:
   - Specific products
   - Category
   - Aisle/Section
   - Random selection
4. Click **"Start Count"**

#### Step 2: Count Items
1. System shows items to count
2. For each item:
   - Go to location
   - Count physical inventory
   - Enter counted quantity
   - Move to next item
3. Use handheld device or paper list

#### Step 3: Review Variances
System shows items with discrepancies:
```
┌────────────────────────────────────────────────────────────────┐
│ Cycle Count Results                                            │
├─────────────────────┬──────────┬──────────┬──────────┬─────────┤
│ Product             │ System   │ Counted  │ Variance │ Value   │
├─────────────────────┼──────────┼──────────┼──────────┼─────────┤
│ Red Baseball Cap    │ 35       │ 34       │ -1       │ -$8.50  │
│ Blue Baseball Cap   │ 28       │ 28       │ 0        │ $0.00   │
│ Green Baseball Cap  │ 15       │ 18       │ +3       │ +$25.50 │
├─────────────────────┼──────────┼──────────┼──────────┼─────────┤
│ TOTALS              │ 78       │ 80       │ +2       │ +$17.00 │
└─────────────────────┴──────────┴──────────┴──────────┴─────────┘
```

#### Step 4: Investigate Variances
For significant variances:
1. **Recount** the item
2. Check **other locations** for misplaced items
3. Review **recent transactions**
4. Check for **pending receipts** or transfers

#### Step 5: Submit Count
1. Review all entries
2. Add notes for variances
3. Click **"Submit Count"**
4. System creates adjustments automatically
5. Print count report for records

### Cycle Count Best Practices

- **Count regularly** - small, frequent counts are better
- **Count when quiet** - before opening or after closing
- **Don't rush** - accuracy matters more than speed
- **Investigate variances** - understand why they happen
- **Track patterns** - repeated issues need attention

---

## Stock Locations

Manage where inventory is stored.

### Understanding Locations

```
Store Layout Example:

┌──────────────────────────────────────────────────────────────┐
│                        STORE                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    SALES FLOOR                          │ │
│  │  Aisle A    Aisle B    Aisle C    Aisle D              │ │
│  │  (Caps)     (Parts)    (Paint)    (Equipment)          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌───────────────────┐  ┌───────────────────────────────────┐│
│  │    BACKROOM       │  │           WAREHOUSE              ││
│  │  (Receiving)      │  │  (Bulk Storage)                  ││
│  └───────────────────┘  └───────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Viewing Location Inventory

1. Click **"Warehouse"** → **"Locations"**
2. Select a location
3. View all products and quantities at that location

### Setting Up Bin Locations

For detailed tracking, use bin locations:

```
Location Structure:
  Location → Aisle → Shelf → Bin
  
Example:
  Backroom → A → 3 → A3-01
  
Bin code: BACKROOM-A3-01
```

---

## Low Stock Management

### Viewing Low Stock Items

1. Click **"Warehouse"** → **"Low Stock"**
2. System shows items at or below reorder point:

```
┌────────────────────────────────────────────────────────────────┐
│ Low Stock Alert                                                │
├─────────────────────┬───────┬────────┬────────┬───────────────┤
│ Product             │ Stock │ Min    │ Reorder│ Suggested     │
├─────────────────────┼───────┼────────┼────────┼───────────────┤
│ Blue Baseball Cap   │ 8     │ 10     │ 15     │ Order 50      │
│ Oil Filter - Toyota │ 3     │ 5      │ 10     │ Order 25      │
│ Brake Pads - Honda  │ 0     │ 4      │ 8      │ Order 20      │
└─────────────────────┴───────┴────────┴────────┴───────────────┘
```

### Understanding Stock Levels

| Level | Meaning |
|-------|---------|
| **Current Stock** | What's on hand |
| **Min Stock** | Alert threshold |
| **Reorder Point** | When to order more |
| **Reorder Quantity** | How much to order |
| **Max Stock** | Don't exceed this |

### Creating Purchase Orders

1. From Low Stock screen, select items to order
2. Click **"Create Purchase Order"**
3. Select vendor
4. Review quantities
5. Submit PO to vendor

---

## Inventory Reports

### Available Reports

| Report | Description | Use For |
|--------|-------------|---------|
| Stock Levels | Current inventory | Daily review |
| Low Stock | Items below reorder | Ordering decisions |
| Stock Valuation | Inventory value | Financial reporting |
| Movement History | Stock changes | Investigating issues |
| Adjustment History | All adjustments | Auditing |
| Count Variance | Count discrepancies | Loss prevention |

### Running a Report

1. Click **"Warehouse"** → **"Reports"**
2. Select report type
3. Set parameters:
   - Date range
   - Location filter
   - Category filter
4. Click **"Generate"**
5. View, print, or export

### Exporting Data

Reports can be exported as:
- **PDF** - For printing/sharing
- **Excel** - For analysis
- **CSV** - For other systems

---

## Best Practices

### Daily Tasks

- [ ] Review low stock alerts
- [ ] Process any pending receipts
- [ ] Check for out-of-stock items
- [ ] Address any adjustment requests

### Weekly Tasks

- [ ] Perform cycle counts (rotate through categories)
- [ ] Review adjustment history
- [ ] Check for slow-moving items
- [ ] Verify stock locations are accurate

### Monthly Tasks

- [ ] Full category counts
- [ ] Review stock valuation
- [ ] Analyze shrinkage trends
- [ ] Update reorder points if needed

### Accuracy Tips

1. **Count twice** before recording
2. **Investigate** all variances
3. **Document** everything
4. **Process changes promptly**
5. **Keep areas organized**
6. **Train staff** on procedures
7. **Review reports** regularly

---

## Troubleshooting

### Common Issues

#### Item Not Found When Scanning
- Try searching by name or SKU
- Check if item is in system
- May need to be added by manager

#### Variance After Receipt
- Was PO quantity correct?
- Were all items scanned?
- Check for items left in boxes

#### Stock Shows Negative
- Sale processed before receipt?
- Adjustment made in wrong direction?
- Contact manager to investigate

#### Cannot Complete Transfer
- Verify source location has quantity
- Check for reserved stock
- Ensure you have permission

### Getting Help

- **Manager**: For policy questions, approvals
- **IT Support**: For system issues
- **Vendor**: For shipment issues

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F2 | Product Search |
| F5 | Refresh Screen |
| F7 | New Adjustment |
| F8 | New Transfer |
| F9 | New Receipt |

### Common Adjustment Reasons

| Reason | + or - | Use When |
|--------|--------|----------|
| Count | Either | Physical count differs |
| Damaged | Negative | Items removed due to damage |
| Lost | Negative | Items cannot be found |
| Found | Positive | Items discovered |
| Theft | Negative | Known theft |

### Location Codes

| Code | Meaning |
|------|---------|
| FLOOR | Sales floor |
| BACK | Backroom |
| WH | Warehouse |
| HOLD | On hold/reserved |

---

## Glossary

| Term | Definition |
|------|------------|
| **SKU** | Stock Keeping Unit - unique product identifier |
| **Barcode** | Scannable product code (UPC, EAN) |
| **Reorder Point** | Stock level that triggers ordering |
| **Lead Time** | Days from order to receipt |
| **Shrinkage** | Inventory loss (theft, damage, errors) |
| **Cycle Count** | Partial physical inventory count |
| **Variance** | Difference between system and actual |
| **Transfer** | Moving stock between locations |
| **Adjustment** | Changing quantity without movement |
| **Receipt** | Recording incoming inventory |

# Work Orders & Invoicing User Guide

## Overview

The Work Orders & Invoicing module allows you to manage service jobs, track parts and labor, and automatically generate invoices when work is completed. This guide covers creating work orders, managing their lifecycle, and understanding the automatic invoicing process.

## Prerequisites

- Work Orders module must be enabled in your configuration
- User must have appropriate permissions (create_work_order, edit_work_order, complete_work_order)
- Customer records should be created before creating work orders

## Creating a Work Order

### Step 1: Navigate to Work Orders

1. From the main dashboard, click **Work Orders** in the navigation menu
2. Click the **+ New Work Order** button

### Step 2: Enter Customer Information

1. Search for an existing customer or click **+ New Customer** to create one
2. Select the customer from the search results
3. The customer's contact information will auto-populate

### Step 3: Add Work Order Details

**Basic Information:**
- **Work Order Number**: Auto-generated (can be customized)
- **Description**: Brief description of the work to be performed
- **Priority**: Low, Medium, High, or Urgent
- **Due Date**: Expected completion date
- **Assigned To**: Select the technician or staff member

**Status Options:**
- **Draft**: Work order is being prepared
- **Scheduled**: Work is scheduled but not started
- **In Progress**: Work is currently being performed
- **Completed**: Work is finished
- **Cancelled**: Work order was cancelled

### Step 4: Add Line Items

**Parts:**
1. Click **+ Add Part**
2. Search for the part in your inventory
3. Enter quantity needed
4. Price will auto-populate from inventory (can be adjusted)
5. Part will be reserved but not removed from inventory until completion

**Labor:**
1. Click **+ Add Labor**
2. Enter description of labor (e.g., "Diagnostic", "Installation")
3. Enter hours or flat rate
4. Enter labor rate (defaults from configuration)
5. Total will calculate automatically

**Notes:**
- Add any special instructions or notes in the Notes field
- Notes are visible to technicians and appear on the invoice

### Step 5: Save the Work Order

1. Click **Save Draft** to save without committing
2. Click **Create Work Order** to finalize and assign

## Managing Work Orders

### Viewing Work Orders

**List View:**
- See all work orders with status, customer, and due date
- Filter by status, assigned technician, or date range
- Sort by any column
- Search by work order number or customer name

**Detail View:**
- Click any work order to see full details
- View all line items, notes, and history
- See current status and assigned technician
- View related invoice (if completed)

### Editing Work Orders

1. Open the work order detail page
2. Click **Edit** button
3. Modify any field (restrictions apply based on status)
4. Click **Save Changes**

**Edit Restrictions:**
- Completed work orders cannot be edited (must be reopened first)
- Invoiced work orders have limited edit capabilities
- Parts cannot be removed if already consumed

### Updating Work Order Status

**To Start Work:**
1. Open the work order
2. Click **Start Work** button
3. Status changes to "In Progress"
4. Timestamp recorded for tracking

**To Complete Work:**
1. Open the work order
2. Verify all parts and labor are recorded
3. Click **Complete Work Order** button
4. Confirm completion in the dialog
5. Invoice will be automatically generated

**To Cancel Work:**
1. Open the work order
2. Click **Cancel** button
3. Enter cancellation reason
4. Reserved parts will be released back to inventory

## Automatic Invoice Generation

### How It Works

When you complete a work order, EasySale automatically:

1. **Creates an invoice** with a unique invoice number
2. **Copies all line items** from the work order (parts + labor)
3. **Calculates taxes** based on your tax rate configuration
4. **Applies discounts** if configured for the customer
5. **Reduces inventory** for all parts used
6. **Sets invoiced_at timestamp** on the work order
7. **Links invoice to work order** for easy reference

### Viewing the Invoice

After completing a work order:

1. A success message appears with the invoice number
2. Click **View Invoice** to see the generated invoice
3. Or navigate to **Invoices** and search for the invoice number
4. The work order detail page shows a link to the invoice

### Invoice Details

The generated invoice includes:

- **Customer Information**: Name, address, contact details
- **Invoice Number**: Unique identifier
- **Invoice Date**: Date work was completed
- **Due Date**: Based on customer payment terms
- **Line Items**: All parts and labor from work order
- **Subtotal**: Sum of all line items
- **Tax**: Calculated based on tax rates
- **Discounts**: Applied if customer has discount tier
- **Total Amount**: Final amount due

### Printing and Sending Invoices

**Print Invoice:**
1. Open the invoice
2. Click **Print** button
3. Select printer or save as PDF
4. Invoice includes company branding and logo

**Email Invoice:**
1. Open the invoice
2. Click **Email** button
3. Verify customer email address
4. Add custom message (optional)
5. Click **Send**
6. Customer receives professional PDF invoice

## Inventory Management

### Parts Reservation

When you add parts to a work order:

- Parts are **reserved** but not removed from inventory
- Reserved quantity shows in inventory reports
- Other users see reduced available quantity
- Parts remain reserved until work order is completed or cancelled

### Inventory Reduction

When you complete a work order:

- All parts are **automatically removed** from inventory
- Inventory quantities update immediately
- Transaction is logged in inventory history
- Low stock alerts trigger if thresholds are met

### Handling Inventory Issues

**Part Not Available:**
- If a part is out of stock, you'll see a warning
- You can still add it to the work order
- Mark as "backordered" in notes
- Complete work order when part arrives

**Wrong Part Used:**
1. Reopen the work order (if not invoiced)
2. Remove incorrect part
3. Add correct part
4. Save changes
5. Inventory adjustments are made automatically

**Part Returned:**
1. Create a return transaction in Inventory
2. Reference the work order number
3. Inventory quantity increases
4. Consider creating a credit memo if already invoiced

## Payment Collection

### Collecting Payment

After generating an invoice:

1. Navigate to **Invoices** or open from work order
2. Click **Collect Payment** button
3. Select payment method:
   - Cash
   - Credit/Debit Card
   - Check
   - Account Credit
4. Enter amount received
5. Click **Process Payment**

### Partial Payments

1. Enter amount less than total
2. Invoice status changes to "Partially Paid"
3. Remaining balance is displayed
4. Customer can make additional payments later

### Payment History

- View all payments on the invoice detail page
- See payment method, amount, and date
- Print payment receipts
- Track outstanding balances

## Reporting

### Work Order Reports

**Available Reports:**
- Work Orders by Status
- Work Orders by Technician
- Work Orders by Customer
- Completion Time Analysis
- Parts Usage Report
- Labor Hours Report

**Generating Reports:**
1. Navigate to **Reports** > **Work Orders**
2. Select report type
3. Choose date range
4. Apply filters (status, technician, etc.)
5. Click **Generate Report**
6. Export to CSV or PDF

### Invoice Reports

**Available Reports:**
- Invoices by Status
- Outstanding Invoices
- Revenue by Period
- Customer Payment History
- Tax Summary

**Generating Reports:**
1. Navigate to **Reports** > **Invoices**
2. Select report type
3. Choose date range
4. Apply filters
5. Click **Generate Report**
6. Export to CSV or PDF

## Configuration

### Module Settings

Access via **Settings** > **Modules** > **Work Orders**

**General Settings:**
- Enable/disable work orders module
- Set default work order status
- Configure work order number format
- Set default labor rate

**Invoice Settings:**
- Enable automatic invoice generation
- Set default payment terms
- Configure invoice number format
- Set tax calculation rules

**Notification Settings:**
- Email notifications for work order status changes
- Email notifications for invoice generation
- SMS reminders for due dates
- Low stock alerts for parts

### Permissions

Configure user permissions via **Settings** > **Users & Permissions**

**Work Order Permissions:**
- `view_work_orders`: View work order list and details
- `create_work_order`: Create new work orders
- `edit_work_order`: Edit existing work orders
- `complete_work_order`: Mark work orders as complete
- `cancel_work_order`: Cancel work orders
- `delete_work_order`: Delete work orders (admin only)

**Invoice Permissions:**
- `view_invoices`: View invoice list and details
- `create_invoice`: Create invoices manually
- `edit_invoice`: Edit invoices (before payment)
- `void_invoice`: Void invoices
- `collect_payment`: Process payments

## Troubleshooting

### Invoice Not Generated

**Problem**: Completed work order but no invoice was created

**Solutions:**
1. Check that work order status is "Completed"
2. Verify invoice generation is enabled in settings
3. Check for error messages in the notification area
4. Try manual invoice creation: Open work order > **Create Invoice**
5. Contact support if issue persists

### Inventory Not Reduced

**Problem**: Completed work order but inventory quantities unchanged

**Solutions:**
1. Verify work order is marked as "Completed"
2. Check inventory transaction log for the work order
3. Ensure parts were properly added to work order
4. Try manual inventory adjustment if needed
5. Contact support with work order number

### Cannot Edit Work Order

**Problem**: Edit button is disabled or changes won't save

**Solutions:**
1. Check work order status (completed orders have restrictions)
2. Verify you have `edit_work_order` permission
3. Check if work order is already invoiced (limited edits allowed)
4. Try reopening the work order first
5. Contact your administrator for permission issues

### Invoice Shows Wrong Amount

**Problem**: Invoice total doesn't match expected amount

**Solutions:**
1. Verify all line items are correct
2. Check tax rate configuration
3. Review customer discount settings
4. Check for rounding differences
5. Recalculate invoice totals: Open invoice > **Recalculate**

### Payment Not Applied

**Problem**: Payment processed but invoice still shows balance

**Solutions:**
1. Refresh the invoice page
2. Check payment history section
3. Verify payment amount was entered correctly
4. Check for duplicate payments
5. Contact support with invoice and payment details

## Best Practices

### Work Order Creation

1. **Always verify customer information** before creating work order
2. **Add detailed descriptions** to help technicians understand the work
3. **Set realistic due dates** to manage customer expectations
4. **Assign to specific technician** rather than leaving unassigned
5. **Add notes for special requirements** or customer preferences

### Parts Management

1. **Check inventory before adding parts** to avoid backorders
2. **Use accurate quantities** to prevent inventory discrepancies
3. **Update parts list if changes occur** during work
4. **Document part substitutions** in notes
5. **Verify part numbers** to avoid using wrong items

### Invoice Management

1. **Review invoice before sending** to customer
2. **Verify customer email address** before sending
3. **Include payment instructions** in email message
4. **Follow up on overdue invoices** promptly
5. **Keep payment records** for accounting purposes

### Communication

1. **Update work order status** as work progresses
2. **Add notes for important information** that others need to know
3. **Notify customers** of status changes
4. **Set expectations** for completion time
5. **Confirm work** with customer before marking complete

## Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+N`: Create new work order
- `Ctrl+S`: Save work order
- `Ctrl+P`: Print invoice
- `Ctrl+F`: Search work orders
- `Esc`: Close dialog

### Quick Actions

- **Duplicate Work Order**: Click ⋮ menu > Duplicate (useful for recurring work)
- **Convert Estimate to Work Order**: Open estimate > Convert to Work Order
- **Bulk Status Update**: Select multiple work orders > Update Status
- **Quick Payment**: Click $ icon on invoice list for fast payment entry

### Mobile Access

- Access work orders from mobile browser
- Scan barcodes to add parts
- Update status from job site
- Capture photos and attach to work order
- Collect payments on-site

## Related Documentation

- [Estimates User Guide](./estimates.md) - Creating estimates before work orders
- [Inventory Guide](./inventory-guide.md) - Managing parts and stock
- [Customer Management](./customers.md) - Managing customer records
- [Reporting Guide](./reporting.md) - Advanced reporting features
- [Admin Configuration Guide](../admin-guides/configuration.md) - Module configuration

## Support

For additional help:
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Contact support: support@easysale.com
- Visit documentation: https://docs.easysale.com
- Community forum: https://community.easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

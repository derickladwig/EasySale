# Estimates User Guide

## Overview

The Estimates module allows you to create professional quotes for customers before performing work or selling products. This guide covers creating estimates, managing their lifecycle, converting them to invoices or work orders, and generating PDF quotes.

## Prerequisites

- Estimates module must be enabled in your configuration
- User must have appropriate permissions (create_estimate, edit_estimate, view_estimate)
- Customer records should be created before creating estimates
- Products and services should be configured in the system

## Getting Started

### Accessing Estimates

1. From the main dashboard, click **Estimates** in the navigation menu
2. The estimates list opens showing all estimates
3. Click **+ New Estimate** to create a new quote

### Estimate Lifecycle

**Status Flow:**
1. **Draft**: Estimate is being prepared
2. **Sent**: Estimate sent to customer
3. **Viewed**: Customer opened the estimate
4. **Accepted**: Customer accepted the estimate
5. **Rejected**: Customer declined the estimate
6. **Expired**: Estimate passed expiration date
7. **Converted**: Estimate converted to invoice or work order

## Creating an Estimate

### Step 1: Start New Estimate

1. Click **+ New Estimate** button
2. Estimate creation form opens
3. Estimate number auto-generates (can be customized)

### Step 2: Select Customer

**Existing Customer:**
1. Click **Select Customer** button
2. Search for customer by name, email, or phone
3. Select customer from results
4. Customer information auto-populates

**New Customer:**
1. Click **+ New Customer** button
2. Enter customer details:
   - Name (required)
   - Email (required for sending estimate)
   - Phone
   - Address
3. Click **Save Customer**
4. Customer is selected automatically

### Step 3: Enter Estimate Details

**Basic Information:**
- **Estimate Number**: Auto-generated (format: EST-YYYY-NNNN)
- **Estimate Date**: Defaults to today (can change)
- **Expiration Date**: Set validity period (e.g., 30 days)
- **Reference**: Optional reference number or PO number
- **Sales Rep**: Assign to sales representative

**Terms and Conditions:**
- Select from predefined terms templates
- Or enter custom terms
- Terms appear on PDF estimate
- Include payment terms, warranties, etc.

### Step 4: Add Line Items

**Adding Products:**
1. Click **+ Add Product**
2. Search for product in inventory
3. Select product from results
4. Product details auto-populate:
   - Description
   - Unit price
   - Tax rate (if applicable)
5. Enter quantity
6. Line total calculates automatically

**Adding Services:**
1. Click **+ Add Service**
2. Select service from list or enter custom
3. Enter description
4. Enter quantity (hours, units, etc.)
5. Enter unit price
6. Line total calculates automatically

**Adding Custom Items:**
1. Click **+ Add Custom Item**
2. Enter description
3. Enter quantity and unit price
4. Select if taxable
5. Line total calculates automatically

**Line Item Options:**
- **Discount**: Apply line-item discount (% or fixed amount)
- **Tax**: Override tax rate for specific item
- **Notes**: Add notes visible to customer
- **Optional**: Mark item as optional (customer can choose)

### Step 5: Apply Discounts and Taxes

**Subtotal Discount:**
1. Enter discount in discount field
2. Choose percentage or fixed amount
3. Discount applies to subtotal
4. Discounted amount shown

**Tax Calculation:**
- Taxes calculate automatically based on:
  - Customer location
  - Product tax rates
  - Tax rules configuration
- Multiple tax rates supported
- Tax breakdown shown on estimate

**Manual Tax Override:**
1. Click **Override Tax**
2. Enter custom tax amount
3. Add reason for override
4. Override noted on estimate

### Step 6: Add Notes and Attachments

**Internal Notes:**
- Notes for your team only
- Not visible to customer
- Useful for special instructions

**Customer Notes:**
- Notes visible to customer
- Appear on PDF estimate
- Use for special terms or conditions

**Attachments:**
1. Click **+ Add Attachment**
2. Select file (PDF, image, document)
3. File included with estimate email
4. Useful for specs, drawings, photos

### Step 7: Review and Save

**Review Estimate:**
- Verify customer information
- Check all line items
- Confirm pricing and totals
- Review terms and conditions
- Check expiration date

**Save Options:**
1. **Save as Draft**: Save without sending
2. **Save and Send**: Save and email to customer
3. **Save and Print**: Save and print PDF
4. **Save and Convert**: Save and convert to invoice/work order

## Managing Estimates

### Viewing Estimates

**List View:**
- See all estimates with status, customer, and amount
- Filter by status, date range, or sales rep
- Sort by any column
- Search by estimate number or customer name

**Detail View:**
- Click any estimate to see full details
- View all line items and calculations
- See estimate history and activity
- View related invoices or work orders

### Editing Estimates

**Edit Draft Estimates:**
1. Open estimate detail page
2. Click **Edit** button
3. Modify any field
4. Click **Save Changes**

**Edit Sent Estimates:**
- Sent estimates can be edited
- Creates new version of estimate
- Previous version archived
- Customer notified of changes

**Edit Restrictions:**
- Accepted estimates cannot be edited
- Converted estimates cannot be edited
- Expired estimates can be edited and resent

### Sending Estimates

**Email Estimate:**
1. Open estimate detail page
2. Click **Send Estimate** button
3. Verify customer email address
4. Customize email message:
   - Subject line
   - Body text
   - Add CC/BCC recipients
5. Preview PDF attachment
6. Click **Send**

**Email Template:**
- Professional email template with branding
- Includes estimate summary
- PDF estimate attached
- Link to view online (optional)
- Call-to-action buttons (Accept/Reject)

**Tracking:**
- System tracks when email sent
- Tracks when customer opens email
- Tracks when customer views PDF
- Tracks customer actions (accept/reject)

### Printing Estimates

**Print PDF:**
1. Open estimate detail page
2. Click **Print** button
3. PDF generates with company branding
4. Select printer or save as PDF
5. Print or save to file

**PDF Includes:**
- Company logo and branding
- Company contact information
- Customer information
- Estimate number and dates
- Line items with descriptions
- Subtotal, taxes, and total
- Terms and conditions
- Payment instructions
- Signature line (optional)

### Following Up

**Automatic Reminders:**
- Configure in **Settings** > **Estimates** > **Reminders**
- Send reminder X days after sending
- Send reminder before expiration
- Automatic follow-up emails

**Manual Follow-Up:**
1. Open estimate detail page
2. Click **Send Reminder** button
3. Customize reminder message
4. Click **Send**

**Activity Tracking:**
- View all estimate activity
- See when sent, viewed, and actions taken
- Track email opens and clicks
- Monitor customer engagement

## Customer Actions

### Customer Accepts Estimate

**When Customer Accepts:**
1. Customer clicks **Accept** in email or online
2. Estimate status changes to "Accepted"
3. You receive notification
4. Customer receives confirmation
5. Ready to convert to invoice or work order

**Next Steps:**
- Convert to invoice for immediate payment
- Convert to work order to schedule work
- Contact customer to schedule
- Begin work or prepare order

### Customer Rejects Estimate

**When Customer Rejects:**
1. Customer clicks **Reject** in email or online
2. Customer can provide reason (optional)
3. Estimate status changes to "Rejected"
4. You receive notification with reason
5. Opportunity to revise and resend

**Next Steps:**
- Contact customer to discuss concerns
- Revise estimate based on feedback
- Create new version with changes
- Resend updated estimate

### Customer Requests Changes

**Handling Change Requests:**
1. Customer contacts you with changes
2. Edit existing estimate
3. System creates new version
4. Send updated estimate to customer
5. Previous version archived for reference

## Converting Estimates

### Convert to Invoice

**When to Convert:**
- Customer accepted estimate
- Ready to collect payment
- Work completed or products ready

**Conversion Process:**
1. Open accepted estimate
2. Click **Convert to Invoice** button
3. Review invoice details:
   - All line items transfer
   - Pricing remains same
   - Terms transfer
4. Adjust if needed (add items, change dates)
5. Click **Create Invoice**
6. Invoice created and linked to estimate

**After Conversion:**
- Estimate status changes to "Converted"
- Invoice number displayed on estimate
- Link to invoice from estimate detail
- Estimate archived for reference

### Convert to Work Order

**When to Convert:**
- Customer accepted estimate
- Work needs to be scheduled
- Service-based estimate

**Conversion Process:**
1. Open accepted estimate
2. Click **Convert to Work Order** button
3. Review work order details:
   - All line items transfer
   - Service descriptions transfer
   - Customer information transfers
4. Add work order specific details:
   - Scheduled date
   - Assigned technician
   - Priority level
5. Click **Create Work Order**
6. Work order created and linked to estimate

**After Conversion:**
- Estimate status changes to "Converted"
- Work order number displayed on estimate
- Link to work order from estimate detail
- Can track work order progress from estimate

### Convert to Sales Order

**When to Convert:**
- Customer accepted estimate
- Products need to be ordered or prepared
- Inventory needs to be reserved

**Conversion Process:**
1. Open accepted estimate
2. Click **Convert to Sales Order** button
3. Review sales order details
4. Set fulfillment date
5. Click **Create Sales Order**
6. Products reserved in inventory

## Estimate Versions

### Version Control

**Why Versions:**
- Track changes over time
- Compare different versions
- Maintain audit trail
- Reference previous pricing

**Creating New Version:**
1. Edit sent or accepted estimate
2. System automatically creates new version
3. Version number increments (v1, v2, v3)
4. Previous version archived

**Viewing Versions:**
1. Open estimate detail page
2. Click **Version History** button
3. See list of all versions
4. Click any version to view
5. Compare versions side-by-side

### Version Comparison

**Compare Feature:**
1. Select two versions to compare
2. Click **Compare** button
3. See differences highlighted:
   - Changed line items
   - Price changes
   - Term changes
4. Export comparison report

## Estimate Templates

### Using Templates

**Predefined Templates:**
- Access via **Estimates** > **Templates**
- Templates for common services
- Pre-filled line items
- Standard terms and conditions

**Creating from Template:**
1. Click **+ New Estimate**
2. Click **Use Template**
3. Select template from list
4. Template loads with pre-filled items
5. Customize for specific customer
6. Save estimate

### Creating Templates

**Save as Template:**
1. Create estimate with common items
2. Click **Save as Template**
3. Enter template name
4. Select template category
5. Click **Save**
6. Template available for future use

**Template Management:**
1. Navigate to **Settings** > **Estimate Templates**
2. View all templates
3. Edit, duplicate, or delete templates
4. Organize by category
5. Set default template

## Reporting

### Estimate Reports

**Available Reports:**
- Estimates by Status
- Estimates by Sales Rep
- Acceptance Rate
- Average Estimate Value
- Conversion Rate
- Revenue Forecast (based on pending estimates)
- Win/Loss Analysis

**Generating Reports:**
1. Navigate to **Reports** > **Estimates**
2. Select report type
3. Choose date range
4. Apply filters (status, sales rep, etc.)
5. Click **Generate Report**
6. Export to CSV or PDF

### Key Metrics

**Dashboard Metrics:**
- Total estimates this month
- Acceptance rate
- Average estimate value
- Pending estimate value
- Conversion rate
- Revenue forecast

**Performance Tracking:**
- Sales rep performance
- Product/service popularity
- Pricing effectiveness
- Time to acceptance
- Follow-up effectiveness

## Configuration

### Module Settings

Access via **Settings** > **Modules** > **Estimates**

**General Settings:**
- Enable/disable estimates module
- Set estimate number format
- Set default expiration period (days)
- Set default terms and conditions
- Enable online acceptance

**Email Settings:**
- Customize email templates
- Set sender name and email
- Configure automatic reminders
- Set reminder timing
- Enable read receipts

**PDF Settings:**
- Choose PDF template
- Include/exclude company logo
- Show/hide pricing details
- Include signature line
- Set page size and margins

**Conversion Settings:**
- Allow conversion to invoice
- Allow conversion to work order
- Allow conversion to sales order
- Require approval for conversion
- Auto-archive after conversion

### Permissions

Configure user permissions via **Settings** > **Users & Permissions**

**Estimate Permissions:**
- `view_estimates`: View estimate list and details
- `create_estimate`: Create new estimates
- `edit_estimate`: Edit existing estimates
- `send_estimate`: Send estimates to customers
- `delete_estimate`: Delete estimates
- `convert_estimate`: Convert estimates to invoices/work orders
- `approve_estimate`: Approve estimates (if approval required)
- `manage_templates`: Create and manage estimate templates

## Troubleshooting

### Estimate Not Sending

**Problem**: Email not sending to customer

**Solutions:**
1. Verify customer has valid email address
2. Check email service is configured
3. Check spam/junk folder
4. Verify email template is configured
5. Check email sending logs for errors
6. Try resending estimate

### PDF Not Generating

**Problem**: PDF fails to generate or shows errors

**Solutions:**
1. Verify PDF service is running
2. Check company logo file exists
3. Verify all line items have valid data
4. Check for special characters in descriptions
5. Try regenerating PDF
6. Contact support if issue persists

### Cannot Convert Estimate

**Problem**: Convert button is disabled or conversion fails

**Solutions:**
1. Verify estimate status is "Accepted"
2. Check you have `convert_estimate` permission
3. Ensure all required fields are complete
4. Check for inventory availability (if converting to sales order)
5. Verify customer information is complete

### Pricing Incorrect

**Problem**: Totals don't match expected amounts

**Solutions:**
1. Verify all line item prices
2. Check discount calculations
3. Review tax rate configuration
4. Check for rounding differences
5. Recalculate totals: Click **Recalculate**
6. Compare with previous version if edited

### Customer Cannot Accept Online

**Problem**: Customer reports accept button not working

**Solutions:**
1. Verify online acceptance is enabled
2. Check estimate hasn't expired
3. Verify estimate link is correct
4. Try resending estimate
5. Provide alternative acceptance method (email, phone)

## Best Practices

### Creating Estimates

1. **Use clear descriptions** for all line items
2. **Include detailed terms** to avoid misunderstandings
3. **Set realistic expiration dates** (typically 30 days)
4. **Add photos or attachments** for complex projects
5. **Review carefully** before sending

### Pricing Strategy

1. **Be competitive** but profitable
2. **Include all costs** (materials, labor, overhead)
3. **Offer options** (good, better, best)
4. **Mark optional items** clearly
5. **Explain value** in descriptions

### Communication

1. **Send promptly** after customer inquiry
2. **Follow up** within 2-3 days
3. **Be available** for questions
4. **Respond quickly** to change requests
5. **Thank customers** for their consideration

### Conversion

1. **Follow up** on accepted estimates quickly
2. **Schedule work** or prepare order promptly
3. **Keep customer informed** of progress
4. **Deliver on promises** made in estimate
5. **Request feedback** after completion

## Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+N`: Create new estimate
- `Ctrl+S`: Save estimate
- `Ctrl+P`: Print estimate
- `Ctrl+E`: Send estimate via email
- `Ctrl+D`: Duplicate estimate

### Quick Actions

- **Duplicate Estimate**: Click ⋮ menu > Duplicate (useful for similar quotes)
- **Quick Send**: Click envelope icon on estimate list
- **Quick Convert**: Click convert icon on accepted estimates
- **Bulk Actions**: Select multiple estimates > Bulk Actions

### Mobile Access

- Create estimates from mobile device
- Send estimates on-the-go
- Check estimate status
- Receive notifications for customer actions
- Convert estimates to invoices

### Automation

- Set up automatic follow-up emails
- Configure expiration reminders
- Enable automatic conversion on acceptance
- Set up approval workflows
- Configure pricing rules

## Related Documentation

- [Work Orders User Guide](./work-orders-invoicing.md) - Converting estimates to work orders
- [Invoicing Guide](./invoicing.md) - Converting estimates to invoices
- [Customer Management](./customers.md) - Managing customer records
- [Product Management](./products.md) - Managing products and services
- [Admin Configuration Guide](../admin-guides/configuration.md) - Estimate configuration

## Support

For additional help:
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Contact support: support@easysale.com
- Visit documentation: https://docs.easysale.com
- Community forum: https://community.easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

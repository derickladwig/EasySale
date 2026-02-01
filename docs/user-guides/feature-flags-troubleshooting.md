# Feature Flags & Modules Troubleshooting Guide

## Overview

This guide provides solutions to common issues with EasySale's feature flags and module system, including work orders, appointments, time tracking, and estimates.

## Quick Diagnostics

### Check Module Status

1. Navigate to **Settings** > **Modules**
2. Verify the module is enabled (toggle should be ON)
3. Check for any error messages or warnings
4. Verify your user has required permissions

### Check System Logs

```bash
# View application logs
tail -f logs/easysale.log

# Filter for errors
grep ERROR logs/easysale.log

# Filter for specific module
grep "work_order" logs/easysale.log
```

### Check Browser Console

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for JavaScript errors (red text)
4. Check Network tab for failed API requests

## Work Orders Issues

### Issue: Work Order Module Not Visible

**Symptoms**:
- Work Orders menu item not showing
- Cannot access work orders page
- 404 error when navigating to work orders

**Solutions**:

1. **Check Module Enabled**:
   - Go to **Settings** > **Modules** > **Work Orders**
   - Verify "Enable Work Orders" is toggled ON
   - Click **Save Changes** if you made changes

2. **Check Permissions**:
   - Go to **Settings** > **Users & Permissions**
   - Select your user role
   - Verify `view_work_orders` permission is enabled
   - Save and log out/in to refresh permissions

3. **Check Configuration File**:
   ```json
   // configs/private/your-business.json
   {
     "modules": {
       "workOrders": {
         "enabled": true
       }
     }
   }
   ```

4. **Clear Cache**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Clear localStorage: Open Console, run `localStorage.clear()`
   - Reload page (Ctrl+F5)

5. **Restart Application**:
   ```bash
   # Stop application
   # Restart application
   # Wait for "Server running" message
   ```

---

### Issue: Invoice Not Generated on Work Order Completion

**Symptoms**:
- Completed work order but no invoice created
- `invoiced_at` field is null
- No invoice link on work order detail page

**Solutions**:

1. **Check Auto-Invoice Setting**:
   - Go to **Settings** > **Modules** > **Work Orders**
   - Verify "Auto-generate invoice on completion" is enabled
   - Save changes

2. **Check Work Order Status**:
   - Open work order detail page
   - Verify status is "Completed" (not "In Progress")
   - If not completed, click **Complete Work Order**

3. **Check for Errors**:
   - Look for error notification after completing work order
   - Check application logs for invoice generation errors
   - Common errors:
     - Missing customer information
     - Invalid line items
     - Tax calculation errors

4. **Manual Invoice Creation**:
   - Open completed work order
   - Click **Create Invoice** button
   - Review invoice details
   - Click **Generate Invoice**

5. **Check Database**:
   ```sql
   -- Check if invoice exists
   SELECT * FROM invoices WHERE work_order_id = 123;
   
   -- Check work order status
   SELECT id, status, invoiced_at FROM work_orders WHERE id = 123;
   ```

6. **Verify Permissions**:
   - Ensure user has `create_invoice` permission
   - Check role permissions in settings

---

### Issue: Inventory Not Reduced After Work Order Completion

**Symptoms**:
- Work order completed and invoiced
- Parts still show full quantity in inventory
- No inventory transaction recorded

**Solutions**:

1. **Check Inventory Tracking**:
   - Verify inventory tracking is enabled
   - Go to **Settings** > **Inventory**
   - Ensure "Track inventory quantities" is ON

2. **Check Part Configuration**:
   - Open product/part details
   - Verify "Track inventory" is enabled for the part
   - Check if part has valid SKU

3. **Check Transaction Log**:
   - Go to **Inventory** > **Transactions**
   - Filter by work order number
   - Look for "Work Order Completion" transactions
   - If missing, inventory reduction failed

4. **Manual Inventory Adjustment**:
   - Go to **Inventory** > **Adjustments**
   - Click **+ New Adjustment**
   - Select parts from work order
   - Enter quantities to deduct
   - Reference work order number in notes
   - Save adjustment

5. **Check Logs for Errors**:
   ```bash
   grep "inventory reduction" logs/easysale.log
   grep "work_order.*complete" logs/easysale.log
   ```

6. **Verify Database State**:
   ```sql
   -- Check inventory transactions
   SELECT * FROM inventory_transactions 
   WHERE reference_type = 'work_order' 
   AND reference_id = 123;
   
   -- Check current inventory
   SELECT id, sku, quantity_on_hand 
   FROM products 
   WHERE id IN (SELECT product_id FROM work_order_line_items WHERE work_order_id = 123);
   ```

---

## Appointments Issues

### Issue: Appointment Calendar Not Loading

**Symptoms**:
- Blank calendar page
- Loading spinner never stops
- "Failed to load appointments" error

**Solutions**:

1. **Check Module Enabled**:
   - Go to **Settings** > **Modules** > **Appointments**
   - Verify module is enabled
   - Check for configuration errors

2. **Check API Connection**:
   - Open browser developer tools (F12)
   - Go to Network tab
   - Reload page
   - Look for failed `/api/appointments` request
   - Check response status and error message

3. **Check Date Range**:
   - Calendar may be loading appointments outside visible range
   - Try navigating to current month
   - Click "Today" button to reset view

4. **Check Permissions**:
   - Verify `view_appointments` permission
   - Check if user can only see own appointments
   - Try viewing as administrator

5. **Clear Cache and Reload**:
   ```javascript
   // Open browser console
   localStorage.removeItem('appointments_cache');
   location.reload();
   ```

6. **Check Backend Logs**:
   ```bash
   grep "appointments" logs/easysale.log | tail -20
   ```

---

### Issue: Cannot Create Appointment

**Symptoms**:
- Create button disabled
- Form validation errors
- "Failed to create appointment" error

**Solutions**:

1. **Check Required Fields**:
   - Customer name/ID (required)
   - Date and time (required)
   - Service type (may be required based on config)
   - Duration (required)

2. **Check Time Slot Availability**:
   - Selected time slot may already be booked
   - Check for conflicting appointments
   - Try different time slot

3. **Check Staff Availability**:
   - Selected staff member may not be available
   - Check staff schedule settings
   - Try assigning to different staff member

4. **Check Booking Rules**:
   - May violate advance booking limit
   - May violate minimum booking notice
   - Check configuration: **Settings** > **Appointments** > **Booking Rules**

5. **Check Permissions**:
   - Verify `create_appointment` permission
   - Check role permissions

6. **Check for JavaScript Errors**:
   - Open browser console (F12)
   - Look for errors when clicking Create
   - Report errors to support

---

### Issue: Appointment Reminders Not Sending

**Symptoms**:
- Customers not receiving reminder emails
- No reminder sent notification
- Reminders configured but not working

**Solutions**:

1. **Check Reminder Settings**:
   - Go to **Settings** > **Appointments** > **Reminders**
   - Verify "Send automatic reminders" is enabled
   - Check reminder timing (e.g., 24 hours before)
   - Verify email templates are configured

2. **Check Email Service**:
   - Go to **Settings** > **Email**
   - Click **Test Email Configuration**
   - Verify test email is received
   - Check email service credentials

3. **Check Customer Email**:
   - Open customer record
   - Verify email address is valid
   - Check for typos in email address
   - Update if necessary

4. **Check Notification Logs**:
   ```bash
   grep "appointment_reminder" logs/easysale.log
   grep "email.*sent" logs/easysale.log
   ```

5. **Check Spam Folder**:
   - Ask customer to check spam/junk folder
   - Add sender to safe senders list
   - Consider using different email service

6. **Manual Reminder**:
   - Open appointment detail
   - Click **Send Reminder** button
   - Verify manual reminder is received

---

## Time Tracking Issues

### Issue: Cannot Clock In

**Symptoms**:
- Clock In button disabled
- "Already clocked in" error when not clocked in
- Clock in fails silently

**Solutions**:

1. **Check Current Status**:
   - Go to **Time Tracking** dashboard
   - Check if already clocked in
   - If stuck in "clocked in" state, clock out first

2. **Check Permissions**:
   - Verify `clock_in` permission
   - Check role permissions in settings

3. **Check Geolocation (if enabled)**:
   - Browser may be blocking location access
   - Click location icon in address bar
   - Allow location access
   - Reload page and try again

4. **Check Time Tracking Module**:
   - Go to **Settings** > **Modules** > **Time Tracking**
   - Verify module is enabled
   - Check for configuration errors

5. **Check for Existing Entry**:
   ```sql
   -- Check for open time entries
   SELECT * FROM time_entries 
   WHERE employee_id = YOUR_ID 
   AND clock_out_time IS NULL;
   ```

6. **Force Clock Out (if stuck)**:
   - Contact administrator
   - Admin can manually clock out user
   - Or update database directly:
   ```sql
   UPDATE time_entries 
   SET clock_out_time = datetime('now')
   WHERE employee_id = YOUR_ID 
   AND clock_out_time IS NULL;
   ```

---

### Issue: Time Entry Not Showing

**Symptoms**:
- Clocked in/out but entry not visible
- Time entry created but missing from list
- Hours not showing in reports

**Solutions**:

1. **Check Date Filter**:
   - Time entry may be outside selected date range
   - Expand date range to include entry date
   - Try "All Time" filter

2. **Check Employee Filter**:
   - May be filtered to different employee
   - Clear employee filter
   - Select "All Employees" (if you have permission)

3. **Check Approval Status Filter**:
   - Entry may be pending approval
   - Change filter to "All Statuses"
   - Or select "Pending" to see unapproved entries

4. **Refresh Data**:
   - Click refresh button
   - Or reload page (F5)
   - Clear cache if necessary

5. **Check Database**:
   ```sql
   SELECT * FROM time_entries 
   WHERE employee_id = YOUR_ID 
   ORDER BY clock_in_time DESC 
   LIMIT 10;
   ```

6. **Check Permissions**:
   - Verify `view_own_time` or `view_team_time` permission
   - May only be able to see approved entries

---

### Issue: Overtime Not Calculating

**Symptoms**:
- Worked over 40 hours but no overtime shown
- Overtime hours showing as 0
- Overtime pay not calculated

**Solutions**:

1. **Check Overtime Settings**:
   - Go to **Settings** > **Time Tracking** > **Overtime**
   - Verify "Enable overtime tracking" is ON
   - Check overtime threshold (e.g., 40 hours/week)
   - Verify overtime multiplier (e.g., 1.5x)

2. **Check Calculation Period**:
   - Overtime may be calculated weekly, not daily
   - Check which week the hours fall in
   - Verify week start day setting

3. **Check Time Entry Approval**:
   - Overtime may only calculate for approved entries
   - Ensure all entries are approved
   - Submit pending entries for approval

4. **Check Employee Eligibility**:
   - Employee may be marked as exempt
   - Go to **Settings** > **Employees** > [Employee]
   - Check "Overtime eligible" setting

5. **Manual Calculation**:
   - Calculate expected overtime manually
   - Compare with system calculation
   - Report discrepancy to administrator

6. **Check Logs**:
   ```bash
   grep "overtime" logs/easysale.log
   ```

---

## Estimates Issues

### Issue: Estimate PDF Not Generating

**Symptoms**:
- "Failed to generate PDF" error
- PDF download button not working
- Blank PDF or corrupted file

**Solutions**:

1. **Check PDF Service**:
   - Verify PDF generation service is running
   - Check backend logs for PDF errors
   - Restart application if necessary

2. **Check Company Logo**:
   - PDF generation may fail if logo file missing
   - Go to **Settings** > **Branding**
   - Verify logo file exists and is accessible
   - Try uploading logo again

3. **Check Line Items**:
   - PDF may fail with invalid line item data
   - Review all line items for:
     - Missing descriptions
     - Invalid quantities or prices
     - Special characters that break PDF

4. **Check Browser**:
   - Try different browser
   - Disable browser extensions
   - Clear browser cache

5. **Try Manual Generation**:
   - Open estimate detail
   - Click **Regenerate PDF**
   - Wait for generation to complete

6. **Check Logs**:
   ```bash
   grep "pdf.*generation" logs/easysale.log
   grep "estimate.*pdf" logs/easysale.log
   ```

---

### Issue: Cannot Convert Estimate to Invoice

**Symptoms**:
- Convert button disabled
- "Cannot convert estimate" error
- Conversion fails silently

**Solutions**:

1. **Check Estimate Status**:
   - Estimate must be "Accepted" to convert
   - If status is "Draft" or "Sent", cannot convert
   - Customer must accept estimate first

2. **Check Conversion Settings**:
   - Go to **Settings** > **Estimates**
   - Verify "Allow conversion to invoice" is enabled
   - Check for other conversion restrictions

3. **Check Permissions**:
   - Verify `convert_estimate` permission
   - Check role permissions

4. **Check Estimate Expiration**:
   - Estimate may be expired
   - Check expiration date
   - Update expiration date if needed
   - Or allow conversion of expired estimates in settings

5. **Check for Existing Invoice**:
   - Estimate may already be converted
   - Check if invoice_id is set
   - Look for linked invoice on estimate detail page

6. **Manual Conversion**:
   - Create invoice manually
   - Copy line items from estimate
   - Reference estimate number in invoice notes

---

## Theme and Branding Issues

### Issue: Theme Changes Not Applying

**Symptoms**:
- Changed theme but colors not updating
- Theme reverts after page reload
- Some components not using new theme

**Solutions**:

1. **Check Theme Locks**:
   - Administrator may have locked theme settings
   - Go to **Settings** > **Branding** > **Theme**
   - Check for lock icons next to settings
   - Contact administrator to unlock

2. **Clear Theme Cache**:
   ```javascript
   // Open browser console
   localStorage.removeItem('EasySale_theme_cache_v2');
   location.reload();
   ```

3. **Check Component Compliance**:
   - Some components may use hardcoded colors (bug)
   - Report components that don't update with theme
   - Check browser console for theme errors

4. **Check ThemeEngine**:
   - Open browser console
   - Run: `document.documentElement.getAttribute('data-theme')`
   - Should return 'light' or 'dark'
   - If null, theme not applied

5. **Force Theme Reapplication**:
   - Go to **Settings** > **Branding**
   - Change theme to different value
   - Save
   - Change back to desired theme
   - Save again

6. **Check for JavaScript Errors**:
   - Open browser console (F12)
   - Look for theme-related errors
   - Report errors to support

---

## Configuration Issues

### Issue: Configuration Changes Not Taking Effect

**Symptoms**:
- Changed configuration but no effect
- Settings revert after restart
- Configuration errors in logs

**Solutions**:

1. **Check Configuration File Syntax**:
   - Verify JSON is valid
   - Use JSON validator: https://jsonlint.com
   - Check for:
     - Missing commas
     - Unclosed brackets
     - Invalid values

2. **Check File Location**:
   - Configuration must be in `configs/private/`
   - File name must match tenant ID
   - Example: `configs/private/your-business.json`

3. **Check File Permissions**:
   ```bash
   # Verify file is readable
   ls -la configs/private/your-business.json
   
   # Should show read permissions for application user
   ```

4. **Restart Application**:
   - Configuration loaded on startup
   - Changes require restart (unless hot-reload enabled)
   - Stop and start application

5. **Check Hot-Reload**:
   - If hot-reload enabled, check logs for reload events
   - May need to trigger reload manually
   - Or restart application

6. **Validate Configuration**:
   ```bash
   # Run configuration validator (if available)
   npm run validate-config configs/private/your-business.json
   ```

---

## Performance Issues

### Issue: Slow Module Loading

**Symptoms**:
- Modules take long time to load
- Page freezes when opening module
- Timeout errors

**Solutions**:

1. **Check Database Size**:
   - Large databases slow queries
   - Run database optimization:
   ```sql
   VACUUM;
   ANALYZE;
   ```

2. **Check Indexes**:
   - Missing indexes slow queries
   - Verify indexes exist on:
     - `work_orders.tenant_id`
     - `appointments.tenant_id`
     - `time_entries.employee_id`
     - `estimates.customer_id`

3. **Reduce Data Range**:
   - Loading too much data at once
   - Use date filters to limit results
   - Increase pagination limit

4. **Clear Old Data**:
   - Archive old records
   - Delete cancelled/expired records
   - Run cleanup scripts

5. **Check System Resources**:
   ```bash
   # Check CPU and memory usage
   top
   
   # Check disk space
   df -h
   ```

6. **Optimize Configuration**:
   - Reduce sync frequency if too aggressive
   - Disable unused modules
   - Adjust cache settings

---

## Getting Help

### Before Contacting Support

1. **Gather Information**:
   - What were you trying to do?
   - What happened instead?
   - Error messages (exact text)
   - Steps to reproduce
   - Screenshots if applicable

2. **Check Logs**:
   ```bash
   # Get last 50 lines of logs
   tail -50 logs/easysale.log > logs-for-support.txt
   ```

3. **Check System Info**:
   - EasySale version
   - Operating system
   - Browser and version
   - Database size

4. **Try Basic Troubleshooting**:
   - Restart application
   - Clear cache
   - Try different browser
   - Check permissions

### Contact Support

- **Email**: support@easysale.com
- **Phone**: 1-800-EASYSALE
- **Community Forum**: https://community.easysale.com
- **Documentation**: https://docs.easysale.com
- **GitHub Issues**: https://github.com/easysale/easysale/issues

### Include in Support Request

1. Error messages (copy/paste exact text)
2. Log files (last 50-100 lines)
3. Screenshots showing the issue
4. Steps to reproduce
5. System information
6. Configuration file (remove sensitive data)

---

## Related Documentation

- [Work Orders User Guide](./work-orders-invoicing.md)
- [Appointments User Guide](./appointments.md)
- [Time Tracking User Guide](./time-tracking.md)
- [Estimates User Guide](./estimates.md)
- [Admin Configuration Guide](../admin-guides/configuration.md)
- [Developer Theming Guide](../developer-guides/theming.md)

---

*Last updated: 2026-01-30*
*Version: 1.0*

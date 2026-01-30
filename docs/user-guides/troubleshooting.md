# Troubleshooting Guide

Common issues and solutions for EasySale POS.

## Quick Fixes

Before diving into specific issues, try these first:

1. **Refresh the screen** - Press F5 or click Refresh
2. **Log out and log back in** - Clears session issues
3. **Restart the application** - Fixes most temporary issues
4. **Restart the computer** - Clears system-level issues
5. **Check network connection** - Many features need connectivity

---

## Login Issues

### Can't Log In

**Symptoms**: Error message on login, can't access system

**Solutions**:

1. **Verify username and password**
   - Check caps lock isn't on
   - Type password slowly and carefully
   - Username is case-sensitive

2. **Account may be locked**
   - Too many failed attempts trigger lockout
   - Wait 15 minutes and try again
   - Contact manager to unlock immediately

3. **Account may be deactivated**
   - Ask manager to check your account status

4. **Password may have expired**
   - Contact manager for password reset

### Logged Out Unexpectedly

**Symptoms**: Session ended, returned to login screen

**Solutions**:

1. **Session timeout** - Normal after inactivity
   - Log back in to continue

2. **Someone logged in elsewhere** (if single-session enabled)
   - Your session ended because same account logged in elsewhere

3. **System restart** - Application or server restarted
   - Log back in; work in progress may be saved as suspended sale

---

## Transaction Issues

### Can't Complete Sale

**Symptoms**: Payment won't process, error on checkout

**Solutions**:

1. **Check cart has items**
   - Can't complete empty sale

2. **Payment amount must match total**
   - Enter correct payment amount
   - Use "Exact" button for cash

3. **Network issue (for card payments)**
   - Check offline indicator
   - Try cash payment if urgent
   - Process card when online

4. **Item out of stock**
   - Check stock levels
   - Remove or adjust quantities

### Transaction Disappeared

**Symptoms**: Completed transaction not showing

**Solutions**:

1. **Check recent transactions**
   - Reports → Recent Transactions
   - May be listed under different time

2. **Check suspended sales**
   - May have been suspended instead of completed
   - Click Resume to find it

3. **Check other user's transactions**
   - May have been processed under different login

### Wrong Price on Item

**Symptoms**: Item shows incorrect price

**Solutions**:

1. **Verify correct item scanned**
   - Check product name matches actual item
   - Similar items may have different prices

2. **Price may have changed**
   - Check for sale/promotion signage
   - Confirm with manager

3. **Customer pricing tier**
   - Customer may have wholesale pricing
   - Check customer attached to sale

**To fix**: 
- Remove item and re-add
- Or use price override (needs permission)

### Can't Void Transaction

**Symptoms**: Void button disabled or error message

**Solutions**:

1. **May need manager approval**
   - Manager enters credentials to authorize

2. **Transaction already voided**
   - Cannot void same transaction twice

3. **Return exists**
   - Cannot void transaction with existing returns
   - Void the return first (if needed)

4. **Transaction too old**
   - Same-day voids only (policy varies)
   - May need manager or admin intervention

---

## Hardware Issues

### Barcode Scanner Not Working

**Symptoms**: Scanner doesn't beep, items don't appear

**Solutions**:

1. **Check USB connection**
   - Unplug and replug scanner
   - Try different USB port

2. **Scanner may be off**
   - Check power light on scanner
   - Some scanners have on/off buttons

3. **Wrong mode**
   - Scanner may be in wrong mode
   - Check for mode button/switch

4. **Barcode damaged**
   - Try scanning different barcode
   - Type barcode number manually

5. **Software issue**
   - Restart application
   - Restart computer if persists

### Receipt Printer Not Printing

**Symptoms**: No receipt printed, printer error

**Solutions**:

1. **Check paper**
   - Open cover and check paper roll
   - Paper may be loaded wrong (shiny side down)
   - Install new roll if empty

2. **Check power**
   - Printer should have power light on
   - Check power cable connection

3. **Check USB/network cable**
   - Unplug and replug connection
   - Try different cable if available

4. **Paper jam**
   - Open cover
   - Clear any jammed paper
   - Close cover securely

5. **Test print**
   - Admin → Settings → Hardware → Test Print
   - If test fails, printer may need service

**Temporary workaround**: Offer emailed receipt if available

### Cash Drawer Won't Open

**Symptoms**: Drawer doesn't open after sale

**Solutions**:

1. **Connected via printer**
   - Cash drawer connects to receipt printer
   - Fix printer issues first

2. **Cable disconnected**
   - Check RJ11 cable from drawer to printer

3. **Manual release**
   - Key slot underneath drawer (emergency use)
   - Use key to manually open

4. **Drawer may be full**
   - Bills may be blocking mechanism
   - Perform cash drop

### Card Reader Not Working

**Symptoms**: Card payments fail, reader doesn't respond

**Solutions**:

1. **Check connection**
   - USB or network cable secure
   - Try unplugging and replugging

2. **Reader may need restart**
   - Turn off and on
   - Wait for startup to complete

3. **Check network (for network readers)**
   - Reader needs network connectivity
   - Check cables and network status

4. **Card may be issue**
   - Try different card
   - Try different insertion method (chip vs swipe vs tap)

5. **Reader may need update**
   - Contact IT for terminal updates

---

## Product Issues

### Product Not Found

**Symptoms**: Search returns no results

**Solutions**:

1. **Try different search terms**
   - Use brand name
   - Use partial name
   - Try SKU or barcode number

2. **Check spelling**
   - Typos prevent matches

3. **Browse by category**
   - Use category filters
   - May help identify correct name

4. **Product may not be in system**
   - New products need to be added
   - Contact manager to add product

### Wrong Product Found

**Symptoms**: Scanning brings up wrong item

**Solutions**:

1. **Barcode may be duplicated**
   - Different items with same barcode
   - Report to manager for correction

2. **Wrong barcode on item**
   - Sticker may be wrong
   - Use manual search instead

### Price Doesn't Match Shelf

**Symptoms**: Scanned price differs from tag

**Solutions**:

1. **Old price tag**
   - Price may have changed
   - Confirm correct price with manager

2. **Wrong item scanned**
   - Verify item matches what customer is buying

3. **Promotional pricing**
   - Discount may require code
   - Sale may have ended

**Store policy**: Follow your store's price match policy

---

## Network & Sync Issues

### Offline Indicator Showing

**Symptoms**: "OFFLINE" appears in top bar

**Solutions**:

1. **Check network cables**
   - Cable may be disconnected
   - Try different port

2. **Wi-Fi issues**
   - Check Wi-Fi connection
   - Reconnect to network

3. **Network down**
   - Check if other devices have internet
   - Contact IT if network-wide issue

4. **It's OK to work offline**
   - All sales features work offline
   - Data syncs when connection returns

### Sync Errors

**Symptoms**: Sync failed message, data not updating

**Solutions**:

1. **Check network connection**
   - Must be online to sync

2. **Wait and retry**
   - Temporary issues resolve automatically
   - Check sync status in Admin

3. **Check sync queue**
   - Admin → Sync Status
   - Large queue may take time

4. **Force manual sync**
   - Admin → Sync → Force Sync Now

### Data Not Appearing

**Symptoms**: Can't see recent transactions, products, etc.

**Solutions**:

1. **Refresh the screen**
   - Press F5 or click Refresh

2. **May be filtering**
   - Check date filters
   - Clear all filters

3. **May be on different device**
   - Data syncs periodically
   - Recent changes may not be synced yet

4. **Check correct store/location**
   - Multi-store data may be filtered

---

## Performance Issues

### System Running Slow

**Symptoms**: Delays, freezing, slow responses

**Solutions**:

1. **Close unused applications**
   - Other programs use memory
   - Close browsers, email, etc.

2. **Refresh the application**
   - Press F5 or restart app

3. **Clear browser cache** (if web-based)
   - Accumulated data slows things down

4. **Restart computer**
   - Clears temporary issues

5. **Report to IT**
   - If persistent, may need investigation

### Screen Frozen

**Symptoms**: Application not responding

**Solutions**:

1. **Wait briefly**
   - May be processing large operation

2. **Try clicking different area**
   - Popup or dialog may be hidden

3. **Force close application**
   - Windows: Alt+F4 or Task Manager
   - Restart application

4. **Restart computer**
   - If application won't close

**Note**: Unsaved work in cart may be lost

### Search Taking Too Long

**Symptoms**: Product/customer search very slow

**Solutions**:

1. **Use more specific search terms**
   - "red cap medium" vs just "cap"

2. **Use barcode when possible**
   - Faster than text search

3. **Use filters**
   - Category filter narrows results

4. **Report if persistent**
   - Database may need optimization

---

## Display Issues

### Screen Looks Wrong

**Symptoms**: Layout broken, text overlapping, blank areas

**Solutions**:

1. **Refresh the page**
   - Press F5

2. **Clear browser cache** (web version)
   - Ctrl+Shift+Delete → Clear cached images

3. **Check zoom level**
   - Ctrl+0 resets to 100%
   - Ctrl++ and Ctrl+- to adjust

4. **Try different browser/restart app**

### Can't See Full Screen

**Symptoms**: Scrollbars, cut-off content

**Solutions**:

1. **Maximize window**
   - Click maximize button
   - Or double-click title bar

2. **Check screen resolution**
   - Minimum recommended: 1366x768

3. **Exit full-screen mode if stuck**
   - Press F11 to toggle

---

## Report Issues

### Report Won't Generate

**Symptoms**: Error when running report, blank report

**Solutions**:

1. **Check date range**
   - End date must be after start date
   - Range may have no data

2. **Try smaller date range**
   - Very large ranges may timeout

3. **Check permissions**
   - Some reports require manager role

4. **Try different filters**
   - Current filters may exclude all data

### Report Data Seems Wrong

**Symptoms**: Numbers don't match expectations

**Solutions**:

1. **Check filters applied**
   - Date range, location, category
   - Clear filters to see all data

2. **Check report type**
   - Different reports measure different things
   - Read report description

3. **Verify time zone**
   - Reports use store time zone

4. **Sync may be pending**
   - Recent data may not be included yet

---

## Getting More Help

### When to Contact Support

Contact IT or support when:
- Issues persist after troubleshooting
- Error messages you don't understand
- Hardware appears damaged
- Security concerns

### Information to Provide

When reporting issues, include:
- **What were you doing** when issue occurred
- **Exact error message** (screenshot if possible)
- **Steps to reproduce** the problem
- **What you've already tried**
- **Urgency level** (blocking work? workaround available?)

### Emergency Procedures

If system is completely down:

1. **Manual sales process**
   - Use paper receipts
   - Record all transactions
   - Enter into system when restored

2. **Contact manager**
   - For guidance on manual procedures

3. **Contact IT**
   - Report system down status
   - Get estimated restoration time

---

## Error Code Reference

| Code | Meaning | Solution |
|------|---------|----------|
| E001 | Authentication failed | Check username/password |
| E002 | Session expired | Log in again |
| E003 | Permission denied | Contact manager |
| E004 | Product not found | Try different search |
| E005 | Insufficient stock | Check stock levels |
| E006 | Payment failed | Retry or use different method |
| E007 | Printer error | Check printer status |
| E008 | Database error | Restart application |
| E009 | Network error | Check connection |
| E010 | Sync failed | Check network, retry later |

---

## Quick Troubleshooting Checklist

When something's not working:

- [ ] Refresh the screen (F5)
- [ ] Check error message carefully
- [ ] Check cables and connections
- [ ] Check network/offline status
- [ ] Try logging out and back in
- [ ] Restart the application
- [ ] Restart the computer
- [ ] Check with coworkers (same issue?)
- [ ] Contact IT support with details

Most issues resolve with one of these steps!

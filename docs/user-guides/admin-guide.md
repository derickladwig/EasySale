# System Administration Guide

A comprehensive guide for administrators managing EasySale POS.

## Getting Started

### Accessing Admin Functions

1. **Log in** with an admin account
2. Click **"Admin"** in the left navigation
3. Access system settings, users, and configuration

**Required Role**: Admin

### Admin Dashboard Overview

```
┌────────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ System Status                                                  │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│ │ ● Online   │ │ Database   │ │ Last Sync  │ │ Backup     │   │
│ │   Healthy  │ │   OK       │ │   5m ago   │ │   Today    │   │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                │
│ Quick Actions                                                  │
│ [Users] [Settings] [Integrations] [Backup] [Logs]             │
│                                                                │
│ Recent Activity                                                │
│ • User 'jsmith' logged in (2 min ago)                         │
│ • Backup completed successfully (3 hours ago)                  │
│ • Settings updated by 'admin' (yesterday)                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## User Management

### Viewing Users

1. Click **"Admin"** → **"Users"**
2. View list of all users:
   - Username
   - Full name
   - Role
   - Status (active/inactive)
   - Last login

### Creating a New User

1. Click **"Add User"**
2. Enter user information:
   | Field | Required | Description |
   |-------|----------|-------------|
   | Username | Yes | Login name (unique) |
   | Password | Yes | Initial password |
   | Full Name | Yes | Display name |
   | Email | No | For notifications |
   | Role | Yes | Determines permissions |
   | Station | No | Default workstation |
3. Click **"Create User"**
4. Share credentials with user securely

### User Roles

| Role | Description | Typical Use |
|------|-------------|-------------|
| **Admin** | Full system access | Owners, IT staff |
| **Manager** | Sales, inventory, reports, limited settings | Store managers |
| **Cashier** | Sales only | Front-line staff |
| **Parts Specialist** | Sales + lookup features | Parts counter |
| **Paint Tech** | Sales + paint features | Paint department |
| **Inventory Clerk** | Warehouse functions | Stock handlers |
| **Service Tech** | Service orders + inventory | Service department |

### Role Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│ Permission Matrix                                               │
├──────────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ Permission           │Admin│Mgr  │Cash │Parts│Paint│Inv  │Svc  │
├──────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ Access Sell          │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │     │ ✓   │
│ Apply Discount       │ ✓   │ ✓   │ ✓*  │ ✓*  │ ✓*  │     │     │
│ Override Price       │ ✓   │ ✓   │     │     │     │     │     │
│ Process Return       │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │     │ ✓   │
│ Void Transaction     │ ✓   │ ✓   │     │     │     │     │     │
│ Access Warehouse     │ ✓   │ ✓   │     │     │     │ ✓   │ ✓   │
│ Receive Stock        │ ✓   │ ✓   │     │     │     │ ✓   │     │
│ Adjust Inventory     │ ✓   │ ✓   │     │     │     │ ✓   │     │
│ Access Customers     │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │     │ ✓   │
│ Manage Customers     │ ✓   │ ✓   │     │     │     │     │     │
│ Access Reports       │ ✓   │ ✓   │     │     │     │     │     │
│ Access Admin         │ ✓   │     │     │     │     │     │     │
│ Manage Users         │ ✓   │     │     │     │     │     │     │
│ Manage Settings      │ ✓   │ ✓*  │     │     │     │     │     │
│ View Audit Logs      │ ✓   │ ✓   │     │     │     │     │     │
└──────────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
* = with limits
```

### Editing a User

1. Click on user row in list
2. Click **"Edit"**
3. Modify fields as needed
4. Click **"Save Changes"**

### Resetting a Password

1. Click on user row
2. Click **"Reset Password"**
3. Enter new password
4. Click **"Reset"**
5. Inform user of new password

### Deactivating a User

When an employee leaves:
1. Click on user row
2. Click **"Deactivate"**
3. Confirm deactivation
4. User can no longer log in
5. Transaction history preserved

**Note**: Don't delete users - deactivate them to preserve audit trail.

---

## System Settings

### Store Information

**Admin → Settings → Store**

| Setting | Description |
|---------|-------------|
| Store Name | Display name (receipts, etc.) |
| Address | Store address |
| Phone | Store phone number |
| Email | Store email |
| Tax ID | For tax reporting |
| Logo | Upload store logo |

### Tax Configuration

**Admin → Settings → Tax**

1. Click **"Add Tax Rate"**
2. Configure:
   - Name (e.g., "State Sales Tax")
   - Rate (e.g., 8.25%)
   - Applies to (categories, all items)
3. Click **"Save"**

**Multiple Tax Rates**: System supports combined rates (state + local).

### Receipt Settings

**Admin → Settings → Receipts**

| Setting | Description |
|---------|-------------|
| Header Text | Top of receipt (store name, address) |
| Footer Text | Bottom of receipt (return policy, thanks) |
| Show Logo | Display logo on receipt |
| Receipt Width | 58mm or 80mm |
| Print Copies | Number of copies |

### Printer Configuration

**Admin → Settings → Hardware → Printers**

1. Click **"Add Printer"**
2. Select printer type:
   - Receipt Printer
   - Label Printer
   - Report Printer
3. Configure connection:
   - USB
   - Network (IP address)
   - Serial (COM port)
4. Test print
5. Save configuration

### Payment Methods

**Admin → Settings → Payments**

Enable/disable payment types:
- [ ] Cash
- [ ] Credit Card
- [ ] Debit Card
- [ ] Check
- [ ] Gift Card
- [ ] Store Credit
- [ ] Mobile Payment

---

## Integrations

### QuickBooks Online

**Admin → Integrations → QuickBooks**

1. Click **"Connect to QuickBooks"**
2. Sign in to your QuickBooks account
3. Authorize EasySale access
4. Configure sync settings:
   - Sync frequency
   - Account mapping
   - Customer sync
   - Product sync

### WooCommerce

**Admin → Integrations → WooCommerce**

1. Enter store URL
2. Enter API credentials:
   - Consumer Key
   - Consumer Secret
3. Test connection
4. Configure sync:
   - Product sync direction
   - Inventory sync
   - Order import

### Stripe

**Admin → Integrations → Stripe**

1. Click **"Connect to Stripe"**
2. Authorize EasySale
3. Configure:
   - Payment types accepted
   - Currency
   - Statement descriptor

### Square

**Admin → Integrations → Square**

1. Enter Application ID
2. Enter Access Token
3. Test connection
4. Configure terminals

---

## Backup Management

### Backup Settings

**Admin → Backup → Settings**

| Setting | Description |
|---------|-------------|
| Backup Frequency | Daily, weekly, etc. |
| Backup Time | When to run (e.g., 2 AM) |
| Retention Days | How long to keep backups |
| Backup Location | Local/network/cloud |

### Manual Backup

1. Click **"Admin"** → **"Backup"**
2. Click **"Create Backup Now"**
3. Wait for completion
4. Download backup file (optional)

### Viewing Backup History

```
┌────────────────────────────────────────────────────────────────┐
│ Backup History                                                 │
├──────────────────────┬──────────────┬──────────┬──────────────┤
│ Date/Time            │ Type         │ Size     │ Status       │
├──────────────────────┼──────────────┼──────────┼──────────────┤
│ 2026-01-30 02:00:00  │ Scheduled    │ 125 MB   │ ✓ Complete   │
│ 2026-01-29 02:00:00  │ Scheduled    │ 124 MB   │ ✓ Complete   │
│ 2026-01-28 14:30:00  │ Manual       │ 124 MB   │ ✓ Complete   │
│ 2026-01-28 02:00:00  │ Scheduled    │ 123 MB   │ ✓ Complete   │
└──────────────────────┴──────────────┴──────────┴──────────────┘
```

### Restoring from Backup

**⚠️ CAUTION: Restore overwrites current data**

1. Click **"Restore"**
2. Select backup to restore
3. Enter admin password to confirm
4. Wait for restore to complete
5. Verify data after restore

---

## Audit Logs

### Viewing Audit Logs

**Admin → Audit Logs**

Audit logs track:
- User logins/logouts
- Settings changes
- User management actions
- Void transactions
- Price overrides
- Discount approvals
- System events

### Filtering Logs

| Filter | Options |
|--------|---------|
| Date Range | Start and end dates |
| User | Specific user |
| Action Type | Login, settings, transaction, etc. |
| Severity | Info, warning, error |

### Exporting Logs

1. Apply desired filters
2. Click **"Export"**
3. Choose format (CSV, PDF)
4. Download file

---

## Multi-Store Setup

If operating multiple locations:

### Adding a Store

**Admin → Stores → Add Store**

1. Enter store information
2. Configure sync settings
3. Set up store-specific settings

### Store Sync Configuration

| Setting | Description |
|---------|-------------|
| Sync Products | Share product catalog |
| Sync Customers | Share customer database |
| Sync Prices | Use same pricing |
| Sync Inventory | Share stock visibility |

---

## Security Settings

### Password Policy

**Admin → Security → Password Policy**

| Setting | Recommendation |
|---------|----------------|
| Minimum Length | 8+ characters |
| Require Numbers | Yes |
| Require Symbols | Optional |
| Expiry Days | 90 (or never) |
| Login Attempts | 5 before lockout |
| Lockout Duration | 15 minutes |

### Session Settings

| Setting | Description |
|---------|-------------|
| Session Timeout | Auto-logout after inactivity |
| Force Logout | End all sessions |
| Single Session | Prevent multiple logins |

### Security Best Practices

1. **Use strong passwords** - enforce minimum complexity
2. **Unique accounts** - never share logins
3. **Role-based access** - least privilege principle
4. **Regular audits** - review access and logs
5. **Prompt deactivation** - disable accounts immediately when staff leave

---

## System Maintenance

### Database Maintenance

**Admin → System → Database**

- **Vacuum**: Optimize database (run monthly)
- **Integrity Check**: Verify database health
- **Statistics**: View database size and metrics

### Clearing Old Data

**Admin → System → Data Management**

Archive old data to improve performance:
- Transactions older than X years
- Logs older than X months
- Temporary files

**Note**: Archived data is preserved but moved to separate storage.

### Software Updates

When updates are available:
1. Notification appears in admin dashboard
2. Review release notes
3. Create backup before updating
4. Click **"Install Update"**
5. System restarts automatically

---

## Troubleshooting

### Common Issues

#### User Can't Log In
1. Verify username is correct
2. Reset password
3. Check if account is deactivated
4. Check for lockout

#### Printer Not Working
1. Check physical connection
2. Verify printer settings
3. Test print from settings
4. Restart printer service

#### Sync Not Working
1. Check network connectivity
2. Review sync logs
3. Test connection to sync target
4. Force manual sync

#### System Running Slow
1. Check database size
2. Run vacuum/optimize
3. Clear temporary files
4. Review for resource issues

### System Logs

**Admin → System → Logs**

View detailed system logs for:
- Application errors
- Database queries
- API calls
- Sync operations

---

## Reports

### Available Admin Reports

| Report | Description |
|--------|-------------|
| User Activity | Login history, actions by user |
| System Health | Performance metrics |
| Audit Summary | Summary of audited events |
| Integration Status | Status of external connections |
| Backup History | Backup success/failure |

### Scheduling Reports

1. Select report
2. Click **"Schedule"**
3. Set frequency (daily, weekly, monthly)
4. Enter email recipients
5. Save schedule

---

## Quick Reference

### Common Admin Tasks

| Task | Location |
|------|----------|
| Add user | Admin → Users → Add User |
| Reset password | Admin → Users → [User] → Reset Password |
| Change tax rate | Admin → Settings → Tax |
| Manual backup | Admin → Backup → Create Backup |
| View logs | Admin → Audit Logs |
| Check sync | Admin → Integrations → Status |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+U | Users |
| Ctrl+S | Settings |
| Ctrl+B | Backup |
| Ctrl+L | Logs |

### Emergency Procedures

#### Complete System Failure
1. Don't panic
2. Note error messages
3. Try restarting application
4. Contact IT support
5. Switch to backup procedures if needed

#### Security Incident
1. Deactivate compromised accounts
2. Force all users to log out
3. Change admin passwords
4. Review audit logs
5. Document incident
6. Report as required

---

## Getting Help

### Support Resources

- **Documentation**: Full documentation in Help menu
- **Knowledge Base**: Common issues and solutions
- **GitHub Issues**: Report bugs and request features
- **Community**: GitHub Discussions

### Contacting Support

When contacting support, provide:
- System version
- Error messages (exact text)
- Steps to reproduce issue
- Recent changes made
- Relevant log entries

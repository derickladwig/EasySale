# EasySale Configuration Guide for Administrators

## Overview

This guide covers the configuration and administration of EasySale's feature flags and module settings. As an administrator, you'll learn how to enable/disable features, configure module settings, manage permissions, and customize the system for your business needs.

## Prerequisites

- Administrator access to EasySale
- Understanding of your business requirements
- Access to configuration files (for advanced configuration)
- Backup of current configuration before making changes

## Configuration Architecture

### Configuration Hierarchy

EasySale uses a multi-level configuration system:

1. **System Defaults**: Built-in defaults in the application
2. **Tenant Configuration**: Company-wide settings (JSON file)
3. **Store Settings**: Location-specific overrides (database)
4. **User Preferences**: Individual user settings (database)

**Precedence**: User > Store > Tenant > System (higher levels override lower levels)

### Configuration Files

**Location**: `configs/private/your-business.json`

**Structure**:
```json
{
  "tenant": {
    "id": "your-business",
    "name": "Your Business Name",
    "branding": { ... },
    "modules": { ... },
    "features": { ... }
  }
}
```

**Important**: Configuration files in `configs/private/` are gitignored for security.

## Module Configuration

### Accessing Module Settings

**Via Web Interface:**
1. Log in as administrator
2. Navigate to **Settings** > **Modules**
3. See list of all available modules
4. Click any module to configure

**Via Configuration File:**
1. Open `configs/private/your-business.json`
2. Navigate to `modules` section
3. Edit module settings
4. Save file and restart application (or hot-reload if enabled)

### Core Modules

#### Work Orders Module

**Enable/Disable:**
```json
{
  "modules": {
    "workOrders": {
      "enabled": true,
      "settings": {
        "autoInvoiceOnComplete": true,
        "requireCustomerSignature": false,
        "defaultStatus": "scheduled",
        "numberFormat": "WO-{YYYY}-{NNNN}",
        "defaultLaborRate": 75.00,
        "allowPartialCompletion": false
      }
    }
  }
}
```

**Settings Explained:**
- `autoInvoiceOnComplete`: Automatically create invoice when work order completed
- `requireCustomerSignature`: Require signature before marking complete
- `defaultStatus`: Initial status for new work orders
- `numberFormat`: Work order number format (supports variables)
- `defaultLaborRate`: Default hourly rate for labor
- `allowPartialCompletion`: Allow completing work orders with pending items

**Web Interface Configuration:**
1. Navigate to **Settings** > **Modules** > **Work Orders**
2. Toggle **Enable Work Orders** switch
3. Configure settings in form
4. Click **Save Changes**

#### Appointments Module

**Enable/Disable:**
```json
{
  "modules": {
    "appointments": {
      "enabled": true,
      "settings": {
        "slotDuration": 30,
        "advanceBookingDays": 30,
        "minBookingNotice": 120,
        "allowOnlineBooking": true,
        "requireConfirmation": true,
        "sendReminders": true,
        "reminderTiming": [1440, 60],
        "allowRescheduling": true,
        "cancellationPolicy": "24 hours notice required"
      }
    }
  }
}
```

**Settings Explained:**
- `slotDuration`: Time slot duration in minutes (15, 30, 60)
- `advanceBookingDays`: How far ahead customers can book
- `minBookingNotice`: Minimum notice required in minutes
- `allowOnlineBooking`: Enable customer self-booking
- `requireConfirmation`: Require customer confirmation
- `sendReminders`: Enable automatic reminders
- `reminderTiming`: When to send reminders (minutes before appointment)
- `allowRescheduling`: Allow customers to reschedule
- `cancellationPolicy`: Cancellation policy text

#### Time Tracking Module

**Enable/Disable:**
```json
{
  "modules": {
    "timeTracking": {
      "enabled": true,
      "settings": {
        "requireProjectAssignment": false,
        "allowManualEntry": true,
        "requireApproval": true,
        "roundingInterval": 15,
        "overtimeThreshold": 40,
        "overtimeMultiplier": 1.5,
        "enableGeolocation": false,
        "enablePhotoCapture": false,
        "autoBreakDeduction": 30,
        "maxBreakTime": 60
      }
    }
  }
}
```

**Settings Explained:**
- `requireProjectAssignment`: Require project/task for all time entries
- `allowManualEntry`: Allow manual time entry creation
- `requireApproval`: Require manager approval for time entries
- `roundingInterval`: Round time to nearest X minutes (0 = no rounding)
- `overtimeThreshold`: Weekly hours before overtime (0 = disabled)
- `overtimeMultiplier`: Overtime pay multiplier (1.5 = time-and-a-half)
- `enableGeolocation`: Track location on clock in/out
- `enablePhotoCapture`: Require photo on clock in
- `autoBreakDeduction`: Automatically deduct X minutes for breaks
- `maxBreakTime`: Maximum break time per shift in minutes

#### Estimates Module

**Enable/Disable:**
```json
{
  "modules": {
    "estimates": {
      "enabled": true,
      "settings": {
        "numberFormat": "EST-{YYYY}-{NNNN}",
        "defaultExpirationDays": 30,
        "requireApproval": false,
        "allowOnlineAcceptance": true,
        "sendAutomaticReminders": true,
        "reminderDays": [7, 3, 1],
        "includeTerms": true,
        "defaultTerms": "Payment due within 30 days of acceptance.",
        "allowConversionToInvoice": true,
        "allowConversionToWorkOrder": true
      }
    }
  }
}
```

**Settings Explained:**
- `numberFormat`: Estimate number format
- `defaultExpirationDays`: Default validity period
- `requireApproval`: Require approval before sending
- `allowOnlineAcceptance`: Enable online accept/reject
- `sendAutomaticReminders`: Send automatic follow-ups
- `reminderDays`: Days before expiration to send reminders
- `includeTerms`: Include terms and conditions on PDF
- `defaultTerms`: Default terms text
- `allowConversionToInvoice`: Enable conversion to invoice
- `allowConversionToWorkOrder`: Enable conversion to work order

### Feature Flags

Feature flags allow you to enable/disable specific features within modules.

**Configuration:**
```json
{
  "features": {
    "invoiceGeneration": true,
    "emailNotifications": true,
    "smsNotifications": false,
    "onlinePayments": true,
    "inventoryTracking": true,
    "customerPortal": false,
    "multiLocation": true,
    "advancedReporting": true,
    "apiAccess": true,
    "webhooks": false
  }
}
```

**Checking Feature Flags in Code:**
```typescript
import { useConfig } from '@/config/ConfigProvider';

function MyComponent() {
  const { isFeatureEnabled } = useConfig();
  
  if (!isFeatureEnabled('emailNotifications')) {
    return null; // Feature disabled
  }
  
  // Feature enabled, render component
  return <EmailSettings />;
}
```

## Branding Configuration

### Company Branding

**Configuration:**
```json
{
  "branding": {
    "companyName": "Your Business Name",
    "logo": "/assets/logo.png",
    "favicon": "/assets/favicon.ico",
    "primaryColor": "#3B82F6",
    "accentColor": "#10B981",
    "theme": {
      "mode": "light",
      "contrast": "normal"
    }
  }
}
```

**Web Interface:**
1. Navigate to **Settings** > **Branding**
2. Upload logo and favicon
3. Set company name
4. Choose theme colors using color picker
5. Preview changes in real-time
6. Click **Save Changes**

**Important**: All theme changes must go through the ThemeEngine system. Never hardcode colors in components.

### Theme Configuration

**Theme Modes:**
- `light`: Light theme (default)
- `dark`: Dark theme
- `auto`: Automatic based on system preference

**Contrast Levels:**
- `normal`: Standard contrast
- `high`: High contrast for accessibility

**Theme Locks:**
Administrators can lock theme settings to prevent user overrides:

```json
{
  "theme": {
    "mode": "light",
    "accent": "blue",
    "contrast": "normal",
    "locks": {
      "mode": true,
      "accent": false,
      "contrast": false
    }
  }
}
```

**Web Interface:**
1. Navigate to **Settings** > **Branding** > **Theme**
2. Configure theme settings
3. Toggle lock switches to prevent user overrides
4. Click **Save Changes**

## Permission Management

### User Roles

**Predefined Roles:**
- **Administrator**: Full system access
- **Manager**: Manage operations, view reports
- **Cashier**: Process sales, basic operations
- **Inventory**: Manage inventory, receive stock
- **Sales Rep**: Create estimates, manage customers
- **Technician**: Manage work orders, time tracking

### Configuring Permissions

**Via Web Interface:**
1. Navigate to **Settings** > **Users & Permissions**
2. Click **Roles** tab
3. Select role to edit
4. Toggle permissions on/off
5. Click **Save Changes**

**Permission Categories:**

**Work Orders:**
- `view_work_orders`: View work order list and details
- `create_work_order`: Create new work orders
- `edit_work_order`: Edit existing work orders
- `complete_work_order`: Mark work orders as complete
- `cancel_work_order`: Cancel work orders
- `delete_work_order`: Delete work orders

**Appointments:**
- `view_appointments`: View appointment calendar
- `create_appointment`: Create new appointments
- `edit_appointment`: Edit existing appointments
- `delete_appointment`: Delete appointments
- `manage_staff_schedule`: Manage staff availability
- `view_all_appointments`: View all appointments (not just own)

**Time Tracking:**
- `clock_in`: Clock in/out
- `view_own_time`: View own time entries
- `edit_own_time`: Edit own time entries
- `create_manual_entry`: Create manual time entries
- `view_team_time`: View team time entries
- `approve_time`: Approve time entries
- `view_all_time`: View all time entries

**Estimates:**
- `view_estimates`: View estimate list and details
- `create_estimate`: Create new estimates
- `edit_estimate`: Edit existing estimates
- `send_estimate`: Send estimates to customers
- `delete_estimate`: Delete estimates
- `convert_estimate`: Convert estimates to invoices/work orders
- `approve_estimate`: Approve estimates

**Invoices:**
- `view_invoices`: View invoice list and details
- `create_invoice`: Create invoices manually
- `edit_invoice`: Edit invoices (before payment)
- `void_invoice`: Void invoices
- `collect_payment`: Process payments

### Custom Roles

**Creating Custom Role:**
1. Navigate to **Settings** > **Users & Permissions** > **Roles**
2. Click **+ Create Role**
3. Enter role name and description
4. Select permissions from list
5. Click **Create Role**

**Assigning Roles:**
1. Navigate to **Settings** > **Users & Permissions** > **Users**
2. Select user
3. Click **Edit**
4. Select role from dropdown
5. Click **Save**

## Email Configuration

### Email Service Setup

**Supported Services:**
- SendGrid
- AWS SES
- SMTP (any provider)

**Configuration:**
```json
{
  "email": {
    "provider": "sendgrid",
    "from": {
      "name": "Your Business Name",
      "email": "noreply@yourbusiness.com"
    },
    "replyTo": "support@yourbusiness.com",
    "templates": {
      "appointmentConfirmation": "d-xxxxx",
      "appointmentReminder": "d-xxxxx",
      "invoiceNotification": "d-xxxxx",
      "estimateNotification": "d-xxxxx"
    }
  }
}
```

**Environment Variables:**
```bash
# SendGrid
SENDGRID_API_KEY=your_api_key

# AWS SES
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASSWORD=your_password
SMTP_SECURE=true
```

**Testing Email:**
1. Navigate to **Settings** > **Email**
2. Click **Test Email Configuration**
3. Enter test email address
4. Click **Send Test**
5. Verify email received

### Email Templates

**Customizing Templates:**
1. Navigate to **Settings** > **Email** > **Templates**
2. Select template to edit
3. Customize subject and body
4. Use variables: `{{customerName}}`, `{{appointmentDate}}`, etc.
5. Preview template
6. Click **Save Changes**

**Available Variables:**
- `{{companyName}}`: Your company name
- `{{customerName}}`: Customer name
- `{{customerEmail}}`: Customer email
- `{{appointmentDate}}`: Appointment date
- `{{appointmentTime}}`: Appointment time
- `{{estimateNumber}}`: Estimate number
- `{{estimateTotal}}`: Estimate total amount
- `{{invoiceNumber}}`: Invoice number
- `{{invoiceTotal}}`: Invoice total amount
- `{{workOrderNumber}}`: Work order number

## Notification Configuration

### Notification Types

**System Notifications:**
- Low stock alerts
- Sync failures
- System errors
- Security alerts

**Business Notifications:**
- Appointment reminders
- Invoice notifications
- Estimate follow-ups
- Work order status updates
- Time entry approvals

### Configuring Notifications

**Via Web Interface:**
1. Navigate to **Settings** > **Notifications**
2. Select notification type
3. Configure settings:
   - Enable/disable notification
   - Choose delivery method (email, SMS, in-app)
   - Set timing (immediate, daily digest, etc.)
   - Select recipients
4. Click **Save Changes**

**Per-User Preferences:**
Users can override notification settings:
1. User navigates to **My Settings** > **Notifications**
2. Toggle notifications on/off
3. Choose delivery preferences
4. Click **Save**

## Tax Configuration

### Tax Rates

**Adding Tax Rates:**
1. Navigate to **Settings** > **Tax Rates**
2. Click **+ Add Tax Rate**
3. Enter tax rate details:
   - Name (e.g., "State Sales Tax")
   - Rate (percentage)
   - Applies to (all products, specific categories)
   - Location (if location-specific)
4. Click **Save**

**Compound Taxes:**
For locations with multiple tax rates:
1. Create each tax rate separately
2. Mark as "Compound" if tax applies to subtotal + other taxes
3. Set calculation order

**Tax-Exempt Customers:**
1. Navigate to **Customers**
2. Select customer
3. Check **Tax Exempt** checkbox
4. Upload tax exemption certificate
5. Click **Save**

### Discount Configuration

**Creating Discounts:**
1. Navigate to **Settings** > **Discounts**
2. Click **+ Add Discount**
3. Configure discount:
   - Name
   - Type (percentage or fixed amount)
   - Value
   - Applies to (transaction or line item)
   - Eligibility rules (customer tier, product category, date range)
4. Click **Save**

**Customer Tiers:**
1. Navigate to **Settings** > **Customer Tiers**
2. Create tiers (Bronze, Silver, Gold, etc.)
3. Assign discount percentages to each tier
4. Assign customers to tiers

## Backup and Sync Configuration

### Backup Settings

**Automatic Backups:**
```json
{
  "backup": {
    "enabled": true,
    "schedule": "daily",
    "time": "02:00",
    "retention": 30,
    "location": "\\\\server\\backups\\pos",
    "cloudBackup": {
      "enabled": true,
      "provider": "aws-s3",
      "bucket": "your-backup-bucket",
      "retention": 365
    }
  }
}
```

**Web Interface:**
1. Navigate to **Settings** > **Backup**
2. Enable automatic backups
3. Set schedule and time
4. Configure retention period
5. Set backup location
6. Configure cloud backup (optional)
7. Click **Save Changes**

**Manual Backup:**
1. Navigate to **Settings** > **Backup**
2. Click **Backup Now**
3. Wait for backup to complete
4. Download backup file (optional)

### Sync Configuration

**Multi-Location Sync:**
```json
{
  "sync": {
    "enabled": true,
    "interval": 300000,
    "conflictResolution": "last-write-wins",
    "syncOnStartup": true,
    "syncOnShutdown": true,
    "retryAttempts": 3,
    "retryDelay": 60000
  }
}
```

**Settings Explained:**
- `interval`: Sync interval in milliseconds (300000 = 5 minutes)
- `conflictResolution`: How to handle conflicts (last-write-wins, manual)
- `syncOnStartup`: Sync when application starts
- `syncOnShutdown`: Sync when application closes
- `retryAttempts`: Number of retry attempts on failure
- `retryDelay`: Delay between retries in milliseconds

## Advanced Configuration

### Database Configuration

**SQLite Settings:**
```json
{
  "database": {
    "path": "./data/pos.db",
    "walMode": true,
    "cacheSize": 10000,
    "busyTimeout": 5000,
    "journalMode": "WAL"
  }
}
```

**Performance Tuning:**
- `walMode`: Enable Write-Ahead Logging for better concurrency
- `cacheSize`: Number of pages to cache in memory
- `busyTimeout`: Milliseconds to wait when database is locked
- `journalMode`: Journal mode (WAL recommended for performance)

### API Configuration

**API Settings:**
```json
{
  "api": {
    "enabled": true,
    "port": 7945,
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:5173"]
    },
    "rateLimit": {
      "enabled": true,
      "maxRequests": 100,
      "windowMs": 60000
    },
    "authentication": {
      "required": true,
      "tokenExpiration": 86400
    }
  }
}
```

### Logging Configuration

**Log Settings:**
```json
{
  "logging": {
    "level": "info",
    "file": "./logs/easysale.log",
    "rotation": "daily",
    "retention": 30,
    "console": true,
    "includeTimestamp": true,
    "includeLevel": true
  }
}
```

**Log Levels:**
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Informational messages, warnings, and errors
- `debug`: Detailed debugging information (not recommended for production)

## Configuration Best Practices

### Security

1. **Never commit configuration files** with sensitive data to version control
2. **Use environment variables** for secrets (API keys, passwords)
3. **Restrict file permissions** on configuration files
4. **Regularly rotate** API keys and passwords
5. **Enable audit logging** for configuration changes

### Performance

1. **Enable WAL mode** for SQLite database
2. **Configure appropriate cache sizes** based on available memory
3. **Set reasonable sync intervals** (5-10 minutes typical)
4. **Enable compression** for backups
5. **Monitor log file sizes** and configure rotation

### Maintenance

1. **Document all configuration changes** in change log
2. **Test configuration changes** in development environment first
3. **Backup configuration** before making changes
4. **Review logs regularly** for errors or warnings
5. **Keep configuration organized** with comments

### Disaster Recovery

1. **Maintain offsite backups** of configuration and data
2. **Document recovery procedures** step-by-step
3. **Test recovery process** periodically
4. **Keep backup of working configuration** before changes
5. **Have rollback plan** for configuration changes

## Troubleshooting

### Module Not Appearing

**Problem**: Enabled module but not showing in UI

**Solutions:**
1. Verify module is enabled in configuration
2. Check user has required permissions
3. Clear browser cache and reload
4. Restart application to reload configuration
5. Check for JavaScript errors in browser console

### Configuration Changes Not Applied

**Problem**: Changed configuration but no effect

**Solutions:**
1. Verify configuration file syntax (valid JSON)
2. Restart application to reload configuration
3. Check for configuration errors in logs
4. Verify file permissions allow reading
5. Check configuration file location is correct

### Email Notifications Not Sending

**Problem**: Notifications configured but not sending

**Solutions:**
1. Verify email service credentials are correct
2. Check email service is enabled in configuration
3. Test email configuration in settings
4. Check email logs for errors
5. Verify recipient email addresses are valid
6. Check spam/junk folders

### Sync Failures

**Problem**: Multi-location sync failing

**Solutions:**
1. Check network connectivity between locations
2. Verify sync service is running
3. Check sync logs for specific errors
4. Verify database is not locked
5. Check disk space on all locations
6. Review conflict resolution settings

## Related Documentation

- [User Guides](../user-guides/) - End-user documentation
- [Developer Guide](../developer-guides/theming.md) - Technical documentation
- [API Documentation](../api/) - API reference
- [Troubleshooting Guide](../user-guides/troubleshooting.md) - Common issues

## Support

For additional help:
- Contact support: support@easysale.com
- Visit documentation: https://docs.easysale.com
- Community forum: https://community.easysale.com
- Enterprise support: enterprise@easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

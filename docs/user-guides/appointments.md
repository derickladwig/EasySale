# Appointments User Guide

## Overview

The Appointments module provides a comprehensive calendar-based scheduling system for managing customer appointments, service bookings, and staff schedules. This guide covers creating appointments, managing the calendar, and handling appointment workflows.

## Prerequisites

- Appointments module must be enabled in your configuration
- User must have appropriate permissions (view_appointments, create_appointment, edit_appointment)
- Staff members should be configured in the system
- Service types should be defined (optional but recommended)

## Getting Started

### Accessing the Appointment Calendar

1. From the main dashboard, click **Appointments** in the navigation menu
2. The calendar view opens showing the current month by default
3. Use the view selector to switch between Month, Week, or Day views

### Calendar Views

**Month View:**
- Shows entire month at a glance
- Appointments displayed as colored blocks
- Click any date to see appointments for that day
- Best for long-term planning

**Week View:**
- Shows 7-day week with hourly time slots
- Detailed view of daily schedule
- Drag appointments to reschedule
- Best for weekly planning

**Day View:**
- Shows single day with detailed time slots
- Hourly breakdown of schedule
- Most detailed view of appointments
- Best for daily operations

## Creating Appointments

### Quick Appointment Creation

1. Click on any time slot in the calendar
2. A quick-create dialog appears
3. Enter basic information:
   - Customer name
   - Service type
   - Duration
4. Click **Create** to save

### Detailed Appointment Creation

1. Click **+ New Appointment** button
2. Complete the appointment form:

**Customer Information:**
- Search for existing customer or create new
- Customer contact details auto-populate
- Add customer notes if needed

**Appointment Details:**
- **Date**: Select appointment date
- **Time**: Select start time
- **Duration**: Enter duration in minutes (respects slot duration from config)
- **Service Type**: Select from configured services
- **Staff Member**: Assign to specific staff member
- **Location**: Select location (if multi-location)

**Additional Information:**
- **Status**: Scheduled, Confirmed, Completed, Cancelled, No-Show
- **Notes**: Internal notes for staff
- **Customer Notes**: Notes visible to customer
- **Reminder**: Enable email/SMS reminders

3. Click **Create Appointment** to save

### Recurring Appointments

1. When creating appointment, check **Recurring**
2. Select recurrence pattern:
   - Daily
   - Weekly (select days of week)
   - Monthly (select day of month)
   - Custom pattern
3. Set end date or number of occurrences
4. Click **Create Series**
5. All appointments in series are created

## Managing Appointments

### Viewing Appointment Details

1. Click any appointment on the calendar
2. Appointment detail panel opens showing:
   - Customer information
   - Service details
   - Assigned staff member
   - Status and notes
   - History of changes

### Editing Appointments

**Quick Edit:**
1. Click appointment on calendar
2. Click **Edit** button
3. Modify any field
4. Click **Save Changes**

**Drag-and-Drop Rescheduling:**
1. Click and hold appointment
2. Drag to new time slot
3. Release to drop
4. Confirm reschedule in dialog
5. Customer notification sent (if enabled)

**Bulk Editing:**
1. Select multiple appointments (Ctrl+Click)
2. Click **Bulk Actions** button
3. Choose action (change status, reassign staff, etc.)
4. Apply changes to all selected

### Changing Appointment Status

**Status Options:**
- **Scheduled**: Initial status when created
- **Confirmed**: Customer confirmed attendance
- **In Progress**: Service currently being provided
- **Completed**: Service finished
- **Cancelled**: Appointment cancelled
- **No-Show**: Customer didn't arrive

**To Update Status:**
1. Open appointment detail
2. Click **Status** dropdown
3. Select new status
4. Add reason/notes (optional)
5. Click **Update**

### Cancelling Appointments

1. Open appointment detail
2. Click **Cancel Appointment** button
3. Select cancellation reason:
   - Customer request
   - Staff unavailable
   - Weather/emergency
   - Other (specify)
4. Choose whether to notify customer
5. Click **Confirm Cancellation**
6. Time slot becomes available

### Completing Appointments

1. Open appointment detail
2. Click **Complete** button
3. Add completion notes (optional)
4. Record actual duration if different
5. Click **Mark Complete**
6. Option to create invoice or work order

## Calendar Features

### Color Coding

Appointments are color-coded by:
- **Service Type**: Different colors for different services
- **Staff Member**: Each staff member has unique color
- **Status**: Visual indication of appointment status

Configure color scheme in **Settings** > **Appointments** > **Display**

### Filtering

Filter calendar view by:
- **Staff Member**: Show only specific staff's appointments
- **Service Type**: Show only specific services
- **Status**: Show only appointments with certain status
- **Location**: Show only specific location (multi-location)

**To Apply Filters:**
1. Click **Filter** button
2. Select filter criteria
3. Click **Apply**
4. Calendar updates to show filtered appointments

### Search

Search for appointments by:
- Customer name
- Appointment ID
- Service type
- Date range
- Staff member

**To Search:**
1. Click search icon or press `Ctrl+F`
2. Enter search term
3. Results appear in list view
4. Click result to view on calendar

### Time Slot Availability

**Viewing Availability:**
- Available slots shown in white/light color
- Booked slots shown with appointment
- Blocked slots shown in gray
- Hover over slot to see details

**Blocking Time Slots:**
1. Click on available slot
2. Select **Block Time**
3. Enter reason (lunch, meeting, etc.)
4. Set duration
5. Click **Block**
6. Slot becomes unavailable for booking

## Customer Communication

### Appointment Confirmations

**Automatic Confirmations:**
- Sent immediately when appointment created
- Includes appointment details
- Includes calendar invite (.ics file)
- Customer can add to their calendar

**Manual Confirmations:**
1. Open appointment detail
2. Click **Send Confirmation** button
3. Review email content
4. Click **Send**

### Appointment Reminders

**Automatic Reminders:**
- Configured in **Settings** > **Appointments** > **Reminders**
- Set reminder timing (24 hours, 1 hour, etc.)
- Choose delivery method (email, SMS, both)
- Reminders sent automatically

**Manual Reminders:**
1. Open appointment detail
2. Click **Send Reminder** button
3. Choose delivery method
4. Add custom message (optional)
5. Click **Send**

### Rescheduling Notifications

When you reschedule an appointment:
- Customer receives automatic notification
- Includes old and new time
- Includes updated calendar invite
- Customer can confirm or request changes

## Staff Management

### Assigning Staff

**During Creation:**
- Select staff member from dropdown
- Only available staff shown
- System checks for conflicts

**Reassigning:**
1. Open appointment detail
2. Click **Reassign** button
3. Select new staff member
4. System checks availability
5. Click **Confirm**
6. Staff members notified

### Staff Schedules

**Viewing Staff Schedule:**
1. Click **Staff** tab
2. Select staff member
3. View their complete schedule
4. See availability and bookings

**Setting Staff Availability:**
1. Navigate to **Settings** > **Staff**
2. Select staff member
3. Set working hours for each day
4. Set time off/vacation
5. Save changes

### Staff Notifications

Staff receive notifications for:
- New appointments assigned
- Appointment changes
- Appointment cancellations
- Upcoming appointments
- Customer no-shows

Configure in **Settings** > **Appointments** > **Staff Notifications**

## Reporting

### Appointment Reports

**Available Reports:**
- Appointments by Status
- Appointments by Service Type
- Appointments by Staff Member
- No-Show Rate
- Cancellation Rate
- Revenue by Service
- Utilization Rate

**Generating Reports:**
1. Navigate to **Reports** > **Appointments**
2. Select report type
3. Choose date range
4. Apply filters
5. Click **Generate Report**
6. Export to CSV or PDF

### Key Metrics

**Dashboard Metrics:**
- Today's appointments
- This week's appointments
- Completion rate
- No-show rate
- Average appointment duration
- Revenue per appointment

**Performance Tracking:**
- Staff utilization
- Service popularity
- Peak booking times
- Customer retention
- Booking lead time

## Configuration

### Module Settings

Access via **Settings** > **Modules** > **Appointments**

**General Settings:**
- Enable/disable appointments module
- Set default appointment duration
- Configure slot duration (15, 30, 60 minutes)
- Set advance booking days (how far ahead customers can book)
- Set minimum booking notice (e.g., 2 hours)

**Calendar Settings:**
- Default calendar view (month/week/day)
- First day of week
- Business hours (start/end time)
- Time zone
- Show weekends

**Service Types:**
- Add/edit service types
- Set default duration per service
- Set default price per service
- Assign staff to services
- Set service colors

**Booking Rules:**
- Maximum appointments per day
- Maximum appointments per staff member
- Buffer time between appointments
- Allow double-booking (yes/no)
- Require customer confirmation

**Notification Settings:**
- Enable appointment confirmations
- Enable appointment reminders
- Set reminder timing
- Choose delivery methods
- Customize email templates

### Permissions

Configure user permissions via **Settings** > **Users & Permissions**

**Appointment Permissions:**
- `view_appointments`: View appointment calendar and details
- `create_appointment`: Create new appointments
- `edit_appointment`: Edit existing appointments
- `delete_appointment`: Delete appointments
- `manage_staff_schedule`: Manage staff availability
- `view_all_appointments`: View all appointments (not just own)
- `send_notifications`: Send manual notifications

## Integration with Other Modules

### Work Orders

Convert appointment to work order:
1. Complete appointment
2. Click **Create Work Order**
3. Appointment details transfer to work order
4. Add parts and additional labor
5. Complete work order to generate invoice

### Estimates

Create estimate from appointment:
1. Open appointment detail
2. Click **Create Estimate**
3. Appointment service transfers to estimate
4. Add additional items
5. Send estimate to customer

### Time Tracking

Track time during appointment:
1. Start appointment
2. Click **Start Timer**
3. Timer runs during service
4. Click **Stop Timer** when done
5. Time automatically recorded

### Invoicing

Create invoice from appointment:
1. Complete appointment
2. Click **Create Invoice**
3. Service details transfer to invoice
4. Add any additional charges
5. Send invoice to customer

## Troubleshooting

### Cannot Create Appointment

**Problem**: Create button is disabled or error occurs

**Solutions:**
1. Verify appointments module is enabled
2. Check you have `create_appointment` permission
3. Ensure time slot is available
4. Check staff member is available
5. Verify customer information is complete
6. Check for conflicting appointments

### Appointment Not Showing on Calendar

**Problem**: Created appointment but not visible

**Solutions:**
1. Refresh the calendar view
2. Check calendar filters (may be filtered out)
3. Verify appointment date is in visible range
4. Check appointment status (cancelled appointments may be hidden)
5. Try different calendar view (month/week/day)

### Cannot Reschedule Appointment

**Problem**: Drag-and-drop not working or reschedule fails

**Solutions:**
1. Check you have `edit_appointment` permission
2. Verify new time slot is available
3. Check staff member availability
4. Ensure appointment is not in past
5. Try manual edit instead of drag-and-drop

### Reminders Not Sending

**Problem**: Customers not receiving appointment reminders

**Solutions:**
1. Verify reminders are enabled in settings
2. Check customer has valid email/phone number
3. Verify email service is configured
4. Check reminder timing settings
5. Review notification logs for errors
6. Test with manual reminder send

### Double-Booking Occurring

**Problem**: Multiple appointments scheduled at same time

**Solutions:**
1. Check booking rules in settings
2. Verify "allow double-booking" is disabled
3. Check staff availability settings
4. Review appointment creation process
5. Enable booking conflicts warning

## Best Practices

### Scheduling

1. **Book appointments during business hours** only
2. **Leave buffer time** between appointments for preparation
3. **Confirm appointments** 24 hours in advance
4. **Update status promptly** as appointments progress
5. **Block time** for breaks, meetings, and administrative tasks

### Customer Service

1. **Send confirmations immediately** after booking
2. **Send reminders** 24 hours and 1 hour before
3. **Respond quickly** to reschedule requests
4. **Follow up** after completed appointments
5. **Track no-shows** and implement policies

### Staff Management

1. **Keep staff schedules updated** with time off
2. **Distribute appointments evenly** among staff
3. **Respect staff preferences** for service types
4. **Monitor staff utilization** to optimize scheduling
5. **Communicate changes** promptly to staff

### Data Management

1. **Review and clean up** old appointments regularly
2. **Archive completed appointments** after 1 year
3. **Track cancellation reasons** to identify patterns
4. **Monitor no-show rates** by customer
5. **Export data regularly** for backup

## Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+N`: Create new appointment
- `Ctrl+F`: Search appointments
- `Ctrl+P`: Print calendar
- `Arrow Keys`: Navigate calendar
- `T`: Jump to today
- `M/W/D`: Switch to Month/Week/Day view

### Quick Actions

- **Double-click time slot**: Quick create appointment
- **Right-click appointment**: Context menu with actions
- **Shift+Click**: Select multiple appointments
- **Ctrl+Drag**: Copy appointment to new time

### Mobile Access

- Access calendar from mobile browser
- Create appointments on-the-go
- Update appointment status from field
- Send quick confirmations
- View staff schedules

### Calendar Sync

- Export calendar to iCal format
- Import into Google Calendar, Outlook, etc.
- Two-way sync available (requires configuration)
- Subscribe to calendar feed for automatic updates

## Related Documentation

- [Work Orders User Guide](./work-orders-invoicing.md) - Converting appointments to work orders
- [Estimates User Guide](./estimates.md) - Creating estimates from appointments
- [Time Tracking Guide](./time-tracking.md) - Tracking time during appointments
- [Customer Management](./customers.md) - Managing customer records
- [Admin Configuration Guide](../admin-guides/configuration.md) - Appointment configuration

## Support

For additional help:
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Contact support: support@easysale.com
- Visit documentation: https://docs.easysale.com
- Community forum: https://community.easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

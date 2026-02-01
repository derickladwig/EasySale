# Time Tracking User Guide

## Overview

The Time Tracking module allows you to track employee work hours, breaks, project time, and billable hours. This guide covers clocking in/out, manual time entry, time reports, and integration with other modules like work orders and payroll.

## Prerequisites

- Time Tracking module must be enabled in your configuration
- User must have appropriate permissions (clock_in, view_time_entries, manage_time)
- Employee records should be configured in the system
- Projects/tasks should be defined (optional but recommended for detailed tracking)

## Getting Started

### Accessing Time Tracking

1. From the main dashboard, click **Time Tracking** in the navigation menu
2. The time tracking dashboard opens showing your current status
3. View today's hours, week's hours, and recent entries

### Time Tracking Dashboard

**Current Status Section:**
- Shows if you're currently clocked in or out
- Displays current session duration (if clocked in)
- Shows current project/task (if assigned)
- Quick access to clock in/out button

**Today's Summary:**
- Total hours worked today
- Break time taken
- Billable vs non-billable hours
- Current project breakdown

**Week's Summary:**
- Total hours this week
- Daily breakdown
- Overtime hours (if applicable)
- Week-to-date earnings (if configured)

## Clocking In and Out

### Basic Clock In/Out

**To Clock In:**
1. Click the **Clock In** button on dashboard
2. Optionally select project/task
3. Add notes (optional)
4. Click **Confirm**
5. Timer starts automatically

**To Clock Out:**
1. Click the **Clock Out** button
2. Review time worked
3. Add completion notes (optional)
4. Click **Confirm**
5. Time entry is saved

### Clock In with Project Assignment

1. Click **Clock In** button
2. Select **Assign to Project** checkbox
3. Choose project from dropdown
4. Select specific task (optional)
5. Add notes about work to be done
6. Click **Confirm**

### Quick Clock In/Out

**From Mobile:**
- Open EasySale mobile app
- Tap clock icon in header
- Confirm clock in/out
- No additional steps required

**From Barcode:**
- Scan your employee badge
- System automatically clocks you in/out
- Displays confirmation message

## Break Management

### Taking a Break

**To Start Break:**
1. While clocked in, click **Start Break**
2. Select break type:
   - Lunch break
   - Rest break
   - Personal break
3. Click **Confirm**
4. Break timer starts

**To End Break:**
1. Click **End Break** button
2. Break time is recorded
3. Work timer resumes automatically

### Break Rules

**Automatic Break Deduction:**
- Configure in **Settings** > **Time Tracking** > **Break Rules**
- Set automatic break deduction (e.g., 30 min for 8+ hour shifts)
- Breaks automatically subtracted from total hours

**Break Limits:**
- Set maximum break time per shift
- System warns if break time exceeded
- Requires manager approval for extended breaks

## Manual Time Entry

### When to Use Manual Entry

Use manual time entry when:
- Forgot to clock in/out
- Working remotely without system access
- Correcting time entry errors
- Recording past work hours
- Adding time for salaried employees

### Creating Manual Time Entry

1. Navigate to **Time Tracking** > **Manual Entry**
2. Click **+ Add Time Entry**
3. Complete the form:

**Basic Information:**
- **Employee**: Select employee (defaults to you)
- **Date**: Select work date
- **Start Time**: Enter start time
- **End Time**: Enter end time
- **Total Hours**: Auto-calculated (can override)

**Additional Details:**
- **Project/Task**: Assign to project (optional)
- **Break Time**: Enter break duration
- **Billable**: Mark as billable/non-billable
- **Notes**: Add description of work performed
- **Approval Status**: Pending, Approved, Rejected

4. Click **Save Entry**

### Editing Time Entries

**Edit Your Own Entries:**
1. Navigate to **Time Tracking** > **My Time**
2. Find the entry to edit
3. Click **Edit** button
4. Modify fields as needed
5. Click **Save Changes**
6. Entry marked as "Modified" with timestamp

**Manager Approval Required:**
- Entries older than 24 hours require manager approval
- Edited entries require re-approval
- Approval status shown on each entry

## Time Entry Management

### Viewing Time Entries

**List View:**
- See all time entries with date, hours, and project
- Filter by date range, employee, or project
- Sort by any column
- Search by notes or project name

**Calendar View:**
- Visual representation of time entries
- Color-coded by project or status
- Click any day to see detailed entries
- Drag to select date range

**Detail View:**
- Click any entry to see full details
- View all fields including notes
- See edit history and approvals
- View related work orders or tasks

### Filtering Time Entries

**Available Filters:**
- Date range (today, this week, this month, custom)
- Employee (self, team, all)
- Project/task
- Billable status
- Approval status
- Entry type (clock in/out, manual)

**To Apply Filters:**
1. Click **Filter** button
2. Select filter criteria
3. Click **Apply**
4. List updates to show filtered entries

### Exporting Time Entries

1. Apply desired filters
2. Click **Export** button
3. Select format:
   - CSV (for Excel)
   - PDF (for printing)
   - JSON (for integrations)
4. Choose date range
5. Click **Download**

## Project and Task Tracking

### Assigning Time to Projects

**During Clock In:**
1. Clock in as normal
2. Select project from dropdown
3. Select task (optional)
4. Time automatically tracked to project

**For Existing Entry:**
1. Open time entry
2. Click **Assign to Project**
3. Select project and task
4. Click **Save**

### Switching Projects

**While Clocked In:**
1. Click **Switch Project** button
2. Current project time is saved
3. Select new project
4. New project timer starts
5. Both entries recorded separately

### Project Time Summary

**View Project Hours:**
1. Navigate to **Time Tracking** > **Projects**
2. See list of all projects
3. View total hours per project
4. See breakdown by employee
5. View billable vs non-billable hours

## Billable vs Non-Billable Hours

### Marking Time as Billable

**Automatic:**
- Configure project as billable in project settings
- All time tracked to project marked billable automatically
- Billable rate pulled from employee or project settings

**Manual:**
1. Open time entry
2. Check **Billable** checkbox
3. Enter billable rate (if different from default)
4. Click **Save**

### Billable Rate Configuration

**Employee Rate:**
- Set in **Settings** > **Employees** > [Employee] > **Billing Rate**
- Used as default for all billable time
- Can be overridden per entry

**Project Rate:**
- Set in **Settings** > **Projects** > [Project] > **Billing Rate**
- Overrides employee rate for project time
- Used for project-based billing

**Custom Rate:**
- Enter custom rate on individual time entry
- Used for special circumstances
- Requires manager approval

## Time Approval Workflow

### Submitting Time for Approval

**Automatic Submission:**
- Time entries auto-submit at end of pay period
- Employees receive notification to review
- Deadline for corrections before submission

**Manual Submission:**
1. Navigate to **Time Tracking** > **My Time**
2. Select entries to submit
3. Click **Submit for Approval**
4. Add notes for manager (optional)
5. Click **Confirm**

### Manager Approval Process

**Reviewing Time Entries:**
1. Navigate to **Time Tracking** > **Approvals**
2. See list of pending approvals
3. Click entry to review details
4. Check for accuracy and completeness

**Approving Entries:**
1. Select entries to approve
2. Click **Approve** button
3. Add approval notes (optional)
4. Click **Confirm**
5. Employees notified of approval

**Rejecting Entries:**
1. Select entry to reject
2. Click **Reject** button
3. Enter rejection reason (required)
4. Click **Confirm**
5. Employee notified to correct and resubmit

## Overtime Tracking

### Automatic Overtime Calculation

**Configuration:**
- Set in **Settings** > **Time Tracking** > **Overtime Rules**
- Define overtime threshold (e.g., 40 hours/week)
- Set overtime multiplier (e.g., 1.5x for time-and-a-half)
- Configure daily overtime rules (optional)

**Calculation:**
- System automatically calculates overtime
- Overtime hours shown separately in reports
- Overtime pay calculated based on multiplier
- Weekly and daily overtime supported

### Viewing Overtime

**Dashboard:**
- Overtime hours shown in week summary
- Warning when approaching overtime threshold
- Breakdown of regular vs overtime hours

**Reports:**
- Overtime report shows all overtime hours
- Filter by employee, date range, or department
- Export for payroll processing

## Integration with Other Modules

### Work Orders

**Track Time on Work Orders:**
1. Open work order
2. Click **Start Timer**
3. Work on the job
4. Click **Stop Timer** when done
5. Time automatically added to work order
6. Time entry linked to work order

**Billable Work Order Time:**
- Work order time marked as billable automatically
- Billing rate from work order or employee settings
- Time included in work order invoice

### Appointments

**Track Time During Appointments:**
1. Start appointment
2. Timer starts automatically
3. Perform service
4. Complete appointment
5. Time recorded and linked to appointment

### Payroll

**Export for Payroll:**
1. Navigate to **Time Tracking** > **Payroll Export**
2. Select pay period
3. Review employee hours
4. Click **Export for Payroll**
5. Choose payroll system format
6. Import into payroll system

**Payroll Integration:**
- Direct integration with popular payroll systems
- Automatic sync of approved time entries
- Includes regular and overtime hours
- Includes billable rates and amounts

## Reporting

### Time Reports

**Available Reports:**
- Employee Time Summary
- Project Time Summary
- Billable Hours Report
- Overtime Report
- Attendance Report
- Time Entry Audit Log
- Productivity Report

**Generating Reports:**
1. Navigate to **Reports** > **Time Tracking**
2. Select report type
3. Choose date range
4. Apply filters (employee, project, etc.)
5. Click **Generate Report**
6. Export to CSV or PDF

### Key Metrics

**Dashboard Metrics:**
- Total hours worked (today, week, month)
- Billable vs non-billable ratio
- Overtime hours
- Average hours per employee
- Project time distribution
- Attendance rate

**Performance Tracking:**
- Employee productivity
- Project profitability
- Billable utilization rate
- Time entry accuracy
- Approval turnaround time

## Configuration

### Module Settings

Access via **Settings** > **Modules** > **Time Tracking**

**General Settings:**
- Enable/disable time tracking module
- Set time entry rounding (none, 15 min, 30 min)
- Require project assignment (yes/no)
- Allow manual time entry (yes/no)
- Require manager approval (yes/no)

**Clock In/Out Settings:**
- Enable geolocation tracking
- Restrict clock in by location
- Enable photo capture on clock in
- Allow early clock in (minutes before shift)
- Allow late clock out (minutes after shift)

**Break Settings:**
- Enable break tracking
- Set automatic break deduction
- Set maximum break time
- Require break for long shifts
- Break reminder notifications

**Overtime Settings:**
- Enable overtime tracking
- Set weekly overtime threshold
- Set daily overtime threshold
- Set overtime multiplier
- Require approval for overtime

**Approval Settings:**
- Require approval for all entries
- Require approval for manual entries
- Require approval for edited entries
- Set approval deadline
- Auto-approve after deadline

### Permissions

Configure user permissions via **Settings** > **Users & Permissions**

**Time Tracking Permissions:**
- `clock_in`: Clock in/out
- `view_own_time`: View own time entries
- `edit_own_time`: Edit own time entries
- `create_manual_entry`: Create manual time entries
- `view_team_time`: View team time entries
- `edit_team_time`: Edit team time entries
- `approve_time`: Approve time entries
- `view_all_time`: View all time entries (admin)
- `manage_time_settings`: Configure time tracking settings

## Troubleshooting

### Cannot Clock In

**Problem**: Clock in button is disabled or error occurs

**Solutions:**
1. Verify time tracking module is enabled
2. Check you have `clock_in` permission
3. Ensure you're not already clocked in
4. Check if geolocation is required and enabled
5. Verify you're within allowed location (if restricted)
6. Check for shift schedule conflicts

### Forgot to Clock Out

**Problem**: Clocked in but forgot to clock out

**Solutions:**
1. Clock out now (system calculates hours)
2. Or create manual time entry with correct times
3. Add note explaining the situation
4. Submit for manager approval
5. Manager can adjust time if needed

### Time Entry Not Showing

**Problem**: Created time entry but not visible

**Solutions:**
1. Refresh the page
2. Check date range filter
3. Check employee filter (if viewing team time)
4. Check approval status filter
5. Verify entry was saved successfully

### Overtime Not Calculating

**Problem**: Overtime hours not showing correctly

**Solutions:**
1. Verify overtime is enabled in settings
2. Check overtime threshold configuration
3. Ensure all time entries are approved
4. Check calculation period (weekly vs daily)
5. Verify employee is eligible for overtime
6. Review overtime calculation rules

### Cannot Edit Time Entry

**Problem**: Edit button is disabled or changes won't save

**Solutions:**
1. Check if entry is already approved (may require unapproval)
2. Verify you have `edit_own_time` or `edit_team_time` permission
3. Check if edit deadline has passed
4. Verify you're editing your own entry (or have team permission)
5. Contact manager to unapprove if needed

## Best Practices

### Daily Habits

1. **Clock in promptly** when starting work
2. **Clock out** when leaving or taking breaks
3. **Review time entries daily** for accuracy
4. **Add notes** to time entries for context
5. **Submit time weekly** for approval

### Project Time Tracking

1. **Always assign time to projects** when applicable
2. **Switch projects** when changing tasks
3. **Mark billable time** accurately
4. **Add detailed notes** for billable work
5. **Review project time** regularly

### Manager Responsibilities

1. **Review time entries promptly** (within 24 hours)
2. **Communicate with employees** about corrections
3. **Approve time before payroll deadline**
4. **Monitor overtime** to control costs
5. **Review time reports** for patterns and issues

### Accuracy

1. **Be honest** with time tracking
2. **Round appropriately** per company policy
3. **Correct errors immediately** when noticed
4. **Don't pad hours** or inflate time
5. **Document unusual situations** in notes

## Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+I`: Clock in
- `Ctrl+O`: Clock out
- `Ctrl+B`: Start break
- `Ctrl+N`: New manual entry
- `Ctrl+F`: Search time entries

### Quick Actions

- **Quick Clock In**: Click clock icon in header
- **Quick Break**: Right-click clock icon > Start Break
- **Quick Project Switch**: Click project name > Switch
- **Quick Export**: Click export icon on any report

### Mobile Features

- Clock in/out from mobile device
- GPS location tracking
- Photo capture on clock in
- Push notifications for reminders
- Offline time tracking (syncs when online)

### Automation

- Set up automatic clock in at shift start
- Configure automatic break deduction
- Enable automatic project assignment by location
- Set up reminder notifications
- Configure automatic time submission

## Related Documentation

- [Work Orders User Guide](./work-orders-invoicing.md) - Tracking time on work orders
- [Appointments Guide](./appointments.md) - Tracking time during appointments
- [Payroll Integration](../integrations/payroll.md) - Exporting time for payroll
- [Admin Configuration Guide](../admin-guides/configuration.md) - Time tracking configuration
- [Reporting Guide](./reporting.md) - Advanced time reports

## Support

For additional help:
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Contact support: support@easysale.com
- Visit documentation: https://docs.easysale.com
- Community forum: https://community.easysale.com

---

*Last updated: 2026-01-30*
*Version: 1.0*

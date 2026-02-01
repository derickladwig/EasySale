/**
 * Time Tracking Domain Types
 * 
 * Type definitions for employee time tracking system
 */

export interface TimeEntry {
  id: number;
  tenant_id: string;
  employee_id: number;
  employee_name?: string;
  clock_in: string; // ISO 8601 datetime
  clock_out?: string; // ISO 8601 datetime
  break_duration_minutes?: number;
  work_order_id?: number;
  project_name?: string;
  task_name?: string;
  notes?: string;
  status: TimeEntryStatus;
  total_hours?: number;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
}

export type TimeEntryStatus = 'clocked_in' | 'clocked_out' | 'on_break';

export interface CreateTimeEntryDto {
  employee_id: number;
  clock_in: string; // ISO 8601 datetime
  work_order_id?: number;
  project_name?: string;
  task_name?: string;
  notes?: string;
  is_billable?: boolean;
}

export interface UpdateTimeEntryDto {
  clock_out?: string;
  break_duration_minutes?: number;
  work_order_id?: number;
  project_name?: string;
  task_name?: string;
  notes?: string;
  is_billable?: boolean;
  status?: TimeEntryStatus;
}

export interface ClockInDto {
  employee_id: number;
  work_order_id?: number;
  project_name?: string;
  task_name?: string;
  notes?: string;
}

export interface TimeTrackingSettings {
  enabled: boolean;
  requireWorkOrder?: boolean;
  allowManualEntry?: boolean;
  trackBreaks?: boolean;
  overtimeThreshold?: number; // hours per week
}

export interface TimeReport {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  overtime_hours: number;
  entries: TimeEntry[];
}

export interface ProjectTimeReport {
  project_name: string;
  total_hours: number;
  billable_hours: number;
  entries: TimeEntry[];
}

export interface TimeReportFilters {
  start_date: string; // ISO 8601 date
  end_date: string; // ISO 8601 date
  employee_id?: number;
  project_name?: string;
  is_billable?: boolean;
}

export interface TimeSummary {
  today_hours: number;
  week_hours: number;
  current_entry?: TimeEntry;
  recent_entries: TimeEntry[];
}

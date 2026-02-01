/**
 * Time Tracking API Client
 * 
 * Provides functions for interacting with time tracking endpoints
 */

import { apiClient } from '../../common/utils/apiClient';
import type {
  TimeEntry,
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  ClockInDto,
  TimeReport,
  ProjectTimeReport,
  TimeReportFilters,
  TimeSummary,
} from './types';

/**
 * Get current time tracking summary for employee
 */
export async function getTimeSummary(employeeId: number): Promise<TimeSummary> {
  return apiClient.get<TimeSummary>(`/api/time-entries/summary/${employeeId}`);
}

/**
 * List time entries with filters
 */
export async function listTimeEntries(filters: TimeReportFilters): Promise<TimeEntry[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', filters.start_date);
  queryParams.append('end_date', filters.end_date);
  if (filters.employee_id) queryParams.append('employee_id', filters.employee_id.toString());
  if (filters.project_name) queryParams.append('project_name', filters.project_name);
  if (filters.is_billable !== undefined) queryParams.append('is_billable', filters.is_billable.toString());
  
  const url = `/api/time-entries?${queryParams.toString()}`;
  return apiClient.get<TimeEntry[]>(url);
}

/**
 * Get time entry by ID
 */
export async function getTimeEntry(id: number): Promise<TimeEntry> {
  return apiClient.get<TimeEntry>(`/api/time-entries/${id}`);
}

/**
 * Clock in (create new time entry)
 */
export async function clockIn(data: ClockInDto): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>('/api/time-entries/clock-in', data);
}

/**
 * Clock out (update existing time entry)
 */
export async function clockOut(id: number): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>(`/api/time-entries/${id}/clock-out`, {});
}

/**
 * Create manual time entry
 */
export async function createTimeEntry(data: CreateTimeEntryDto): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>('/api/time-entries', data);
}

/**
 * Update time entry
 */
export async function updateTimeEntry(id: number, data: UpdateTimeEntryDto): Promise<TimeEntry> {
  return apiClient.put<TimeEntry>(`/api/time-entries/${id}`, data);
}

/**
 * Delete time entry
 */
export async function deleteTimeEntry(id: number): Promise<void> {
  return apiClient.delete(`/api/time-entries/${id}`);
}

/**
 * Get employee time report
 */
export async function getEmployeeTimeReport(filters: TimeReportFilters): Promise<TimeReport[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', filters.start_date);
  queryParams.append('end_date', filters.end_date);
  if (filters.employee_id) queryParams.append('employee_id', filters.employee_id.toString());
  
  const url = `/api/time-entries/reports/employee?${queryParams.toString()}`;
  return apiClient.get<TimeReport[]>(url);
}

/**
 * Get project time report
 */
export async function getProjectTimeReport(filters: TimeReportFilters): Promise<ProjectTimeReport[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', filters.start_date);
  queryParams.append('end_date', filters.end_date);
  if (filters.project_name) queryParams.append('project_name', filters.project_name);
  
  const url = `/api/time-entries/reports/project?${queryParams.toString()}`;
  return apiClient.get<ProjectTimeReport[]>(url);
}

/**
 * Export time report to CSV
 */
export async function exportTimeReport(filters: TimeReportFilters): Promise<Blob> {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', filters.start_date);
  queryParams.append('end_date', filters.end_date);
  if (filters.employee_id) queryParams.append('employee_id', filters.employee_id.toString());
  if (filters.project_name) queryParams.append('project_name', filters.project_name);
  if (filters.is_billable !== undefined) queryParams.append('is_billable', filters.is_billable.toString());
  
  const url = `/api/time-entries/export?${queryParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to export time report');
  return response.blob();
}

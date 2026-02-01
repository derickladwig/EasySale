/**
 * Time Tracking React Query Hooks
 * 
 * Provides hooks for time tracking data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import * as timeTrackingApi from './api';
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
 * Hook to fetch time tracking summary for employee
 */
export function useTimeSummary(employeeId: number): UseQueryResult<TimeSummary, Error> {
  return useQuery({
    queryKey: ['time-summary', employeeId],
    queryFn: () => timeTrackingApi.getTimeSummary(employeeId),
    enabled: !!employeeId && employeeId > 0,
    refetchInterval: 60000, // Refetch every minute to keep current
  });
}

/**
 * Hook to fetch time entries with filters
 */
export function useTimeEntriesQuery(filters: TimeReportFilters): UseQueryResult<TimeEntry[], Error> {
  return useQuery({
    queryKey: ['time-entries', filters],
    queryFn: () => timeTrackingApi.listTimeEntries(filters),
  });
}

/**
 * Hook to fetch single time entry by ID
 */
export function useTimeEntryQuery(id: number): UseQueryResult<TimeEntry, Error> {
  return useQuery({
    queryKey: ['time-entry', id],
    queryFn: () => timeTrackingApi.getTimeEntry(id),
    enabled: !!id && id > 0,
  });
}

/**
 * Hook to clock in
 */
export function useClockInMutation(): UseMutationResult<TimeEntry, Error, ClockInDto> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeTrackingApi.clockIn,
    onSuccess: (data) => {
      // Invalidate time summary and entries list
      queryClient.invalidateQueries({ queryKey: ['time-summary', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/**
 * Hook to clock out
 */
export function useClockOutMutation(): UseMutationResult<TimeEntry, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeTrackingApi.clockOut,
    onSuccess: (data) => {
      // Invalidate time summary and entries list
      queryClient.invalidateQueries({ queryKey: ['time-summary', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-entry', data.id] });
    },
  });
}

/**
 * Hook to create manual time entry
 */
export function useCreateTimeEntryMutation(): UseMutationResult<
  TimeEntry,
  Error,
  CreateTimeEntryDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeTrackingApi.createTimeEntry,
    onSuccess: (data) => {
      // Invalidate time summary and entries list
      queryClient.invalidateQueries({ queryKey: ['time-summary', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/**
 * Hook to update time entry
 */
export function useUpdateTimeEntryMutation(): UseMutationResult<
  TimeEntry,
  Error,
  { id: number; data: UpdateTimeEntryDto }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => timeTrackingApi.updateTimeEntry(id, data),
    onSuccess: (data) => {
      // Invalidate time summary, entries list, and specific entry
      queryClient.invalidateQueries({ queryKey: ['time-summary', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-entry', data.id] });
    },
  });
}

/**
 * Hook to delete time entry
 */
export function useDeleteTimeEntryMutation(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeTrackingApi.deleteTimeEntry,
    onSuccess: () => {
      // Invalidate time summary and entries list
      queryClient.invalidateQueries({ queryKey: ['time-summary'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/**
 * Hook to fetch employee time report
 */
export function useEmployeeTimeReport(
  filters: TimeReportFilters
): UseQueryResult<TimeReport[], Error> {
  return useQuery({
    queryKey: ['time-report-employee', filters],
    queryFn: () => timeTrackingApi.getEmployeeTimeReport(filters),
  });
}

/**
 * Hook to fetch project time report
 */
export function useProjectTimeReport(
  filters: TimeReportFilters
): UseQueryResult<ProjectTimeReport[], Error> {
  return useQuery({
    queryKey: ['time-report-project', filters],
    queryFn: () => timeTrackingApi.getProjectTimeReport(filters),
  });
}

/**
 * Hook to export time report
 */
export function useExportTimeReportMutation(): UseMutationResult<
  Blob,
  Error,
  TimeReportFilters
> {
  return useMutation({
    mutationFn: timeTrackingApi.exportTimeReport,
    onSuccess: (blob, filters) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-report-${filters.start_date}-${filters.end_date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

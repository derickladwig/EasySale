/**
 * Time Tracking Hooks Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import * as timeTrackingApi from '../api';
import {
  useTimeSummary,
  useTimeEntriesQuery,
  useClockInMutation,
  useClockOutMutation,
} from '../hooks';
import type { TimeSummary, TimeEntry, ClockInDto } from '../types';

// Mock the API module
vi.mock('../api');

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Time Tracking Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTimeSummary', () => {
    it('should fetch time summary for employee', async () => {
      const mockSummary: TimeSummary = {
        today_hours: 8,
        week_hours: 40,
        current_entry: undefined,
        recent_entries: [],
      };

      vi.mocked(timeTrackingApi.getTimeSummary).mockResolvedValue(mockSummary);

      const { result } = renderHook(() => useTimeSummary(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSummary);
      expect(timeTrackingApi.getTimeSummary).toHaveBeenCalledWith(1);
    });

    it('should not fetch when employee ID is invalid', () => {
      const { result } = renderHook(() => useTimeSummary(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(timeTrackingApi.getTimeSummary).not.toHaveBeenCalled();
    });
  });

  describe('useTimeEntriesQuery', () => {
    it('should fetch time entries with filters', async () => {
      const mockEntries: TimeEntry[] = [
        {
          id: 1,
          tenant_id: 'test',
          employee_id: 1,
          clock_in: '2024-01-01T09:00:00Z',
          clock_out: '2024-01-01T17:00:00Z',
          status: 'clocked_out',
          is_billable: true,
          total_hours: 8,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T17:00:00Z',
        },
      ];

      vi.mocked(timeTrackingApi.listTimeEntries).mockResolvedValue(mockEntries);

      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        employee_id: 1,
      };

      const { result } = renderHook(() => useTimeEntriesQuery(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEntries);
      expect(timeTrackingApi.listTimeEntries).toHaveBeenCalledWith(filters);
    });
  });

  describe('useClockInMutation', () => {
    it('should clock in employee', async () => {
      const mockEntry: TimeEntry = {
        id: 1,
        tenant_id: 'test',
        employee_id: 1,
        clock_in: '2024-01-01T09:00:00Z',
        status: 'clocked_in',
        is_billable: true,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      vi.mocked(timeTrackingApi.clockIn).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useClockInMutation(), {
        wrapper: createWrapper(),
      });

      const clockInData: ClockInDto = {
        employee_id: 1,
        notes: 'Starting work',
      };

      result.current.mutate(clockInData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEntry);
      // Check that clockIn was called with the data (first argument)
      expect(timeTrackingApi.clockIn).toHaveBeenCalled();
      const callArgs = vi.mocked(timeTrackingApi.clockIn).mock.calls[0];
      expect(callArgs[0]).toEqual(clockInData);
    });
  });

  describe('useClockOutMutation', () => {
    it('should clock out employee', async () => {
      const mockEntry: TimeEntry = {
        id: 1,
        tenant_id: 'test',
        employee_id: 1,
        clock_in: '2024-01-01T09:00:00Z',
        clock_out: '2024-01-01T17:00:00Z',
        status: 'clocked_out',
        is_billable: true,
        total_hours: 8,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T17:00:00Z',
      };

      vi.mocked(timeTrackingApi.clockOut).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useClockOutMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEntry);
      // Check that clockOut was called with the ID (first argument)
      expect(timeTrackingApi.clockOut).toHaveBeenCalled();
      const callArgs = vi.mocked(timeTrackingApi.clockOut).mock.calls[0];
      expect(callArgs[0]).toBe(1);
    });
  });
});

/**
 * Appointment Hooks Unit Tests
 * 
 * Tests for appointment React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import * as appointmentApi from '../api';
import {
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useRescheduleAppointmentMutation,
} from '../hooks';
import type { Appointment } from '../types';

// Mock the API module
vi.mock('../api');

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Appointment Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAppointmentsQuery', () => {
    it('should fetch appointments successfully', async () => {
      const mockAppointments: Appointment[] = [
        {
          id: 1,
          tenant_id: 'test-tenant',
          customer_id: 1,
          customer_name: 'John Doe',
          service_type: 'Consultation',
          start_time: '2026-02-01T10:00:00',
          end_time: '2026-02-01T10:30:00',
          duration_minutes: 30,
          status: 'scheduled',
          created_at: '2026-01-30T12:00:00',
          updated_at: '2026-01-30T12:00:00',
        },
      ];

      vi.mocked(appointmentApi.listAppointments).mockResolvedValue(mockAppointments);

      const { result } = renderHook(
        () => useAppointmentsQuery({
          start_date: '2026-02-01',
          end_date: '2026-02-07',
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAppointments);
      expect(appointmentApi.listAppointments).toHaveBeenCalledWith({
        start_date: '2026-02-01',
        end_date: '2026-02-07',
      });
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch');
      vi.mocked(appointmentApi.listAppointments).mockRejectedValue(error);

      const { result } = renderHook(
        () => useAppointmentsQuery({
          start_date: '2026-02-01',
          end_date: '2026-02-07',
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateAppointmentMutation', () => {
    it('should create appointment successfully', async () => {
      const newAppointment: Appointment = {
        id: 2,
        tenant_id: 'test-tenant',
        customer_id: 2,
        customer_name: 'Jane Smith',
        service_type: 'Repair',
        start_time: '2026-02-02T14:00:00',
        end_time: '2026-02-02T15:00:00',
        duration_minutes: 60,
        status: 'scheduled',
        created_at: '2026-01-30T12:00:00',
        updated_at: '2026-01-30T12:00:00',
      };

      vi.mocked(appointmentApi.createAppointment).mockResolvedValue(newAppointment);

      const { result } = renderHook(() => useCreateAppointmentMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        customer_id: 2,
        service_type: 'Repair',
        start_time: '2026-02-02T14:00:00',
        duration_minutes: 60,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(newAppointment);
    });
  });

  describe('useUpdateAppointmentMutation', () => {
    it('should update appointment successfully', async () => {
      const updatedAppointment: Appointment = {
        id: 1,
        tenant_id: 'test-tenant',
        customer_id: 1,
        customer_name: 'John Doe',
        service_type: 'Consultation',
        start_time: '2026-02-01T11:00:00',
        end_time: '2026-02-01T11:30:00',
        duration_minutes: 30,
        status: 'confirmed',
        created_at: '2026-01-30T12:00:00',
        updated_at: '2026-01-30T13:00:00',
      };

      vi.mocked(appointmentApi.updateAppointment).mockResolvedValue(updatedAppointment);

      const { result } = renderHook(() => useUpdateAppointmentMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 1,
        data: {
          start_time: '2026-02-01T11:00:00',
          status: 'confirmed',
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(updatedAppointment);
    });
  });

  describe('useDeleteAppointmentMutation', () => {
    it('should delete appointment successfully', async () => {
      vi.mocked(appointmentApi.deleteAppointment).mockResolvedValue();

      const { result } = renderHook(() => useDeleteAppointmentMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(appointmentApi.deleteAppointment).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe('useRescheduleAppointmentMutation', () => {
    it('should reschedule appointment successfully', async () => {
      const rescheduledAppointment: Appointment = {
        id: 1,
        tenant_id: 'test-tenant',
        customer_id: 1,
        customer_name: 'John Doe',
        service_type: 'Consultation',
        start_time: '2026-02-03T10:00:00',
        end_time: '2026-02-03T10:30:00',
        duration_minutes: 30,
        status: 'scheduled',
        created_at: '2026-01-30T12:00:00',
        updated_at: '2026-01-30T14:00:00',
      };

      vi.mocked(appointmentApi.rescheduleAppointment).mockResolvedValue(rescheduledAppointment);

      const { result } = renderHook(() => useRescheduleAppointmentMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 1,
        newStartTime: '2026-02-03T10:00:00',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(rescheduledAppointment);
      expect(appointmentApi.rescheduleAppointment).toHaveBeenCalledWith(1, '2026-02-03T10:00:00');
    });
  });
});

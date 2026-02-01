/**
 * Appointment React Query Hooks
 * 
 * Provides hooks for appointment data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import * as appointmentApi from './api';
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto } from './types';

/**
 * Hook to fetch appointments within a date range
 */
export function useAppointmentsQuery(params: {
  start_date: string;
  end_date: string;
  staff_id?: number;
  status?: string;
}): UseQueryResult<Appointment[], Error> {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentApi.listAppointments(params),
  });
}

/**
 * Hook to fetch single appointment by ID
 */
export function useAppointmentQuery(id: number): UseQueryResult<Appointment, Error> {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentApi.getAppointment(id),
    enabled: !!id && id > 0,
  });
}

/**
 * Hook to create appointment
 */
export function useCreateAppointmentMutation(): UseMutationResult<
  Appointment,
  Error,
  CreateAppointmentDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentApi.createAppointment,
    onSuccess: () => {
      // Invalidate appointments list to refetch
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/**
 * Hook to update appointment
 */
export function useUpdateAppointmentMutation(): UseMutationResult<
  Appointment,
  Error,
  { id: number; data: UpdateAppointmentDto }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => appointmentApi.updateAppointment(id, data),
    onSuccess: (data) => {
      // Invalidate appointments list and specific appointment
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
    },
  });
}

/**
 * Hook to delete appointment
 */
export function useDeleteAppointmentMutation(): UseMutationResult<
  void,
  Error,
  number
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentApi.deleteAppointment,
    onSuccess: () => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/**
 * Hook to reschedule appointment
 */
export function useRescheduleAppointmentMutation(): UseMutationResult<
  Appointment,
  Error,
  { id: number; newStartTime: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStartTime }) => appointmentApi.rescheduleAppointment(id, newStartTime),
    onSuccess: (data) => {
      // Invalidate appointments list and specific appointment
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
    },
  });
}

/**
 * Hook to update appointment status
 */
export function useUpdateAppointmentStatusMutation(): UseMutationResult<
  Appointment,
  Error,
  { id: number; status: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => appointmentApi.updateAppointmentStatus(id, status),
    onSuccess: (data) => {
      // Invalidate appointments list and specific appointment
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
    },
  });
}

/**
 * Appointment API Client
 * 
 * Provides functions for interacting with appointment endpoints
 */

import { apiClient } from '../../common/utils/apiClient';
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto } from './types';

/**
 * List appointments within a date range
 */
export async function listAppointments(params: {
  start_date: string; // ISO 8601 date
  end_date: string; // ISO 8601 date
  staff_id?: number;
  status?: string;
}): Promise<Appointment[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', params.start_date);
  queryParams.append('end_date', params.end_date);
  if (params.staff_id) queryParams.append('staff_id', params.staff_id.toString());
  if (params.status) queryParams.append('status', params.status);
  
  const url = `/api/appointments?${queryParams.toString()}`;
  return apiClient.get<Appointment[]>(url);
}

/**
 * Get appointment by ID
 */
export async function getAppointment(id: number): Promise<Appointment> {
  return apiClient.get<Appointment>(`/api/appointments/${id}`);
}

/**
 * Create new appointment
 */
export async function createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
  return apiClient.post<Appointment>('/api/appointments', data);
}

/**
 * Update appointment
 */
export async function updateAppointment(id: number, data: UpdateAppointmentDto): Promise<Appointment> {
  return apiClient.put<Appointment>(`/api/appointments/${id}`, data);
}

/**
 * Delete appointment
 */
export async function deleteAppointment(id: number): Promise<void> {
  return apiClient.delete(`/api/appointments/${id}`);
}

/**
 * Reschedule appointment (convenience method)
 */
export async function rescheduleAppointment(id: number, newStartTime: string): Promise<Appointment> {
  return updateAppointment(id, { start_time: newStartTime });
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
  return updateAppointment(id, { status: status as any });
}

/**
 * Appointment Domain Types
 * 
 * Type definitions for appointment scheduling system
 */

export interface Appointment {
  id: number;
  tenant_id: string;
  customer_id: number;
  customer_name?: string;
  staff_id?: number;
  staff_name?: string;
  service_type: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface CreateAppointmentDto {
  customer_id: number;
  staff_id?: number;
  service_type: string;
  start_time: string; // ISO 8601 datetime
  duration_minutes: number;
  notes?: string;
}

export interface UpdateAppointmentDto {
  customer_id?: number;
  staff_id?: number;
  service_type?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AppointmentSettings {
  slotDuration: number; // minutes
  advanceBookingDays: number;
  workingHours: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  workingDays: number[]; // 0-6, Sunday-Saturday
}

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarSlot {
  dateTime: Date;
  isAvailable: boolean;
  appointments: Appointment[];
}

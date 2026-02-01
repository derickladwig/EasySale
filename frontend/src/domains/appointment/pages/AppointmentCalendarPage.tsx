/**
 * AppointmentCalendarPage Component
 * 
 * Main page for appointment calendar with CRUD operations
 * Uses semantic tokens only - no hardcoded Tailwind base colors
 * Checks module flag before rendering
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from '@common/components/molecules/Toast';
import { useConfig } from '../../../config/ConfigProvider';
import { CalendarHeader } from '../components/CalendarHeader';
import { CalendarGrid } from '../components/CalendarGrid';
import { AppointmentDialog } from '../components/AppointmentDialog';
import {
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useRescheduleAppointmentMutation,
} from '../hooks';
import type { Appointment, CalendarView, CreateAppointmentDto, UpdateAppointmentDto, AppointmentSettings } from '../types';

export function AppointmentCalendarPage() {
  const { isModuleEnabled, getModuleSettings } = useConfig();

  // Check if appointments module is enabled
  if (!isModuleEnabled('appointments')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Get module settings
  const settings = getModuleSettings<AppointmentSettings>('appointments');
  const slotDuration = settings?.slotDuration || 30;

  // Calendar state
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitialDateTime, setDialogInitialDateTime] = useState<string | undefined>();

  // Calculate date range for API query based on view
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      // Get first day of month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      // Get last day of month
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      // Get start of week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      
      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Day view
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  }, [currentDate, view]);

  // Fetch appointments
  const { data: appointments = [], isLoading, error } = useAppointmentsQuery(dateRange);

  // Mutations
  const createMutation = useCreateAppointmentMutation();
  const updateMutation = useUpdateAppointmentMutation();
  const deleteMutation = useDeleteAppointmentMutation();
  const rescheduleMutation = useRescheduleAppointmentMutation();

  // Handlers
  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setDialogInitialDateTime(undefined);
    setIsDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogInitialDateTime(undefined);
    setIsDialogOpen(true);
  };

  const handleReschedule = async (appointmentId: number, newStartTime: string) => {
    try {
      await rescheduleMutation.mutateAsync({ id: appointmentId, newStartTime });
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      toast.error('Failed to reschedule appointment. Please try again.');
    }
  };

  const handleDialogSubmit = async (data: CreateAppointmentDto | UpdateAppointmentDto) => {
    if (selectedAppointment) {
      // Update existing appointment
      await updateMutation.mutateAsync({
        id: selectedAppointment.id,
        data: data as UpdateAppointmentDto,
      });
    } else {
      // Create new appointment
      await createMutation.mutateAsync(data as CreateAppointmentDto);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAppointment(null);
    setDialogInitialDateTime(undefined);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Calendar Header */}
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setCurrentDate}
        onCreateAppointment={handleCreateAppointment}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-text-secondary">Loading appointments...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <div className="text-error-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Failed to Load Appointments</h3>
            <p className="text-sm text-text-secondary">
              {error instanceof Error ? error.message : 'An error occurred while loading appointments.'}
            </p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && !error && (
        <CalendarGrid
          view={view}
          currentDate={currentDate}
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          onReschedule={handleReschedule}
          slotDuration={slotDuration}
        />
      )}

      {/* Appointment Dialog */}
      <AppointmentDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSubmit={handleDialogSubmit}
        appointment={selectedAppointment || undefined}
        initialDateTime={dialogInitialDateTime}
      />
    </div>
  );
}

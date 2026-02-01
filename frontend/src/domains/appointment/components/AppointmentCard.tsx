/**
 * AppointmentCard Component
 * 
 * Displays appointment information in calendar
 * Uses semantic tokens only - no hardcoded Tailwind base colors
 */

import { Clock, User } from 'lucide-react';
import type { Appointment } from '../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  isDragging?: boolean;
}

export function AppointmentCard({ appointment, onClick, isDragging = false }: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-info-100 border-info-500 text-info-700';
      case 'confirmed':
        return 'bg-success-100 border-success-500 text-success-700';
      case 'in_progress':
        return 'bg-warning-100 border-warning-500 text-warning-700';
      case 'completed':
        return 'bg-success-200 border-success-600 text-success-800';
      case 'cancelled':
        return 'bg-error-100 border-error-500 text-error-700';
      case 'no_show':
        return 'bg-error-50 border-error-400 text-error-600';
      default:
        return 'bg-surface-elevated border-border-default text-text-primary';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-2 rounded-md border-l-4 transition-all
        ${getStatusColor(appointment.status)}
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer hover:shadow-md'}
      `}
      data-appointment-id={appointment.id}
    >
      <div className="flex flex-col gap-1">
        {/* Time */}
        <div className="flex items-center gap-1 text-xs font-medium">
          <Clock className="w-3 h-3" />
          <span>{formatTime(appointment.start_time)}</span>
        </div>

        {/* Customer Name */}
        <div className="font-semibold text-sm truncate">
          {appointment.customer_name || `Customer #${appointment.customer_id}`}
        </div>

        {/* Service Type */}
        <div className="text-xs truncate">
          {appointment.service_type}
        </div>

        {/* Staff (if assigned) */}
        {appointment.staff_name && (
          <div className="flex items-center gap-1 text-xs">
            <User className="w-3 h-3" />
            <span className="truncate">{appointment.staff_name}</span>
          </div>
        )}

        {/* Duration */}
        <div className="text-xs opacity-75">
          {appointment.duration_minutes} min
        </div>
      </div>
    </button>
  );
}

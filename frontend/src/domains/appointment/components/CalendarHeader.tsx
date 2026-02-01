/**
 * CalendarHeader Component
 * 
 * Header for calendar with view selector and date navigation
 * Uses semantic tokens only - no hardcoded Tailwind base colors
 */

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { CalendarView } from '../types';

interface CalendarHeaderProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onCreateAppointment: () => void;
}

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  onCreateAppointment,
}: CalendarHeaderProps) {
  const formatHeaderDate = () => {
    const options: Intl.DateTimeFormatOptions = 
      view === 'month' 
        ? { month: 'long', year: 'numeric' }
        : view === 'week'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface">
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={navigatePrevious}
          className="p-2 rounded-md hover:bg-surface-elevated text-text-primary transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={goToToday}
          className="px-4 py-2 rounded-md hover:bg-surface-elevated text-text-primary font-medium transition-colors"
        >
          Today
        </button>
        
        <button
          onClick={navigateNext}
          className="p-2 rounded-md hover:bg-surface-elevated text-text-primary transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <h2 className="ml-4 text-xl font-semibold text-text-primary">
          {formatHeaderDate()}
        </h2>
      </div>

      {/* View Selector and Create Button */}
      <div className="flex items-center gap-4">
        {/* View Selector */}
        <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg">
          <button
            onClick={() => onViewChange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'month'
                ? 'bg-primary text-text-on-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'week'
                ? 'bg-primary text-text-on-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('day')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'day'
                ? 'bg-primary text-text-on-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
            }`}
          >
            Day
          </button>
        </div>

        {/* Create Appointment Button */}
        <button
          onClick={onCreateAppointment}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-text-on-primary rounded-md hover:bg-primary-hover font-medium transition-colors"
        >
          <CalendarIcon className="w-5 h-5" />
          New Appointment
        </button>
      </div>
    </div>
  );
}

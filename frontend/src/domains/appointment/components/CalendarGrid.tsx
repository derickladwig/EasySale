/**
 * CalendarGrid Component
 * 
 * Main calendar grid with month/week/day views
 * Supports drag-and-drop rescheduling
 * Uses semantic tokens only - no hardcoded Tailwind base colors
 */

import { useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment, CalendarView } from '../types';

interface CalendarGridProps {
  view: CalendarView;
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onReschedule: (appointmentId: number, newStartTime: string) => void;
  slotDuration: number; // minutes
}

export function CalendarGrid({
  view,
  currentDate,
  appointments,
  onAppointmentClick,
  onReschedule,
  slotDuration,
}: CalendarGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const appointmentId = Number(active.id);
      const newDateTime = over.data.current?.dateTime as string;
      
      if (newDateTime) {
        onReschedule(appointmentId, newDateTime);
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-auto bg-surface">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            slotDuration={slotDuration}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            slotDuration={slotDuration}
          />
        )}
      </div>
    </DndContext>
  );
}

// Draggable Appointment Wrapper
function DraggableAppointment({
  appointment,
  onAppointmentClick,
}: {
  appointment: Appointment;
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: {
      appointment,
    },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <AppointmentCard
        appointment={appointment}
        onClick={() => onAppointmentClick(appointment)}
        isDragging={isDragging}
      />
    </div>
  );
}

// Droppable Time Slot Wrapper
function DroppableSlot({
  dateTime,
  children,
  className = '',
}: {
  dateTime: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dateTime}`,
    data: {
      dateTime,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
      data-date-time={dateTime}
    >
      {children}
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  appointments,
  onAppointmentClick,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Calculate days to show from previous month
    const daysFromPrevMonth = startingDayOfWeek;
    
    // Calculate days to show from next month
    const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
    const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);
    
    const days: Date[] = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month days
    for (let i = 1; i <= daysFromNextMonth; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [currentDate]);

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return (
        aptDate.getFullYear() === date.getFullYear() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-default bg-surface-elevated">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-text-primary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {monthData.map((date, index) => {
          const dayAppointments = getAppointmentsForDay(date);
          const isTodayDate = isToday(date);
          const isCurrentMonthDate = isCurrentMonth(date);

          return (
            <div
              key={index}
              className={`
                border-r border-b border-border-default p-2 min-h-[100px]
                ${!isCurrentMonthDate ? 'bg-surface-elevated opacity-50' : 'bg-surface'}
              `}
            >
              <div
                className={`
                  text-sm font-medium mb-2
                  ${isTodayDate 
                    ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-text-on-primary' 
                    : isCurrentMonthDate 
                    ? 'text-text-primary' 
                    : 'text-text-secondary'
                  }
                `}
              >
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(apt => (
                  <DraggableAppointment
                    key={apt.id}
                    appointment={apt}
                    onAppointmentClick={onAppointmentClick}
                  />
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-text-secondary text-center py-1">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  appointments,
  onAppointmentClick,
  slotDuration,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  slotDuration: number;
}) {
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, [slotDuration]);

  const getAppointmentsForDayAndTime = (date: Date, timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return (
        aptDate.getFullYear() === date.getFullYear() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getDate() === date.getDate() &&
        aptDate.getHours() === hour &&
        aptDate.getMinutes() === minute
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border-default bg-surface-elevated sticky top-0 z-10">
        <div className="p-2 border-r border-border-default" /> {/* Time column header */}
        {weekDays.map((day, index) => (
          <div key={index} className="p-2 text-center border-r border-border-default">
            <div className="text-xs text-text-secondary">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-lg font-semibold text-text-primary">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="flex-1 overflow-auto">
        {timeSlots.map((timeSlot, slotIndex) => (
          <div key={slotIndex} className="grid grid-cols-8 border-b border-border-default min-h-[60px]">
            {/* Time label */}
            <div className="p-2 text-xs text-text-secondary border-r border-border-default bg-surface-elevated">
              {timeSlot}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const slotAppointments = getAppointmentsForDayAndTime(day, timeSlot);
              const dateTime = `${day.toISOString().split('T')[0]}T${timeSlot}:00`;
              
              return (
                <DroppableSlot
                  key={dayIndex}
                  dateTime={dateTime}
                  className="p-1 border-r border-border-default hover:bg-surface-elevated transition-colors"
                >
                  {slotAppointments.map(apt => (
                    <DraggableAppointment
                      key={apt.id}
                      appointment={apt}
                      onAppointmentClick={onAppointmentClick}
                    />
                  ))}
                </DroppableSlot>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  currentDate,
  appointments,
  onAppointmentClick,
  slotDuration,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  slotDuration: number;
}) {
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, [slotDuration]);

  const getAppointmentsForTime = (timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return (
        aptDate.getFullYear() === currentDate.getFullYear() &&
        aptDate.getMonth() === currentDate.getMonth() &&
        aptDate.getDate() === currentDate.getDate() &&
        aptDate.getHours() === hour &&
        aptDate.getMinutes() === minute
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className="p-4 border-b border-border-default bg-surface-elevated">
        <div className="text-sm text-text-secondary">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div className="text-2xl font-semibold text-text-primary">
          {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-auto">
        {timeSlots.map((timeSlot, index) => {
          const slotAppointments = getAppointmentsForTime(timeSlot);
          
          return (
            <div
              key={index}
              className="flex border-b border-border-default min-h-[80px] hover:bg-surface-elevated transition-colors"
            >
              {/* Time label */}
              <div className="w-24 p-4 text-sm text-text-secondary border-r border-border-default bg-surface-elevated">
                {timeSlot}
              </div>

              {/* Appointment slot */}
              <DroppableSlot
                dateTime={`${currentDate.toISOString().split('T')[0]}T${timeSlot}:00`}
                className="flex-1 p-2"
              >
                <div className="space-y-2">
                  {slotAppointments.map(apt => (
                    <DraggableAppointment
                      key={apt.id}
                      appointment={apt}
                      onAppointmentClick={onAppointmentClick}
                    />
                  ))}
                </div>
              </DroppableSlot>
            </div>
          );
        })}
      </div>
    </div>
  );
}

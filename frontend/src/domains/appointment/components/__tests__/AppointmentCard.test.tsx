/**
 * AppointmentCard Component Unit Tests
 * 
 * Tests for appointment card display
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentCard } from '../AppointmentCard';
import type { Appointment } from '../../types';

describe('AppointmentCard', () => {
  const mockAppointment: Appointment = {
    id: 1,
    tenant_id: 'test-tenant',
    customer_id: 1,
    customer_name: 'John Doe',
    staff_id: 1,
    staff_name: 'Dr. Smith',
    service_type: 'Consultation',
    start_time: '2026-02-01T10:00:00',
    end_time: '2026-02-01T10:30:00',
    duration_minutes: 30,
    status: 'scheduled',
    notes: 'First visit',
    created_at: '2026-01-30T12:00:00',
    updated_at: '2026-01-30T12:00:00',
  };

  it('should render appointment details', () => {
    const onClick = vi.fn();

    render(<AppointmentCard appointment={mockAppointment} onClick={onClick} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();

    render(<AppointmentCard appointment={mockAppointment} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should display customer ID when name is not available', () => {
    const appointmentWithoutName = {
      ...mockAppointment,
      customer_name: undefined,
    };

    const onClick = vi.fn();

    render(<AppointmentCard appointment={appointmentWithoutName} onClick={onClick} />);

    expect(screen.getByText('Customer #1')).toBeInTheDocument();
  });

  it('should apply dragging styles when isDragging is true', () => {
    const onClick = vi.fn();

    render(<AppointmentCard appointment={mockAppointment} onClick={onClick} isDragging={true} />);

    const card = screen.getByRole('button');
    expect(card).toHaveClass('opacity-50');
    expect(card).toHaveClass('cursor-grabbing');
  });

  it('should apply correct status colors', () => {
    const onClick = vi.fn();

    const statuses: Array<Appointment['status']> = [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];

    statuses.forEach(status => {
      const { container } = render(
        <AppointmentCard
          appointment={{ ...mockAppointment, status }}
          onClick={onClick}
        />
      );

      const card = container.querySelector('button');
      expect(card).toBeInTheDocument();
      
      // Each status should have different color classes
      if (status === 'scheduled') {
        expect(card).toHaveClass('bg-info-100');
      } else if (status === 'confirmed') {
        expect(card).toHaveClass('bg-success-100');
      } else if (status === 'in_progress') {
        expect(card).toHaveClass('bg-warning-100');
      } else if (status === 'completed') {
        expect(card).toHaveClass('bg-success-200');
      } else if (status === 'cancelled') {
        expect(card).toHaveClass('bg-error-100');
      } else if (status === 'no_show') {
        expect(card).toHaveClass('bg-error-50');
      }
    });
  });

  it('should not display staff when not assigned', () => {
    const appointmentWithoutStaff = {
      ...mockAppointment,
      staff_id: undefined,
      staff_name: undefined,
    };

    const onClick = vi.fn();

    render(<AppointmentCard appointment={appointmentWithoutStaff} onClick={onClick} />);

    expect(screen.queryByText('Dr. Smith')).not.toBeInTheDocument();
  });
});

/**
 * AppointmentDialog Component
 * 
 * Dialog for creating and editing appointments
 * Uses semantic tokens only - no hardcoded Tailwind base colors
 */

import { useState, useEffect } from 'react';
import { Modal } from '../../../common/components/organisms/Modal';
import { Button } from '../../../common/components/atoms/Button';
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto, AppointmentStatus } from '../types';

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAppointmentDto | UpdateAppointmentDto) => Promise<void>;
  appointment?: Appointment; // If provided, dialog is in edit mode
  initialDateTime?: string; // For creating appointment at specific time
}

export function AppointmentDialog({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  initialDateTime,
}: AppointmentDialogProps) {
  const isEditMode = !!appointment;

  // Form state
  const [formData, setFormData] = useState({
    customer_id: appointment?.customer_id || 0,
    customer_name: appointment?.customer_name || '',
    staff_id: appointment?.staff_id || undefined,
    service_type: appointment?.service_type || '',
    start_time: appointment?.start_time || initialDateTime || '',
    duration_minutes: appointment?.duration_minutes || 30,
    status: appointment?.status || 'scheduled' as AppointmentStatus,
    notes: appointment?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or appointment changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_id: appointment?.customer_id || 0,
        customer_name: appointment?.customer_name || '',
        staff_id: appointment?.staff_id || undefined,
        service_type: appointment?.service_type || '',
        start_time: appointment?.start_time || initialDateTime || '',
        duration_minutes: appointment?.duration_minutes || 30,
        status: appointment?.status || 'scheduled',
        notes: appointment?.notes || '',
      });
      setErrors({});
    }
  }, [isOpen, appointment, initialDateTime]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }

    if (!formData.service_type.trim()) {
      newErrors.service_type = 'Service type is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Edit mode - send update data
        const updateData: UpdateAppointmentDto = {
          customer_id: formData.customer_id || undefined,
          staff_id: formData.staff_id,
          service_type: formData.service_type,
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        await onSubmit(updateData);
      } else {
        // Create mode - send create data
        const createData: CreateAppointmentDto = {
          customer_id: formData.customer_id,
          staff_id: formData.staff_id,
          service_type: formData.service_type,
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          notes: formData.notes || undefined,
        };
        await onSubmit(createData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      setErrors({ submit: 'Failed to save appointment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Appointment' : 'New Appointment'}
      size="lg"
      closeOnBackdropClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footer={
        <div className="flex items-center gap-3 w-full justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Name */}
        <div>
          <label htmlFor="customer_name" className="block text-sm font-medium text-text-primary mb-1">
            Customer Name *
          </label>
          <input
            id="customer_name"
            type="text"
            value={formData.customer_name}
            onChange={(e) => handleChange('customer_name', e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border
              ${errors.customer_name ? 'border-error-500' : 'border-border-default'}
              bg-surface text-text-primary
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            `}
            placeholder="Enter customer name"
            disabled={isSubmitting}
          />
          {errors.customer_name && (
            <p className="mt-1 text-sm text-error-600">{errors.customer_name}</p>
          )}
        </div>

        {/* Service Type */}
        <div>
          <label htmlFor="service_type" className="block text-sm font-medium text-text-primary mb-1">
            Service Type *
          </label>
          <input
            id="service_type"
            type="text"
            value={formData.service_type}
            onChange={(e) => handleChange('service_type', e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border
              ${errors.service_type ? 'border-error-500' : 'border-border-default'}
              bg-surface text-text-primary
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            `}
            placeholder="e.g., Consultation, Repair, Installation"
            disabled={isSubmitting}
          />
          {errors.service_type && (
            <p className="mt-1 text-sm text-error-600">{errors.service_type}</p>
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-text-primary mb-1">
              Date & Time *
            </label>
            <input
              id="start_time"
              type="datetime-local"
              value={formData.start_time ? formData.start_time.slice(0, 16) : ''}
              onChange={(e) => handleChange('start_time', e.target.value ? `${e.target.value}:00` : '')}
              className={`
                w-full px-3 py-2 rounded-md border
                ${errors.start_time ? 'border-error-500' : 'border-border-default'}
                bg-surface text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              `}
              disabled={isSubmitting}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-error-600">{errors.start_time}</p>
            )}
          </div>

          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-text-primary mb-1">
              Duration (minutes) *
            </label>
            <input
              id="duration_minutes"
              type="number"
              min="15"
              step="15"
              value={formData.duration_minutes}
              onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
              className={`
                w-full px-3 py-2 rounded-md border
                ${errors.duration_minutes ? 'border-error-500' : 'border-border-default'}
                bg-surface text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              `}
              disabled={isSubmitting}
            />
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-error-600">{errors.duration_minutes}</p>
            )}
          </div>
        </div>

        {/* Status (only in edit mode) */}
        {isEditMode && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as AppointmentStatus)}
              className="w-full px-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Additional notes or special instructions"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 rounded-md bg-error-100 border border-error-500">
            <p className="text-sm text-error-700">{errors.submit}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}

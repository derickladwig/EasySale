/**
 * ManualTimeEntryForm Component
 * 
 * Form for creating manual time entries
 */

import { useState } from 'react';
import { useCreateTimeEntryMutation } from '../hooks';

interface ManualTimeEntryFormProps {
  employeeId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ManualTimeEntryForm({ employeeId, onSuccess, onCancel }: ManualTimeEntryFormProps) {
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [projectName, setProjectName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [notes, setNotes] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [breakDuration, setBreakDuration] = useState('0');

  const createMutation = useCreateTimeEntryMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clockIn) {
      return;
    }

    try {
      // Calculate clock_out time if provided
      let clockOutTime: string | undefined;
      if (clockOut) {
        clockOutTime = clockOut;
      }

      await createMutation.mutateAsync({
        employee_id: employeeId,
        clock_in: clockIn,
        project_name: projectName || undefined,
        task_name: taskName || undefined,
        notes: notes || undefined,
        is_billable: isBillable,
      });

      // Reset form
      setClockIn('');
      setClockOut('');
      setProjectName('');
      setTaskName('');
      setNotes('');
      setIsBillable(true);
      setBreakDuration('0');

      onSuccess?.();
    } catch (error) {
      console.error('Failed to create time entry:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="clock-in" className="block text-sm font-medium text-primary">
            Clock In <span className="text-error-600">*</span>
          </label>
          <input
            type="datetime-local"
            id="clock-in"
            required
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="clock-out" className="block text-sm font-medium text-primary">
            Clock Out
          </label>
          <input
            type="datetime-local"
            id="clock-out"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-name" className="block text-sm font-medium text-primary">
            Project Name
          </label>
          <input
            type="text"
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            placeholder="Enter project name"
          />
        </div>

        <div>
          <label htmlFor="task-name" className="block text-sm font-medium text-primary">
            Task Name
          </label>
          <input
            type="text"
            id="task-name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            placeholder="Enter task name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="break-duration" className="block text-sm font-medium text-primary">
          Break Duration (minutes)
        </label>
        <input
          type="number"
          id="break-duration"
          min="0"
          value={breakDuration}
          onChange={(e) => setBreakDuration(e.target.value)}
          className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-primary">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
          placeholder="Add any notes about this time entry"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is-billable"
          checked={isBillable}
          onChange={(e) => setIsBillable(e.target.checked)}
          className="h-4 w-4 rounded border-default text-accent-600 focus:ring-accent-500"
        />
        <label htmlFor="is-billable" className="ml-2 block text-sm text-primary">
          Billable
        </label>
      </div>

      {createMutation.isError && (
        <div className="rounded-md bg-error-50 p-4">
          <p className="text-sm text-error-800">
            {createMutation.error?.message || 'Failed to create time entry'}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-default bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}

/**
 * ClockInOutButton Component
 * 
 * Button for clocking in and out of time tracking
 */

import { useState } from 'react';
import { useClockInMutation, useClockOutMutation } from '../hooks';
import type { TimeEntry } from '../types';

interface ClockInOutButtonProps {
  employeeId: number;
  currentEntry?: TimeEntry;
  onSuccess?: () => void;
}

export function ClockInOutButton({ employeeId, currentEntry, onSuccess }: ClockInOutButtonProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [projectName, setProjectName] = useState('');
  const [taskName, setTaskName] = useState('');

  const clockInMutation = useClockInMutation();
  const clockOutMutation = useClockOutMutation();

  const isClockedIn = currentEntry?.status === 'clocked_in';
  const isLoading = clockInMutation.isPending || clockOutMutation.isPending;

  const handleClockIn = async () => {
    try {
      await clockInMutation.mutateAsync({
        employee_id: employeeId,
        notes: notes || undefined,
        project_name: projectName || undefined,
        task_name: taskName || undefined,
      });
      
      // Reset form
      setNotes('');
      setProjectName('');
      setTaskName('');
      setShowNotes(false);
      
      onSuccess?.();
    } catch (error) {
      console.error('Failed to clock in:', error);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;
    
    try {
      await clockOutMutation.mutateAsync(currentEntry.id);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to clock out:', error);
    }
  };

  if (isClockedIn) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-success-200 bg-success-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success-800">Currently Clocked In</p>
              <p className="text-xs text-success-600">
                Since {new Date(currentEntry.clock_in).toLocaleTimeString()}
              </p>
              {currentEntry.project_name && (
                <p className="text-xs text-success-600 mt-1">
                  Project: {currentEntry.project_name}
                </p>
              )}
            </div>
            <button
              onClick={handleClockOut}
              disabled={isLoading}
              className="rounded-md bg-error-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-error-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showNotes && (
        <div className="rounded-lg border border-default bg-surface p-4 space-y-3">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-primary">
              Project Name (Optional)
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
              Task Name (Optional)
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
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-primary">
              Notes (Optional)
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
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleClockIn}
          disabled={isLoading}
          className="flex-1 rounded-md bg-success-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-success-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Clocking In...' : 'Clock In'}
        </button>
        
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="rounded-md border border-default bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          {showNotes ? 'Hide Details' : 'Add Details'}
        </button>
      </div>

      {(clockInMutation.isError || clockOutMutation.isError) && (
        <div className="rounded-md bg-error-50 p-4">
          <p className="text-sm text-error-800">
            {clockInMutation.error?.message || clockOutMutation.error?.message || 'An error occurred'}
          </p>
        </div>
      )}
    </div>
  );
}

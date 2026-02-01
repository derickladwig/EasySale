/**
 * TimeEntryList Component
 * 
 * List of time entries with filtering and editing capabilities
 */

import { useState } from 'react';
import { useTimeEntriesQuery, useDeleteTimeEntryMutation } from '../hooks';
import type { TimeReportFilters, TimeEntry } from '../types';
import { ManualTimeEntryForm } from './ManualTimeEntryForm';

interface TimeEntryListProps {
  employeeId?: number;
  initialFilters?: Partial<TimeReportFilters>;
}

export function TimeEntryList({ employeeId, initialFilters }: TimeEntryListProps) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [filters, setFilters] = useState<TimeReportFilters>({
    start_date: initialFilters?.start_date || weekAgo.toISOString().split('T')[0],
    end_date: initialFilters?.end_date || today.toISOString().split('T')[0],
    employee_id: employeeId || initialFilters?.employee_id,
    project_name: initialFilters?.project_name,
    is_billable: initialFilters?.is_billable,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const { data: entries, isLoading, error, refetch } = useTimeEntriesQuery(filters);
  const deleteMutation = useDeleteTimeEntryMutation();

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error('Failed to delete time entry:', error);
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 rounded-lg bg-surface-elevated"></div>
        <div className="h-64 rounded-lg bg-surface-elevated"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-error-50 p-4">
        <p className="text-sm text-error-800">
          Failed to load time entries: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-default bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-primary">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-primary">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="project-filter" className="block text-sm font-medium text-primary">
              Project
            </label>
            <input
              type="text"
              id="project-filter"
              value={filters.project_name || ''}
              onChange={(e) => setFilters({ ...filters, project_name: e.target.value || undefined })}
              placeholder="Filter by project"
              className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="billable-filter"
                checked={filters.is_billable === undefined}
                onChange={() => setFilters({ ...filters, is_billable: undefined })}
                className="h-4 w-4 border-default text-accent-600 focus:ring-accent-500"
              />
              <span className="ml-2 text-sm text-primary">All</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="billable-filter"
                checked={filters.is_billable === true}
                onChange={() => setFilters({ ...filters, is_billable: true })}
                className="h-4 w-4 border-default text-accent-600 focus:ring-accent-500"
              />
              <span className="ml-2 text-sm text-primary">Billable</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="billable-filter"
                checked={filters.is_billable === false}
                onChange={() => setFilters({ ...filters, is_billable: false })}
                className="h-4 w-4 border-default text-accent-600 focus:ring-accent-500"
              />
              <span className="ml-2 text-sm text-primary">Non-Billable</span>
            </label>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            {showAddForm ? 'Cancel' : 'Add Manual Entry'}
          </button>
        </div>
      </div>

      {/* Add Manual Entry Form */}
      {showAddForm && employeeId && (
        <div className="rounded-lg border border-default bg-surface p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Add Manual Time Entry</h3>
          <ManualTimeEntryForm
            employeeId={employeeId}
            onSuccess={() => {
              setShowAddForm(false);
              refetch();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Time Entries List */}
      <div className="rounded-lg border border-default bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default">
          <h3 className="text-lg font-semibold text-primary">
            Time Entries ({entries?.length || 0})
          </h3>
        </div>

        {entries && entries.length > 0 ? (
          <div className="divide-y divide-default">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-surface-elevated">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary">
                        {formatDateTime(entry.clock_in)}
                      </p>
                      {entry.is_billable && (
                        <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-800">
                          Billable
                        </span>
                      )}
                      {entry.status === 'clocked_in' && (
                        <span className="inline-flex items-center rounded-full bg-info-100 px-2 py-0.5 text-xs font-medium text-info-800">
                          In Progress
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-secondary mt-1">
                      {entry.clock_out
                        ? `Ended: ${formatDateTime(entry.clock_out)}`
                        : 'Currently clocked in'}
                    </p>

                    {entry.project_name && (
                      <p className="text-xs text-secondary mt-1">
                        Project: {entry.project_name}
                        {entry.task_name && ` - ${entry.task_name}`}
                      </p>
                    )}

                    {entry.notes && (
                      <p className="text-xs text-secondary mt-2 italic">{entry.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-primary">
                        {entry.total_hours ? formatHours(entry.total_hours) : '-'}
                      </p>
                      {entry.break_duration_minutes && entry.break_duration_minutes > 0 && (
                        <p className="text-xs text-secondary">
                          Break: {entry.break_duration_minutes}m
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md p-2 text-error-600 hover:bg-error-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-600 disabled:opacity-50"
                        title="Delete entry"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-primary">No time entries</h3>
            <p className="mt-1 text-sm text-secondary">
              No time entries found for the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

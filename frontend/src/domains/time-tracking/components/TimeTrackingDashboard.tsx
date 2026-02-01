/**
 * TimeTrackingDashboard Component
 * 
 * Dashboard showing current time tracking status and summary
 */

import { useTimeSummary } from '../hooks';
import { ClockInOutButton } from './ClockInOutButton';

interface TimeTrackingDashboardProps {
  employeeId: number;
}

export function TimeTrackingDashboard({ employeeId }: TimeTrackingDashboardProps) {
  const { data: summary, isLoading, error, refetch } = useTimeSummary(employeeId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-lg bg-surface-elevated"></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-24 rounded-lg bg-surface-elevated"></div>
          <div className="h-24 rounded-lg bg-surface-elevated"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-error-50 p-4">
        <p className="text-sm text-error-800">
          Failed to load time tracking summary: {error.message}
        </p>
      </div>
    );
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Clock In/Out Section */}
      <div className="rounded-lg border border-default bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Time Clock</h2>
        <ClockInOutButton
          employeeId={employeeId}
          currentEntry={summary?.current_entry}
          onSuccess={() => refetch()}
        />
      </div>

      {/* Hours Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-default bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary">Today's Hours</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {formatHours(summary?.today_hours || 0)}
              </p>
            </div>
            <div className="rounded-full bg-accent-100 p-3">
              <svg
                className="h-6 w-6 text-accent-600"
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
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-default bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary">This Week</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {formatHours(summary?.week_hours || 0)}
              </p>
            </div>
            <div className="rounded-full bg-info-100 p-3">
              <svg
                className="h-6 w-6 text-info-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      {summary?.recent_entries && summary.recent_entries.length > 0 && (
        <div className="rounded-lg border border-default bg-surface p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Recent Entries</h3>
          <div className="space-y-3">
            {summary.recent_entries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-default pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">
                    {new Date(entry.clock_in).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-secondary">
                    {new Date(entry.clock_in).toLocaleTimeString()} -{' '}
                    {entry.clock_out
                      ? new Date(entry.clock_out).toLocaleTimeString()
                      : 'In Progress'}
                  </p>
                  {entry.project_name && (
                    <p className="text-xs text-secondary mt-1">
                      Project: {entry.project_name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {entry.total_hours ? formatHours(entry.total_hours) : '-'}
                  </p>
                  {entry.is_billable && (
                    <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-800">
                      Billable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

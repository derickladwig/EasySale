/**
 * TimeReports Component
 * 
 * Time tracking reports with employee and project summaries
 */

import { useState } from 'react';
import {
  useEmployeeTimeReport,
  useProjectTimeReport,
  useExportTimeReportMutation,
} from '../hooks';
import type { TimeReportFilters } from '../types';

type ReportType = 'employee' | 'project';

export function TimeReports() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [reportType, setReportType] = useState<ReportType>('employee');
  const [filters, setFilters] = useState<TimeReportFilters>({
    start_date: monthAgo.toISOString().split('T')[0],
    end_date: today.toISOString().split('T')[0],
  });

  const employeeReport = useEmployeeTimeReport(filters);
  const projectReport = useProjectTimeReport(filters);
  const exportMutation = useExportTimeReportMutation();

  const currentReport = reportType === 'employee' ? employeeReport : projectReport;

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="rounded-lg border border-default bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium text-primary">
              Report Type
            </label>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="mt-1 block w-full rounded-md border-default bg-surface px-3 py-2 text-primary shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:text-sm"
            >
              <option value="employee">Employee Summary</option>
              <option value="project">Project Summary</option>
            </select>
          </div>

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
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      {/* Report Content */}
      {currentReport.isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-surface-elevated"></div>
        </div>
      ) : currentReport.isError ? (
        <div className="rounded-md bg-error-50 p-4">
          <p className="text-sm text-error-800">
            Failed to load report: {currentReport.error?.message}
          </p>
        </div>
      ) : reportType === 'employee' ? (
        <EmployeeReportView data={employeeReport.data || []} formatHours={formatHours} />
      ) : (
        <ProjectReportView data={projectReport.data || []} formatHours={formatHours} />
      )}
    </div>
  );
}

interface EmployeeReportViewProps {
  data: Array<{
    employee_id: number;
    employee_name: string;
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
    overtime_hours: number;
  }>;
  formatHours: (hours: number) => string;
}

function EmployeeReportView({ data, formatHours }: EmployeeReportViewProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-default bg-surface p-12 text-center">
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
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-primary">No data available</h3>
        <p className="mt-1 text-sm text-secondary">
          No time entries found for the selected date range.
        </p>
      </div>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      total_hours: acc.total_hours + row.total_hours,
      billable_hours: acc.billable_hours + row.billable_hours,
      non_billable_hours: acc.non_billable_hours + row.non_billable_hours,
      overtime_hours: acc.overtime_hours + row.overtime_hours,
    }),
    { total_hours: 0, billable_hours: 0, non_billable_hours: 0, overtime_hours: 0 }
  );

  return (
    <div className="rounded-lg border border-default bg-surface overflow-hidden">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-semibold text-primary">Employee Time Summary</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-default">
          <thead className="bg-surface-elevated">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Billable
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Non-Billable
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Overtime
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {data.map((row) => (
              <tr key={row.employee_id} className="hover:bg-surface-elevated">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                  {row.employee_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary text-right">
                  {formatHours(row.total_hours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-success-600 text-right">
                  {formatHours(row.billable_hours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary text-right">
                  {formatHours(row.non_billable_hours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-warning-600 text-right">
                  {formatHours(row.overtime_hours)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-elevated">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary text-right">
                {formatHours(totals.total_hours)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success-600 text-right">
                {formatHours(totals.billable_hours)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary text-right">
                {formatHours(totals.non_billable_hours)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-warning-600 text-right">
                {formatHours(totals.overtime_hours)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface ProjectReportViewProps {
  data: Array<{
    project_name: string;
    total_hours: number;
    billable_hours: number;
  }>;
  formatHours: (hours: number) => string;
}

function ProjectReportView({ data, formatHours }: ProjectReportViewProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-default bg-surface p-12 text-center">
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
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-primary">No data available</h3>
        <p className="mt-1 text-sm text-secondary">
          No time entries found for the selected date range.
        </p>
      </div>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      total_hours: acc.total_hours + row.total_hours,
      billable_hours: acc.billable_hours + row.billable_hours,
    }),
    { total_hours: 0, billable_hours: 0 }
  );

  return (
    <div className="rounded-lg border border-default bg-surface overflow-hidden">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-semibold text-primary">Project Time Summary</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-default">
          <thead className="bg-surface-elevated">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                Billable Hours
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                % Billable
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {data.map((row) => {
              const billablePercent =
                row.total_hours > 0 ? (row.billable_hours / row.total_hours) * 100 : 0;
              return (
                <tr key={row.project_name} className="hover:bg-surface-elevated">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {row.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary text-right">
                    {formatHours(row.total_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-success-600 text-right">
                    {formatHours(row.billable_hours)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary text-right">
                    {billablePercent.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface-elevated">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary text-right">
                {formatHours(totals.total_hours)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success-600 text-right">
                {formatHours(totals.billable_hours)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary text-right">
                {totals.total_hours > 0
                  ? ((totals.billable_hours / totals.total_hours) * 100).toFixed(1)
                  : 0}
                %
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/**
 * TimeTrackingPage Component
 * 
 * Main page for time tracking with module flag check
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useConfig } from '../../../config';
import { TimeTrackingDashboard } from '../components/TimeTrackingDashboard';
import { TimeEntryList } from '../components/TimeEntryList';
import { TimeReports } from '../components/TimeReports';
import type { TimeTrackingSettings } from '../types';

type TabType = 'dashboard' | 'entries' | 'reports';

export function TimeTrackingPage() {
  const { isModuleEnabled, getModuleSettings } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Check if time tracking module is enabled
  if (!isModuleEnabled('timeTracking')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Get module settings
  const settings = getModuleSettings<TimeTrackingSettings>('timeTracking');

  // For now, use a hardcoded employee ID
  // In a real app, this would come from the authenticated user context
  const currentEmployeeId = 1;

  const tabs: Array<{ id: TabType; name: string; icon: JSX.Element }> = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: (
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
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      ),
    },
    {
      id: 'entries',
      name: 'Time Entries',
      icon: (
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
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: (
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
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Time Tracking</h1>
          <p className="mt-2 text-sm text-secondary">
            Track employee hours, manage time entries, and generate reports
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-default mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                  ${
                    activeTab === tab.id
                      ? 'border-accent-500 text-accent-600'
                      : 'border-transparent text-secondary hover:border-default hover:text-primary'
                  }
                `}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'dashboard' && (
            <TimeTrackingDashboard employeeId={currentEmployeeId} />
          )}
          {activeTab === 'entries' && (
            <TimeEntryList employeeId={currentEmployeeId} />
          )}
          {activeTab === 'reports' && <TimeReports />}
        </div>

        {/* Settings Info (if available) */}
        {settings && (
          <div className="mt-8 rounded-lg border border-info-200 bg-info-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-info-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-info-800">Module Settings</h3>
                <div className="mt-2 text-sm text-info-700">
                  <ul className="list-disc list-inside space-y-1">
                    {settings.requireWorkOrder && (
                      <li>Work order required for time entries</li>
                    )}
                    {settings.allowManualEntry && (
                      <li>Manual time entry allowed</li>
                    )}
                    {settings.trackBreaks && (
                      <li>Break tracking enabled</li>
                    )}
                    {settings.overtimeThreshold && (
                      <li>Overtime threshold: {settings.overtimeThreshold} hours/week</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

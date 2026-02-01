/**
 * Estimate List Page
 * 
 * Displays a list of estimates with filtering and actions.
 * Uses semantic tokens only - no hardcoded colors.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConfig } from '../../../config/ConfigProvider';
import { useEstimates } from '../hooks';
import { getEstimateStatusColor, getEstimateStatusLabel } from '../types';
import type { EstimateStatus } from '../types';

export function EstimateListPage() {
  const navigate = useNavigate();
  const { isModuleEnabled, formatCurrency, formatDate } = useConfig();
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all');

  // Check if estimates module is enabled
  if (!isModuleEnabled('estimates')) {
    navigate('/dashboard');
    return null;
  }

  const { data: estimates, isLoading, error } = useEstimates(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Estimates</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Create and manage customer estimates
              </p>
            </div>
            <Link
              to="/estimates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Estimate
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-surface-elevated rounded-lg shadow-sm border border-border-default p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-text-primary">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | 'all')}
              className="block w-48 rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-sm text-text-secondary">Loading estimates...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-700 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-error-600 dark:text-error-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  Error loading estimates
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && estimates && estimates.length === 0 && (
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-text-primary">No estimates</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Get started by creating a new estimate.
            </p>
            <div className="mt-6">
              <Link
                to="/estimates/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Estimate
              </Link>
            </div>
          </div>
        )}

        {/* Estimates Table */}
        {!isLoading && !error && estimates && estimates.length > 0 && (
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default overflow-hidden">
            <table className="min-w-full divide-y divide-border-default">
              <thead className="bg-surface-elevated">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Estimate #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border-default">
                {estimates.map((estimate) => (
                  <tr
                    key={estimate.id}
                    className="hover:bg-surface-elevated transition-colors cursor-pointer"
                    onClick={() => navigate(`/estimates/${estimate.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400">
                      {estimate.estimate_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {estimate.customer_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(estimate.estimate_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                      {formatCurrency(estimate.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstimateStatusColor(
                          estimate.status
                        )}`}
                      >
                        {getEstimateStatusLabel(estimate.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/estimates/${estimate.id}`}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

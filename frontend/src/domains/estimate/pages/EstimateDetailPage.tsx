/**
 * Estimate Detail Page
 * 
 * Displays estimate details with line items and actions.
 * Uses semantic tokens only - no hardcoded colors.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../../../config/ConfigProvider';
import {
  useEstimate,
  useEstimateLineItems,
  useDeleteEstimate,
  useGenerateEstimatePdf,
} from '../hooks';
import { getEstimateStatusColor, getEstimateStatusLabel } from '../types';

export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isModuleEnabled, formatCurrency, formatDate } = useConfig();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if estimates module is enabled
  if (!isModuleEnabled('estimates')) {
    navigate('/dashboard');
    return null;
  }

  const { data: estimate, isLoading, error } = useEstimate(id);
  const { data: lineItems, isLoading: lineItemsLoading } = useEstimateLineItems(id);
  const deleteEstimate = useDeleteEstimate();
  const generatePdf = useGenerateEstimatePdf();

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteEstimate.mutateAsync(id);
      navigate('/estimates');
    } catch (error) {
      console.error('Failed to delete estimate:', error);
    }
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    
    try {
      const html = await generatePdf.mutateAsync(id);
      // Open PDF in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-sm text-text-secondary">Loading estimate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-5xl mx-auto">
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
                  Error loading estimate
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">
                  {error instanceof Error ? error.message : 'Estimate not found'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/estimates"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2 inline-flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Estimates
              </Link>
              <h1 className="text-3xl font-bold text-text-primary">
                {estimate.estimate_number}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstimateStatusColor(
                    estimate.status
                  )}`}
                >
                  {getEstimateStatusLabel(estimate.status)}
                </span>
                <span className="text-sm text-text-secondary">
                  Created {formatDate(estimate.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGeneratePdf}
                disabled={generatePdf.isPending}
                className="inline-flex items-center px-4 py-2 border border-border-default rounded-md shadow-sm text-sm font-medium text-text-primary bg-surface hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
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
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {generatePdf.isPending ? 'Generating...' : 'Generate PDF'}
              </button>
              {estimate.status !== 'converted' && (
                <>
                  <Link
                    to={`/estimates/${id}/edit`}
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center px-4 py-2 border border-error-300 dark:border-error-700 rounded-md shadow-sm text-sm font-medium text-error-700 dark:text-error-300 bg-surface hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500 transition-colors"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Estimate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-text-secondary">Customer ID</dt>
                <dd className="mt-1 text-sm text-text-primary">{estimate.customer_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Estimate Date</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {formatDate(estimate.estimate_date)}
                </dd>
              </div>
              {estimate.expiration_date && (
                <div>
                  <dt className="text-sm font-medium text-text-secondary">Expiration Date</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {formatDate(estimate.expiration_date)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Totals</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-secondary">Subtotal</dt>
                <dd className="text-sm text-text-primary">{formatCurrency(estimate.subtotal)}</dd>
              </div>
              {estimate.discount_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-text-secondary">Discount</dt>
                  <dd className="text-sm text-error-600 dark:text-error-400">
                    -{formatCurrency(estimate.discount_amount)}
                  </dd>
                </div>
              )}
              {estimate.tax_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-text-secondary">Tax</dt>
                  <dd className="text-sm text-text-primary">{formatCurrency(estimate.tax_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-border-default">
                <dt className="text-base font-semibold text-text-primary">Total</dt>
                <dd className="text-base font-semibold text-primary-600 dark:text-primary-400">
                  {formatCurrency(estimate.total_amount)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border-default">
            <h2 className="text-lg font-semibold text-text-primary">Line Items</h2>
          </div>
          {lineItemsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-text-secondary">Loading line items...</p>
            </div>
          ) : lineItems && lineItems.length > 0 ? (
            <table className="min-w-full divide-y divide-border-default">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border-default">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-text-primary">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-text-primary text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-text-secondary">No line items</div>
          )}
        </div>

        {/* Notes and Terms */}
        {(estimate.notes || estimate.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {estimate.notes && (
              <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Notes</h2>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
            {estimate.terms && (
              <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Terms & Conditions</h2>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{estimate.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface-elevated rounded-lg shadow-xl border border-border-default p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Delete Estimate</h3>
              <p className="text-sm text-text-secondary mb-6">
                Are you sure you want to delete this estimate? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-border-default rounded-md text-sm font-medium text-text-primary bg-surface hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteEstimate.isPending}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-error-600 hover:bg-error-700 transition-colors disabled:opacity-50"
                >
                  {deleteEstimate.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

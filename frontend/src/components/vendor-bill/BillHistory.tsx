/**
 * BillHistory Component
 *
 * View and filter vendor bill history
 * Requirements: 14.1, 14.2, 14.3, 15.1, 15.2, 15.3, 15.6
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBills, reprocessBill } from '../../domains/vendor-bill/api';
import type { VendorBill, BillStatus, ListBillsParams } from '../../domains/vendor-bill/types';
import { getStatusColor } from '../../domains/vendor-bill/types';

export const BillHistory: React.FC = () => {
  const navigate = useNavigate();

  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Filters
  const [vendorIdFilter, setVendorIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Reprocess state
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, [page, vendorIdFilter, statusFilter, dateFromFilter, dateToFilter]);

  const loadBills = async () => {
    setLoading(true);
    setError(null);

    const params: ListBillsParams = {
      page,
      page_size: pageSize,
    };

    if (vendorIdFilter) params.vendor_id = vendorIdFilter;
    if (statusFilter) params.status = statusFilter as BillStatus;
    if (dateFromFilter) params.date_from = dateFromFilter;
    if (dateToFilter) params.date_to = dateToFilter;

    try {
      const response = await listBills(params);
      setBills(response.bills);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async (billId: string) => {
    if (
      !confirm(
        'Reprocess this bill? This will re-run OCR and matching with the current template. Inventory will NOT be updated.'
      )
    ) {
      return;
    }

    setReprocessingId(billId);
    setError(null);

    try {
      await reprocessBill(billId);
      alert('Bill reprocessed successfully! Review the updated matches.');
      await loadBills();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to reprocess bill');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleViewDetails = (billId: string) => {
    navigate(`/vendor-bills/${billId}`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Vendor Bill History</h1>
        <button
          onClick={() => navigate('/vendor-bills/upload')}
          className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover"
        >
          Upload New Bill
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated rounded-lg shadow-md p-4 mb-6 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Vendor ID
            </label>
            <input
              type="text"
              value={vendorIdFilter}
              onChange={(e) => setVendorIdFilter(e.target.value)}
              placeholder="Filter by vendor..."
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-base text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BillStatus | '')}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-base text-text-primary"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="POSTED">Posted</option>
              <option value="VOID">Void</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-base text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-base text-text-primary"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => {
              setVendorIdFilter('');
              setStatusFilter('');
              setDateFromFilter('');
              setDateToFilter('');
              setPage(1);
            }}
            className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-base"
          >
            Clear Filters
          </button>
          <button
            onClick={loadBills}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md">
          <p className="text-sm text-error-dark">{error}</p>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-surface-elevated rounded-lg shadow-md overflow-hidden border border-border">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-16 w-16 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-text-primary">
              No vendor bills yet
            </h3>
            <p className="mt-2 text-sm text-text-tertiary max-w-sm mx-auto">
              Upload your first vendor invoice to start processing. We support PDF, JPG, PNG, and TIFF files.
            </p>
            <button
              onClick={() => navigate('/vendor-bills/upload')}
              className="mt-6 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Your First Bill
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-base">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-elevated divide-y divide-border">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-surface-base">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary">
                      {bill.invoice_no}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      {bill.vendor_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      {new Date(bill.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      {formatCurrency(bill.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleViewDetails(bill.id)}
                        className="text-accent dark:text-info hover:text-accent dark:hover:text-info-300"
                      >
                        View
                      </button>
                      {bill.status !== 'POSTED' && (
                        <button
                          onClick={() => handleReprocess(bill.id)}
                          disabled={reprocessingId === bill.id}
                          className="text-success-dark hover:text-success disabled:opacity-50"
                        >
                          {reprocessingId === bill.id ? 'Processing...' : 'Reprocess'}
                        </button>
                      )}
                      {bill.status === 'POSTED' && bill.posted_at && (
                        <span className="text-xs text-text-tertiary">
                          Posted {new Date(bill.posted_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-text-secondary">Showing {bills.length} bills</div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 text-text-primary"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-text-secondary">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={bills.length < pageSize}
            className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 text-text-primary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

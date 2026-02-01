/**
 * Estimate Create Page
 * 
 * Form for creating new estimates with line items.
 * Uses semantic tokens only - no hardcoded colors.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../../../config/ConfigProvider';
import { useCreateEstimate } from '../hooks';
import type { CreateEstimateLineItem } from '../types';

export function EstimateCreatePage() {
  const navigate = useNavigate();
  const { isModuleEnabled } = useConfig();
  const createEstimate = useCreateEstimate();

  // Check if estimates module is enabled
  if (!isModuleEnabled('estimates')) {
    navigate('/dashboard');
    return null;
  }

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [estimateDate, setEstimateDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expirationDate, setExpirationDate] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<CreateEstimateLineItem[]>([
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      discount_rate: 0,
    },
  ]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        discount_rate: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    field: keyof CreateEstimateLineItem,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const estimate = await createEstimate.mutateAsync({
        customer_id: customerId,
        estimate_date: estimateDate,
        expiration_date: expirationDate || undefined,
        terms: terms || undefined,
        notes: notes || undefined,
        line_items: lineItems.filter((item) => item.description.trim() !== ''),
      });

      navigate(`/estimates/${estimate.id}`);
    } catch (error) {
      console.error('Failed to create estimate:', error);
    }
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price;
  }, 0);

  const discountAmount = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    return sum + lineSubtotal * (item.discount_rate || 0);
  }, 0);

  const taxableAmount = subtotal - discountAmount;

  const taxAmount = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = lineSubtotal * (item.discount_rate || 0);
    const lineTaxable = lineSubtotal - lineDiscount;
    return sum + lineTaxable * (item.tax_rate || 0);
  }, 0);

  const total = taxableAmount + taxAmount;

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
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
          <h1 className="text-3xl font-bold text-text-primary">Create Estimate</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create a new estimate for a customer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="customerId"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Customer ID *
                </label>
                <input
                  type="text"
                  id="customerId"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter customer ID"
                />
              </div>
              <div>
                <label
                  htmlFor="estimateDate"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Estimate Date *
                </label>
                <input
                  type="date"
                  id="estimateDate"
                  required
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="expirationDate"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Expiration Date
                </label>
                <input
                  type="date"
                  id="expirationDate"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Line Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-border-default rounded-md bg-surface"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-text-primary">
                      Item {index + 1}
                    </h3>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                      >
                        <svg
                          className="w-5 h-5"
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
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(index, 'description', e.target.value)
                        }
                        className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.tax_rate || 0}
                        onChange={(e) =>
                          updateLineItem(index, 'tax_rate', parseFloat(e.target.value) || 0)
                        }
                        className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Subtotal:</dt>
                <dd className="text-text-primary font-medium">${subtotal.toFixed(2)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Discount:</dt>
                  <dd className="text-error-600 dark:text-error-400 font-medium">
                    -${discountAmount.toFixed(2)}
                  </dd>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Tax:</dt>
                  <dd className="text-text-primary font-medium">${taxAmount.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-border-default">
                <dt className="text-text-primary">Total:</dt>
                <dd className="text-primary-600 dark:text-primary-400">${total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {/* Additional Information */}
          <div className="bg-surface-elevated rounded-lg shadow-sm border border-border-default p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Additional Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="terms"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Terms & Conditions
                </label>
                <textarea
                  id="terms"
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter terms and conditions..."
                />
              </div>
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded-md border-border-default bg-surface text-text-primary shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              to="/estimates"
              className="px-4 py-2 border border-border-default rounded-md text-sm font-medium text-text-primary bg-surface hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createEstimate.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
            >
              {createEstimate.isPending ? 'Creating...' : 'Create Estimate'}
            </button>
          </div>

          {/* Error Display */}
          {createEstimate.isError && (
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
                    Error creating estimate
                  </h3>
                  <p className="mt-1 text-sm text-error-700 dark:text-error-300">
                    {createEstimate.error instanceof Error
                      ? createEstimate.error.message
                      : 'An error occurred'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

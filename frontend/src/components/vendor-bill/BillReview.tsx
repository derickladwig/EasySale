/**
 * BillReview Component
 *
 * Review and match vendor bill line items
 * Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 10.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBill, updateMatches, createAlias, postReceiving, getMatchSuggestions, createProductFromLine, reopenBill } from '../../domains/vendor-bill/api';
import type {
  BillWithDetails,
  VendorBillLine,
  LineUpdate,
  CreateAliasRequest,
  MatchCandidate,
  CreateProductFromLineRequest,
} from '../../domains/vendor-bill/types';
import {
  getConfidenceColor,
  getConfidenceBgColor,
  formatConfidence,
  canPostBill,
  getStatusColor,
  BillStatus,
} from '../../domains/vendor-bill/types';

export const BillReview: React.FC = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();

  const [billData, setBillData] = useState<BillWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<VendorBillLine | null>(null);
  const [searchSku, setSearchSku] = useState('');
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  
  // New state for match suggestions
  const [matchSuggestions, setMatchSuggestions] = useState<MatchCandidate[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showCreateProductDialog, setShowCreateProductDialog] = useState(false);
  const [createProductForm, setCreateProductForm] = useState({
    sku: '',
    name: '',
    category: 'general',
    cost: 0,
    unit_price: 0,
    quantity_on_hand: 0,
    barcode: '',
    vendor_catalog_ref: '',
    create_alias: true,
  });

  useEffect(() => {
    if (billId) {
      loadBill();
    }
  }, [billId]);

  const loadBill = async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getBill(billId);
      setBillData(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  // Load match suggestions for a line item
  const loadMatchSuggestions = useCallback(async (line: VendorBillLine) => {
    if (!billData) return;
    
    setLoadingSuggestions(true);
    try {
      const response = await getMatchSuggestions(
        line.vendor_sku_raw,
        line.desc_raw,
        billData.bill.vendor_id,
        10
      );
      setMatchSuggestions(response.suggestions);
    } catch (err: unknown) {
      console.error('Failed to load suggestions:', err);
      setMatchSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [billData]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = async (suggestion: MatchCandidate) => {
    if (!selectedLine || !billId) return;
    
    await handleUpdateMatch(selectedLine.id, suggestion.sku);
    setMatchSuggestions([]);
    setSelectedLine(null);
    setSearchSku('');
  };

  // Open create product dialog
  const handleOpenCreateProduct = (line: VendorBillLine) => {
    setSelectedLine(line);
    setCreateProductForm({
      sku: line.vendor_sku_raw.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase(),
      name: line.desc_raw,
      category: 'general',
      cost: line.unit_price,
      unit_price: line.unit_price * 1.3, // Default 30% markup
      quantity_on_hand: line.normalized_qty,
      barcode: '',
      vendor_catalog_ref: line.vendor_sku_raw,
      create_alias: true,
    });
    setShowCreateProductDialog(true);
  };

  // Handle creating product from line item
  const handleCreateProduct = async () => {
    if (!selectedLine || !billId) return;

    setSaving(true);
    try {
      const request: CreateProductFromLineRequest = {
        line_id: selectedLine.id,
        sku: createProductForm.sku,
        name: createProductForm.name,
        category: createProductForm.category,
        cost: createProductForm.cost,
        unit_price: createProductForm.unit_price,
        quantity_on_hand: createProductForm.quantity_on_hand,
        barcode: createProductForm.barcode || undefined,
        vendor_catalog_ref: createProductForm.vendor_catalog_ref || undefined,
        create_alias: createProductForm.create_alias,
      };

      await createProductFromLine(billId, request);
      setShowCreateProductDialog(false);
      setSelectedLine(null);
      await loadBill();
      alert('Product created successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  // Handle reopening a posted bill
  const handleReopenBill = async () => {
    if (!billId || !billData) return;

    const reason = prompt('Enter reason for reopening this bill (optional):');
    
    try {
      await reopenBill(billId, reason || undefined);
      await loadBill();
      alert('Bill reopened successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to reopen bill');
    }
  };

  const handleUpdateMatch = async (lineId: string, matchedSku: string) => {
    if (!billId || !billData) return;

    const updates: LineUpdate[] = [
      {
        line_id: lineId,
        matched_sku: matchedSku,
      },
    ];

    setSaving(true);
    try {
      await updateMatches(billId, updates);
      await loadBill(); // Reload to get updated data
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update match');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAlias = async (line: VendorBillLine) => {
    if (!billData?.bill.vendor_id || !line.matched_sku) return;

    const aliasRequest: CreateAliasRequest = {
      vendor_id: billData.bill.vendor_id,
      vendor_sku: line.vendor_sku_raw,
      internal_sku: line.matched_sku,
    };

    setSaving(true);
    try {
      await createAlias(aliasRequest);
      setShowAliasDialog(false);
      setSelectedLine(null);
      // Show success message
      alert('Alias created successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create alias');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAllHighConfidence = async () => {
    if (!billId || !billData) return;

    const highConfidenceLines = billData.lines.filter(
      (line) => line.match_confidence >= 0.95 && !line.user_overridden
    );

    if (highConfidenceLines.length === 0) {
      alert('No high-confidence matches to accept');
      return;
    }

    const updates: LineUpdate[] = highConfidenceLines.map((line) => ({
      line_id: line.id,
      matched_sku: line.matched_sku || '',
    }));

    setSaving(true);
    try {
      await updateMatches(billId, updates);
      await loadBill();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to accept matches');
    } finally {
      setSaving(false);
    }
  };

  const handlePostReceiving = async () => {
    if (!billId || !billData || !canPost) return;

    const confirmMessage = `Post receiving for ${billData.lines.length} line items?\n\nThis will update inventory quantities and costs. This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setPosting(true);
    setError(null);

    try {
      await postReceiving(billId);
      setPostSuccess(true);
      await loadBill(); // Reload to show updated status

      // Show success message
      setTimeout(() => {
        alert('Receiving posted successfully! Inventory has been updated.');
      }, 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to post receiving');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="p-6">
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
          <p className="text-error-dark">{error || 'Bill not found'}</p>
        </div>
      </div>
    );
  }

  const { bill, vendor, lines } = billData;
  const canPost = canPostBill(bill, lines);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-surface-base rounded-lg shadow-md p-6 mb-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text-primary">Review Vendor Bill</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}
          >
            {bill.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-text-tertiary">Vendor</p>
            <p className="font-medium text-text-primary">{vendor?.name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary">Invoice #</p>
            <p className="font-medium text-text-primary">{bill.invoice_no}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary">Date</p>
            <p className="font-medium text-text-primary">
              {new Date(bill.invoice_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary">Total</p>
            <p className="font-medium text-text-primary">${bill.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-base rounded-lg shadow-md p-4 mb-6 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={handleAcceptAllHighConfidence}
              disabled={saving || posting || bill.status === BillStatus.POSTED}
              className="px-4 py-2 bg-success text-accent-foreground rounded-md hover:bg-success-dark disabled:opacity-50"
            >
              Accept All High Confidence
            </button>
            <button
              onClick={() => navigate('/vendor-bills')}
              className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
            >
              Back to List
            </button>
            {bill.status === BillStatus.POSTED && (
              <button
                onClick={handleReopenBill}
                className="px-4 py-2 border border-warning text-warning-dark rounded-md hover:bg-warning-50 dark:hover:bg-warning-900/20"
              >
                Reopen Bill
              </button>
            )}
          </div>
          <button
            onClick={handlePostReceiving}
            disabled={!canPost || saving || posting || postSuccess}
            className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Posting...
              </span>
            ) : postSuccess ? (
              'Posted ✓'
            ) : (
              'Post Receiving'
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {postSuccess && (
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-success-dark mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-success-dark">
                Receiving posted successfully!
              </p>
              <p className="text-xs text-success-dark mt-1">
                Inventory quantities and costs have been updated. Check the audit log for details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Posting Status */}
      {posting && (
        <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded-md p-4 mb-6">
          <p className="text-sm text-info-dark dark:text-info">
            <strong>Posting receiving transaction...</strong> Updating inventory quantities and
            costs.
          </p>
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-surface-base rounded-lg shadow-md overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Line
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Vendor SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Matched SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-base divide-y divide-border">
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className={`${getConfidenceBgColor(line.match_confidence)} hover:bg-surface-elevated`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                    {line.line_no}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                    {line.vendor_sku_raw}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary max-w-xs truncate">
                    {line.desc_raw}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                    {line.normalized_qty} {line.normalized_unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                    ${line.ext_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {line.matched_sku ? (
                      <span className="font-medium text-text-primary">
                        {line.matched_sku}
                      </span>
                    ) : (
                      <span className="text-text-tertiary italic">No match</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getConfidenceColor(line.match_confidence)}`}>
                      {formatConfidence(line.match_confidence)}
                    </span>
                    {line.user_overridden && (
                      <span className="ml-2 text-xs text-text-tertiary">
                        (Manual)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        setSelectedLine(line);
                        loadMatchSuggestions(line);
                      }}
                      className="text-accent hover:text-accent-hover"
                    >
                      Edit
                    </button>
                    {!line.matched_sku && (
                      <button
                        onClick={() => handleOpenCreateProduct(line)}
                        className="text-success hover:text-success-dark"
                      >
                        Create Part
                      </button>
                    )}
                    {line.matched_sku && !line.user_overridden && (
                      <button
                        onClick={() => {
                          setSelectedLine(line);
                          setShowAliasDialog(true);
                        }}
                        className="text-success hover:text-success-dark"
                      >
                        Create Alias
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Match Dialog */}
      {selectedLine && !showAliasDialog && !showCreateProductDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="bg-surface-base rounded-lg p-6 max-w-lg w-full border border-border" style={{ boxShadow: 'var(--shadow-modal)' }}>
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Edit Match for Line {selectedLine.line_no}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-text-secondary mb-2">
                Vendor SKU: <span className="font-medium">{selectedLine.vendor_sku_raw}</span>
              </p>
              <p className="text-sm text-text-secondary mb-4">
                Description: <span className="font-medium">{selectedLine.desc_raw}</span>
              </p>
              
              {/* Match Suggestions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Suggested Matches
                  </label>
                  <button
                    onClick={() => loadMatchSuggestions(selectedLine)}
                    disabled={loadingSuggestions}
                    className="text-xs text-accent hover:text-accent-hover"
                  >
                    {loadingSuggestions ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {matchSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                    {matchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full px-3 py-2 text-left hover:bg-surface-elevated border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-text-primary">{suggestion.sku}</span>
                            <span className="text-xs text-text-tertiary ml-2">
                              {suggestion.category}
                            </span>
                          </div>
                          <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {formatConfidence(suggestion.confidence)}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary truncate">{suggestion.name}</p>
                        <p className="text-xs text-text-tertiary">{suggestion.reason}</p>
                        {suggestion.cost !== undefined && (
                          <p className="text-xs text-text-tertiary">
                            Cost: ${suggestion.cost.toFixed(2)} | Qty: {suggestion.quantity_on_hand}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-tertiary italic py-2">
                    {loadingSuggestions ? 'Loading suggestions...' : 'No suggestions available. Click Refresh to search.'}
                  </p>
                )}
              </div>

              <label className="block text-sm font-medium text-text-secondary mb-2">
                Or enter Internal SKU manually
              </label>
              <input
                type="text"
                value={searchSku}
                onChange={(e) => setSearchSku(e.target.value)}
                placeholder="Enter internal SKU"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => handleOpenCreateProduct(selectedLine)}
                className="px-4 py-2 bg-success text-accent-foreground rounded-md hover:bg-success-dark"
              >
                Create New Product
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedLine(null);
                    setSearchSku('');
                    setMatchSuggestions([]);
                  }}
                  className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (searchSku) {
                      handleUpdateMatch(selectedLine.id, searchSku);
                      setSelectedLine(null);
                      setSearchSku('');
                      setMatchSuggestions([]);
                    }
                  }}
                  disabled={!searchSku || saving}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover disabled:opacity-50"
                >
                  Update Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Alias Dialog */}
      {selectedLine && showAliasDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="bg-surface-base rounded-lg p-6 max-w-md w-full border border-border" style={{ boxShadow: 'var(--shadow-modal)' }}>
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Create SKU Alias
            </h3>
            <div className="mb-4">
              <p className="text-sm text-text-secondary mb-2">
                This will create a permanent mapping:
              </p>
              <div className="bg-surface-elevated p-3 rounded-md">
                <p className="text-sm text-text-primary">
                  <span className="font-medium">Vendor SKU:</span> {selectedLine.vendor_sku_raw}
                </p>
                <p className="text-sm text-text-primary mt-1">
                  <span className="font-medium">Internal SKU:</span> {selectedLine.matched_sku}
                </p>
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Future bills with this vendor SKU will automatically match to this internal SKU.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAliasDialog(false);
                  setSelectedLine(null);
                }}
                className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateAlias(selectedLine)}
                disabled={saving}
                className="px-4 py-2 bg-success text-accent-foreground rounded-md hover:bg-success-dark disabled:opacity-50"
              >
                Create Alias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Dialog */}
      {selectedLine && showCreateProductDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="bg-surface-base rounded-lg p-6 max-w-xl w-full border border-border max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-modal)' }}>
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Create New Product from Line Item
            </h3>
            
            <div className="space-y-4">
              {/* Source Info */}
              <div className="bg-surface-elevated p-3 rounded-md">
                <p className="text-xs text-text-tertiary mb-1">Creating from:</p>
                <p className="text-sm text-text-primary">
                  <span className="font-medium">Vendor SKU:</span> {selectedLine.vendor_sku_raw}
                </p>
                <p className="text-sm text-text-primary">
                  <span className="font-medium">Description:</span> {selectedLine.desc_raw}
                </p>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Internal SKU <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={createProductForm.sku}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  placeholder="Enter internal SKU"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Product Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={createProductForm.name}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  placeholder="Enter product name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category <span className="text-error">*</span>
                </label>
                <select
                  value={createProductForm.category}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                >
                  <option value="general">General</option>
                  <option value="parts">Parts</option>
                  <option value="supplies">Supplies</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>

              {/* Cost and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Cost <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createProductForm.cost}
                    onChange={(e) => setCreateProductForm({ ...createProductForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Unit Price <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createProductForm.unit_price}
                    onChange={(e) => setCreateProductForm({ ...createProductForm, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  value={createProductForm.quantity_on_hand}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, quantity_on_hand: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Barcode (optional)
                </label>
                <input
                  type="text"
                  value={createProductForm.barcode}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, barcode: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  placeholder="Enter barcode"
                />
              </div>

              {/* Vendor Catalog Reference */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Vendor Catalog Reference
                </label>
                <input
                  type="text"
                  value={createProductForm.vendor_catalog_ref}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, vendor_catalog_ref: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                  placeholder="Vendor's part number"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Store the vendor's part number for future reference
                </p>
              </div>

              {/* Create Alias Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="create_alias"
                  checked={createProductForm.create_alias}
                  onChange={(e) => setCreateProductForm({ ...createProductForm, create_alias: e.target.checked })}
                  className="h-4 w-4 text-accent border-border rounded"
                />
                <label htmlFor="create_alias" className="ml-2 text-sm text-text-secondary">
                  Create vendor SKU alias for automatic matching
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateProductDialog(false);
                  setSelectedLine(null);
                }}
                className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={saving || !createProductForm.sku || !createProductForm.name}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

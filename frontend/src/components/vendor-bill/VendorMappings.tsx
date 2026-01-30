/**
 * VendorMappings Component
 *
 * Manage vendor SKU aliases and mappings
 * Requirements: 16.2, 16.3, 16.4, 16.6
 */

import React, { useState, useEffect } from 'react';
import { listAliases, createAlias } from '../../domains/vendor-bill/api';
import { toast } from '../../common/components/molecules/Toast';
import type {
  VendorSkuAlias,
  CreateAliasRequest,
  ListAliasesParams,
} from '../../domains/vendor-bill/types';

export const VendorMappings: React.FC = () => {
  const [aliases, setAliases] = useState<VendorSkuAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Filters
  const [vendorIdFilter, setVendorIdFilter] = useState('');
  const [internalSkuFilter, setInternalSkuFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create/Edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingAlias, setEditingAlias] = useState<VendorSkuAlias | null>(null);
  const [formData, setFormData] = useState<CreateAliasRequest>({
    vendor_id: '',
    vendor_sku: '',
    internal_sku: '',
    priority: 0,
  });

  useEffect(() => {
    loadAliases();
  }, [page, vendorIdFilter, internalSkuFilter]);

  const loadAliases = async () => {
    setLoading(true);
    setError(null);

    const params: ListAliasesParams = {
      page,
      page_size: pageSize,
    };

    if (vendorIdFilter) params.vendor_id = vendorIdFilter;
    if (internalSkuFilter) params.internal_sku = internalSkuFilter;

    try {
      const response = await listAliases(params);
      setAliases(response.aliases);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load aliases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlias = async () => {
    if (!formData.vendor_id || !formData.vendor_sku || !formData.internal_sku) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await createAlias(formData);
      setShowDialog(false);
      setFormData({
        vendor_id: '',
        vendor_sku: '',
        internal_sku: '',
        priority: 0,
      });
      await loadAliases();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create alias');
    }
  };

  const filteredAliases = aliases.filter((alias) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      alias.vendor_sku_norm.toLowerCase().includes(term) ||
      alias.internal_sku.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Vendor SKU Mappings</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover"
        >
          Create Alias
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-base rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU..."
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Vendor ID
            </label>
            <input
              type="text"
              value={vendorIdFilter}
              onChange={(e) => setVendorIdFilter(e.target.value)}
              placeholder="Filter by vendor..."
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Internal SKU
            </label>
            <input
              type="text"
              value={internalSkuFilter}
              onChange={(e) => setInternalSkuFilter(e.target.value)}
              placeholder="Filter by internal SKU..."
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={loadAliases}
            className="px-4 py-2 bg-secondary-600 text-text-primary rounded-md hover:bg-secondary-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Aliases Table */}
      <div className="bg-surface-base rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : filteredAliases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary">No aliases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Vendor SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Internal SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Unit Conversion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Usage Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-base divide-y divide-border">
                {filteredAliases.map((alias) => (
                  <tr key={alias.id} className="hover:bg-surface-elevated">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary">
                      {alias.vendor_sku_norm}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      {alias.internal_sku}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {alias.unit_conversion ? (
                        <span>
                          {alias.unit_conversion.multiplier}x {alias.unit_conversion.from_unit} →{' '}
                          {alias.unit_conversion.to_unit}
                        </span>
                      ) : (
                        <span className="text-text-tertiary italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      {alias.priority}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-100 text-info-dark dark:bg-info-900/20 dark:text-info">
                        {alias.usage_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(alias.last_seen_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => {
                          setEditingAlias(alias);
                          setFormData({
                            vendor_id: alias.vendor_id,
                            vendor_sku: alias.vendor_sku_norm,
                            internal_sku: alias.internal_sku,
                            unit_conversion: alias.unit_conversion,
                            priority: alias.priority,
                          });
                          setShowDialog(true);
                        }}
                        className="text-accent dark:text-info hover:text-accent dark:hover:text-info-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this alias?')) {
                            // Delete functionality requires API implementation
                            toast.error('Delete operation requires backend support. Please contact your administrator.');
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
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
        <div className="text-sm text-text-secondary">
          Showing {filteredAliases.length} aliases
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-border rounded-md text-sm text-text-primary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-text-secondary">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={filteredAliases.length < pageSize}
            className="px-3 py-1 border border-border rounded-md text-sm text-text-primary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-base rounded-lg p-6 max-w-md w-full border border-border">
            <h3 className="text-lg font-bold text-text-primary mb-4">
              {editingAlias ? 'Edit Alias' : 'Create Alias'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Vendor ID *
                </label>
                <input
                  type="text"
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Vendor SKU *
                </label>
                <input
                  type="text"
                  value={formData.vendor_sku}
                  onChange={(e) => setFormData({ ...formData, vendor_sku: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Internal SKU *
                </label>
                <input
                  type="text"
                  value={formData.internal_sku}
                  onChange={(e) => setFormData({ ...formData, internal_sku: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditingAlias(null);
                  setFormData({
                    vendor_id: '',
                    vendor_sku: '',
                    internal_sku: '',
                    priority: 0,
                  });
                }}
                className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlias}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover"
              >
                {editingAlias ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

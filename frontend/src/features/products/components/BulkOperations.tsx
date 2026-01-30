import React, { useState } from 'react';
import { Upload, Download, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { productApi } from '../../../domains/product/api';
import type { Product } from '../../../domains/product/types';

interface BulkOperationsProps {
  selectedProducts: Product[];
  onComplete: () => void;
  onCancel: () => void;
}

type OperationType = 'update' | 'delete' | 'import' | 'export';

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedProducts,
  onComplete,
  onCancel,
}) => {
  const [operation, setOperation] = useState<OperationType | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updateFields, setUpdateFields] = useState<Record<string, any>>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleBulkUpdate = async () => {
    if (Object.keys(updateFields).length === 0) {
      setError('Please specify at least one field to update');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const productIds = selectedProducts.map((p) => p.id);

      await productApi.bulkOperation({
        operation: 'update',
        productIds,
        updates: updateFields,
      });

      setProgress(100);
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const productIds = selectedProducts.map((p) => p.id);

      await productApi.bulkOperation({
        operation: 'delete',
        productIds,
      });

      setProgress(100);
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      await productApi.bulkOperation({
        operation: 'import',
        file: importFile,
      });

      setProgress(100);
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const productIds =
        selectedProducts.length > 0 ? selectedProducts.map((p) => p.id) : undefined; // undefined means export all

      const response = await productApi.bulkOperation({
        operation: 'export',
        productIds,
        format: exportFormat,
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: exportFormat === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOperationClick = (op: OperationType) => {
    setOperation(op);
    setError(null);

    if (op === 'delete') {
      setShowConfirmation(true);
    }
  };

  const confirmDelete = () => {
    setShowConfirmation(false);
    handleBulkDelete();
  };

  if (!operation) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">Bulk Operations</h3>
          <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleOperationClick('update')}
            disabled={selectedProducts.length === 0}
            className="p-6 bg-surface-elevated rounded-lg border border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="w-8 h-8 text-accent mb-3" />
            <h4 className="text-text-primary font-medium mb-1">Bulk Update</h4>
            <p className="text-sm text-text-tertiary">
              Update {selectedProducts.length} selected products
            </p>
          </button>

          <button
            onClick={() => handleOperationClick('delete')}
            disabled={selectedProducts.length === 0}
            className="p-6 bg-surface-elevated rounded-lg border border-border hover:border-error-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-8 h-8 text-error-500 mb-3" />
            <h4 className="text-text-primary font-medium mb-1">Bulk Delete</h4>
            <p className="text-sm text-text-tertiary">
              Delete {selectedProducts.length} selected products
            </p>
          </button>

          <button
            onClick={() => handleOperationClick('import')}
            className="p-6 bg-surface-elevated rounded-lg border border-border hover:border-success-500 transition-colors"
          >
            <Upload className="w-8 h-8 text-success-500 mb-3" />
            <h4 className="text-text-primary font-medium mb-1">Import Products</h4>
            <p className="text-sm text-text-tertiary">Import from CSV, Excel, or JSON</p>
          </button>

          <button
            onClick={() => handleOperationClick('export')}
            className="p-6 bg-surface-elevated rounded-lg border border-border hover:border-primary-500 transition-colors"
          >
            <Download className="w-8 h-8 text-primary-500 mb-3" />
            <h4 className="text-text-primary font-medium mb-1">Export Products</h4>
            <p className="text-sm text-text-tertiary">
              Export {selectedProducts.length > 0 ? `${selectedProducts.length} selected` : 'all'}{' '}
              products
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          {operation === 'update' && 'Bulk Update'}
          {operation === 'delete' && 'Bulk Delete'}
          {operation === 'import' && 'Import Products'}
          {operation === 'export' && 'Export Products'}
        </h3>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-error-500/10 border border-error-500/20 rounded text-error-400">
          {error}
        </div>
      )}

      {showConfirmation && (
        <div className="mb-6 p-4 bg-warning-500/10 border border-warning-500/20 rounded">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-warning-500 font-medium mb-1">Confirm Deletion</h4>
              <p className="text-sm text-text-secondary mb-4">
                Are you sure you want to delete {selectedProducts.length} products? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-error-600 text-white rounded hover:bg-error-700"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 bg-surface-secondary text-text-primary rounded hover:bg-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {operation === 'update' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Price</label>
            <input
              type="number"
              step="0.01"
              value={updateFields.price || ''}
              onChange={(e) =>
                setUpdateFields({ ...updateFields, price: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              placeholder="Leave empty to keep current value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cost</label>
            <input
              type="number"
              step="0.01"
              value={updateFields.cost || ''}
              onChange={(e) =>
                setUpdateFields({ ...updateFields, cost: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              placeholder="Leave empty to keep current value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
            <input
              type="text"
              value={updateFields.category || ''}
              onChange={(e) => setUpdateFields({ ...updateFields, category: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              placeholder="Leave empty to keep current value"
            />
          </div>

          <button
            onClick={handleBulkUpdate}
            disabled={loading}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Updating...' : `Update ${selectedProducts.length} Products`}
          </button>
        </div>
      )}

      {operation === 'import' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Select File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
            />
            <p className="mt-2 text-sm text-text-tertiary">
              Supported formats: CSV, Excel (.xlsx), JSON
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !importFile}
            className="w-full px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import Products'}
          </button>
        </div>
      )}

      {operation === 'export' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {loading
              ? 'Exporting...'
              : `Export ${selectedProducts.length > 0 ? selectedProducts.length : 'All'} Products`}
          </button>
        </div>
      )}

      {loading && progress > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-tertiary">Progress</span>
            <span className="text-sm text-text-tertiary">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * DataManagerPage Component
 * 
 * Page for managing data batches: seed demo data, CSV import, and purge.
 * Uses semantic tokens for styling (no hardcoded colors).
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { useState, useEffect, useRef } from 'react';
import { syncApi } from '../../services/syncApi';

interface Batch {
  id: string;
  batch_type: string;
  entity_type: string;
  status: string;
  records_count: number;
  created_at: string;
  completed_at?: string;
}

export function DataManagerPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedType, setSeedType] = useState('products');
  const [seedCount, setSeedCount] = useState(10);
  const [seeding, setSeeding] = useState(false);
  const [uploadType, setUploadType] = useState('products');
  const [uploading, setUploading] = useState(false);
  const [purging, setPurging] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await syncApi.getDataBatches();
      setBatches(response.batches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await syncApi.seedData(seedType, seedCount);
      await fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const csvData = await file.text();
      await syncApi.uploadData(uploadType, csvData);
      await fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload data');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePurge = async (batchId: string) => {
    if (!confirm('Are you sure you want to purge this batch? This will delete all associated records.')) {
      return;
    }

    setPurging(batchId);
    setError(null);
    try {
      await syncApi.purgeBatch(batchId);
      await fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge batch');
    } finally {
      setPurging(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'purged':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Data Manager</h1>
        <p className="mt-1 text-secondary">Seed demo data, import CSV files, and manage data batches.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Seed Demo Data */}
      <div className="rounded-lg border border-default bg-surface p-4">
        <h2 className="text-lg font-semibold text-primary">Seed Demo Data</h2>
        <p className="mt-1 text-sm text-secondary">Generate sample data for testing purposes.</p>
        
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-primary">Data Type</label>
            <select
              value={seedType}
              onChange={(e) => setSeedType(e.target.value)}
              className="mt-1 rounded-md border border-default bg-surface px-3 py-2 text-primary"
            >
              <option value="products">Products</option>
              <option value="customers">Customers</option>
              <option value="all">All</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary">Count</label>
            <input
              type="number"
              value={seedCount}
              onChange={(e) => setSeedCount(parseInt(e.target.value) || 10)}
              min={1}
              max={1000}
              className="mt-1 w-24 rounded-md border border-default bg-surface px-3 py-2 text-primary"
            />
          </div>
          
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="rounded-md bg-accent px-4 py-2 text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : 'Seed Data'}
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="rounded-lg border border-default bg-surface p-4">
        <h2 className="text-lg font-semibold text-primary">Import CSV</h2>
        <p className="mt-1 text-sm text-secondary">Upload a CSV file to import data.</p>
        
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-primary">Entity Type</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="mt-1 rounded-md border border-default bg-surface px-3 py-2 text-primary"
            >
              <option value="products">Products</option>
              <option value="customers">Customers</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary">CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-1 text-sm text-primary file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white file:hover:bg-accent-hover"
            />
          </div>
          
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Uploading...
            </div>
          )}
        </div>
      </div>

      {/* Batch List */}
      <div className="rounded-lg border border-default bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Data Batches</h2>
            <p className="mt-1 text-sm text-secondary">View and manage imported data batches.</p>
          </div>
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="rounded-md px-3 py-1 text-sm text-accent hover:bg-surface-hover"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              No batches found. Seed some demo data or upload a CSV file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-default text-left text-sm text-secondary">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Entity</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Records</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b border-default last:border-0">
                      <td className="py-3 pr-4 text-sm text-primary">{batch.batch_type}</td>
                      <td className="py-3 pr-4 text-sm text-primary">{batch.entity_type}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(batch.status)}`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-primary">{batch.records_count}</td>
                      <td className="py-3 pr-4 text-sm text-secondary">
                        {new Date(batch.created_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        {batch.status !== 'purged' && (
                          <button
                            onClick={() => handlePurge(batch.id)}
                            disabled={purging === batch.id}
                            className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            {purging === batch.id ? 'Purging...' : 'Purge'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataManagerPage;

/**
 * ExportsPage Component
 * 
 * Provides interface for exporting approved cases in various formats.
 * Supports QuickBooks-ready, CSV, and JSON export presets.
 * 
 * Requirements: 11.1, 11.2, 11.5, 11.10
 */

import React, { useState } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { useExportCase, useBulkExport, useExportJobs, DEFAULT_EXPORT_PRESETS, ExportPreset, ExportFilters } from '../hooks/useExportsApi';
import { useReviewQueue } from '../../review/hooks/useReviewApi';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from '@common/components/molecules/Toast';

export const ExportsPage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(DEFAULT_EXPORT_PRESETS[0]);
  const [filters, _setFilters] = useState<ExportFilters>({
    status: 'approved',
  });
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  // Fetch approved cases for export
  const { data: casesData, isLoading: casesLoading, error: casesError } = useReviewQueue({
    state: 'Approved',
    per_page: 100,
  });

  // Fetch export jobs history
  const { data: exportJobs, isLoading: jobsLoading } = useExportJobs();

  // Export mutations
  const exportCaseMutation = useExportCase();
  const bulkExportMutation = useBulkExport();

  const handleExportSelected = async () => {
    if (selectedCases.length === 0) {
      toast.error('Please select at least one case to export');
      return;
    }

    try {
      // For now, export each case individually
      // In a real implementation, this would use a bulk export endpoint
      const results = await Promise.all(
        selectedCases.map((caseId) =>
          exportCaseMutation.mutateAsync({
            caseId,
            format: selectedPreset.format === 'quickbooks' ? 'csv' : selectedPreset.format,
            includeLineItems: selectedPreset.includeLineItems,
          })
        )
      );

      toast.success(`Successfully exported ${results.length} case(s)`);
      setSelectedCases([]);
    } catch (error) {
      // Handle gracefully if endpoint is stubbed
      if (error instanceof Error && error.message.includes('not yet fully implemented')) {
        toast.info('Export feature requires backend implementation. Please contact your administrator.');
      } else {
        toast.error('Failed to export cases. Please try again.');
      }
    }
  };

  const handleBulkExport = async () => {
    try {
      const _result = await bulkExportMutation.mutateAsync({
        entityType: 'cases',
        format: selectedPreset.format,
        filters,
      });

      toast.success('Export job started. You will be notified when it completes.');
    } catch (error) {
      // Handle gracefully if endpoint is stubbed
      if (error instanceof Error && error.message.includes('not yet fully implemented')) {
        toast.info('Bulk export feature requires backend implementation. Please contact your administrator.');
      } else {
        toast.error('Failed to start bulk export. Please try again.');
      }
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCases.length === casesData?.cases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(casesData?.cases.map((c) => c.case_id) || []);
    }
  };

  // Loading state
  if (casesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (casesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-16 h-16 text-error-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load cases</h3>
        <p className="text-text-tertiary mb-6">
          {casesError instanceof Error ? casesError.message : 'An error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!casesData || casesData.cases.length === 0) {
    return (
      <EmptyState
        icon={<Download className="w-16 h-16" />}
        title="No approved cases to export"
        description="Cases must be approved before they can be exported. Review and approve cases first."
        action={{
          label: 'Go to Review Queue',
          onClick: () => (window.location.href = '/review'),
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="border-b border-border bg-surface-base px-6 py-4">
        <h1 className="text-2xl font-bold text-white mb-2">Export Manager</h1>
        <p className="text-text-tertiary">
          Export approved cases in various formats for accounting and reporting
        </p>
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: Filters and case selection */}
        <div className="w-2/3 border-r border-border flex flex-col">
          {/* Export preset selection */}
          <div className="border-b border-border bg-surface-base px-6 py-4">
            <h2 className="text-sm font-semibold text-text-secondary mb-3">Export Format</h2>
            <div className="grid grid-cols-3 gap-3">
              {DEFAULT_EXPORT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedPreset.id === preset.id
                      ? 'border-primary-600 bg-primary-600/10'
                      : 'border-border bg-surface-base hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary-400" />
                    <span className="font-medium text-white text-sm">{preset.name}</span>
                  </div>
                  <span className="text-xs text-text-tertiary uppercase">{preset.format}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Case selection */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-secondary">
                Select Cases ({selectedCases.length} of {casesData.cases.length})
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                {selectedCases.length === casesData.cases.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {casesData.cases.map((caseItem) => (
                <label
                  key={caseItem.case_id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-base hover:bg-surface-elevated cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(caseItem.case_id)}
                    onChange={() => toggleCaseSelection(caseItem.case_id)}
                    className="w-4 h-4 text-primary-600 rounded border-border focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm truncate">
                        {caseItem.vendor_name || 'Unknown Vendor'}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">ID: {caseItem.case_id.slice(0, 8)}</span>
                      <span className="text-xs text-success-400">
                        {Math.round(caseItem.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export actions */}
          <div className="border-t border-border bg-surface-base px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={handleExportSelected}
                disabled={selectedCases.length === 0 || exportCaseMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportCaseMutation.isPending ? 'Exporting...' : `Export Selected (${selectedCases.length})`}
              </button>
              <button
                onClick={handleBulkExport}
                disabled={bulkExportMutation.isPending}
                className="px-4 py-2 border border-border text-white rounded-lg hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkExportMutation.isPending ? 'Starting...' : 'Export All Approved'}
              </button>
            </div>
          </div>
        </div>

        {/* Right pane: Export jobs history */}
        <div className="w-1/3 flex flex-col">
          <div className="border-b border-border bg-surface-base px-6 py-4">
            <h2 className="text-sm font-semibold text-text-secondary">Export History</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : exportJobs && exportJobs.length > 0 ? (
              <div className="space-y-3">
                {exportJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg border border-border bg-surface-base"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{job.format.toUpperCase()}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          job.status === 'completed'
                            ? 'bg-success-600/20 text-success-400'
                            : job.status === 'failed'
                            ? 'bg-error-600/20 text-error-400'
                            : 'bg-warning-600/20 text-warning-400'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary mb-2">
                      {job.caseCount} cases • {new Date(job.createdAt).toLocaleString()}
                    </div>
                    {job.downloadUrl && job.status === 'completed' && (
                      <a
                        href={job.downloadUrl}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        Download
                      </a>
                    )}
                    {job.error && (
                      <div className="text-xs text-error-400 mt-2">{job.error}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                <p className="text-sm text-text-tertiary">No export history yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

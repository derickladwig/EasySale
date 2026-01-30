/**
 * CapabilitiesDashboardPage Component
 * 
 * Administrative view showing which backend features are wired to UI vs stubbed.
 * Displays capability categorization and reachability score.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.8
 */

import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle, XCircle, Code, ExternalLink } from 'lucide-react';
import { useCapabilities } from '../hooks/useCapabilities';

// Capability definition matching design spec
export interface Capability {
  id: string;
  name: string;
  description: string;
  backendStatus: 'implemented' | 'stubbed' | 'not_implemented';
  uiStatus: 'wired' | 'exists_not_routed' | 'missing';
  endpoint?: string;
  route?: string;
  missingTasks?: string[];
}

// Capability summary for dashboard stats
export interface CapabilitySummary {
  total: number;
  enabledAndUsed: number;
  enabledButUnused: number;
  stubbed: number;
  backendOnly: number;
  reachabilityScore: number;
}

// Define all known capabilities in the system
const SYSTEM_CAPABILITIES: Capability[] = [
  {
    id: 'ocr_ingest',
    name: 'OCR Document Ingest',
    description: 'Upload and process documents via OCR',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'POST /api/ocr/ingest',
    route: '/vendor-bills/upload',
  },
  {
    id: 'ocr_preprocess',
    name: 'OCR Preprocessing',
    description: 'Image enhancement before OCR extraction',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'POST /api/ocr/preprocess',
    route: '/vendor-bills/upload',
  },
  {
    id: 'review_cases',
    name: 'Review Cases',
    description: 'Review and approve extracted document data',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET /api/cases',
    route: '/review',
  },
  {
    id: 'case_detail',
    name: 'Case Detail View',
    description: 'View detailed case information',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET /api/cases/{id}',
    route: '/review/:caseId',
  },
  {
    id: 'case_decide',
    name: 'Field Decision',
    description: 'Approve or reject individual field values',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'POST /api/cases/{id}/decide',
    route: '/review/:caseId',
  },
  {
    id: 'case_approve',
    name: 'Case Approval',
    description: 'Approve entire case',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'POST /api/cases/{id}/approve',
    route: '/review/:caseId',
  },
  {
    id: 'vendor_templates',
    name: 'Vendor Templates',
    description: 'Manage vendor-specific parsing templates',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET/POST /api/vendors/templates',
    route: '/vendor-bills/templates',
  },
  {
    id: 'reocr',
    name: 'Re-OCR Region',
    description: 'Re-process specific document regions',
    backendStatus: 'stubbed',
    uiStatus: 'wired',
    endpoint: 'POST /api/cases/{id}/reocr',
    route: '/review/:caseId',
    missingTasks: ['Implement re-OCR backend logic'],
  },
  {
    id: 'masks',
    name: 'Document Masks',
    description: 'Define regions to exclude from OCR',
    backendStatus: 'stubbed',
    uiStatus: 'wired',
    endpoint: 'POST /api/cases/{id}/masks',
    route: '/review/:caseId',
    missingTasks: ['Implement mask storage and retrieval'],
  },
  {
    id: 'case_export',
    name: 'Case Export',
    description: 'Export single case to CSV/JSON',
    backendStatus: 'stubbed',
    uiStatus: 'wired',
    endpoint: 'POST /api/cases/{id}/export',
    route: '/exports',
    missingTasks: ['Implement real export generation'],
  },
  {
    id: 'bulk_export',
    name: 'Bulk Export',
    description: 'Export multiple cases at once',
    backendStatus: 'stubbed',
    uiStatus: 'wired',
    endpoint: 'POST /api/data-management/export',
    route: '/exports',
    missingTasks: ['Implement bulk export with real data'],
  },
  {
    id: 'documents_center',
    name: 'Document Center',
    description: 'Central hub for document management',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET /api/cases',
    route: '/documents',
  },
  {
    id: 'forms',
    name: 'Form Templates',
    description: 'Manage form templates',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET /api/forms',
    route: '/forms',
  },
  {
    id: 'capabilities',
    name: 'Capabilities API',
    description: 'Query backend capabilities',
    backendStatus: 'implemented',
    uiStatus: 'wired',
    endpoint: 'GET /api/capabilities',
    route: '/admin/capabilities',
  },
];

/**
 * Categorize a capability based on its backend and UI status
 * Property 20: Capability Categorization Logic
 */
export function categorizeCapability(capability: Capability): 'enabledAndUsed' | 'enabledButUnused' | 'stubbed' | 'backendOnly' {
  if (capability.backendStatus === 'stubbed') {
    return 'stubbed';
  }
  
  if (capability.backendStatus === 'implemented' && capability.uiStatus === 'wired') {
    return 'enabledAndUsed';
  }
  
  if (capability.backendStatus === 'implemented' && capability.uiStatus === 'missing') {
    return 'backendOnly';
  }
  
  if (capability.backendStatus === 'implemented' && capability.uiStatus === 'exists_not_routed') {
    return 'enabledButUnused';
  }
  
  return 'backendOnly';
}

/**
 * Calculate reachability score
 * Property 21: Reachability Score Calculation
 */
export function calculateReachabilityScore(capabilities: Capability[]): number {
  const wiredCount = capabilities.filter(c => c.uiStatus === 'wired').length;
  const total = capabilities.length;
  return Math.round((wiredCount / total) * 100);
}

/**
 * Calculate capability summary statistics
 */
function calculateSummary(capabilities: Capability[]): CapabilitySummary {
  const summary: CapabilitySummary = {
    total: capabilities.length,
    enabledAndUsed: 0,
    enabledButUnused: 0,
    stubbed: 0,
    backendOnly: 0,
    reachabilityScore: 0,
  };

  capabilities.forEach(cap => {
    const category = categorizeCapability(cap);
    switch (category) {
      case 'enabledAndUsed':
        summary.enabledAndUsed++;
        break;
      case 'enabledButUnused':
        summary.enabledButUnused++;
        break;
      case 'stubbed':
        summary.stubbed++;
        break;
      case 'backendOnly':
        summary.backendOnly++;
        break;
    }
  });

  summary.reachabilityScore = calculateReachabilityScore(capabilities);

  return summary;
}

export const CapabilitiesDashboardPage: React.FC = () => {
  const { data: backendCapabilities, isLoading, error } = useCapabilities();

  // Calculate summary statistics
  const summary = useMemo(() => calculateSummary(SYSTEM_CAPABILITIES), []);

  // Group capabilities by category
  const groupedCapabilities = useMemo(() => {
    const groups: Record<string, Capability[]> = {
      enabledAndUsed: [],
      enabledButUnused: [],
      stubbed: [],
      backendOnly: [],
    };

    SYSTEM_CAPABILITIES.forEach(cap => {
      const category = categorizeCapability(cap);
      groups[category].push(cap);
    });

    return groups;
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-16 h-16 text-error-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load capabilities</h3>
        <p className="text-text-tertiary mb-6">
          {error instanceof Error ? error.message : 'An error occurred'}
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'enabledAndUsed':
        return <CheckCircle className="w-5 h-5 text-success-400" />;
      case 'stubbed':
        return <AlertCircle className="w-5 h-5 text-warning-400" />;
      case 'enabledButUnused':
      case 'backendOnly':
        return <XCircle className="w-5 h-5 text-text-tertiary" />;
      default:
        return <Code className="w-5 h-5 text-text-tertiary" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'enabledAndUsed':
        return 'Enabled & Used';
      case 'enabledButUnused':
        return 'Enabled but Unused';
      case 'stubbed':
        return 'Stubbed';
      case 'backendOnly':
        return 'Backend Only';
      default:
        return category;
    }
  };

  const getStatusBadge = (backendStatus: string, uiStatus: string) => {
    if (backendStatus === 'stubbed') {
      return <span className="px-2 py-1 text-xs rounded bg-warning-600/20 text-warning-400">Stubbed</span>;
    }
    if (backendStatus === 'implemented' && uiStatus === 'wired') {
      return <span className="px-2 py-1 text-xs rounded bg-success-600/20 text-success-400">Ready</span>;
    }
    if (backendStatus === 'implemented' && uiStatus !== 'wired') {
      return <span className="px-2 py-1 text-xs rounded bg-surface-overlay/20 text-text-tertiary">Not Wired</span>;
    }
    return <span className="px-2 py-1 text-xs rounded bg-surface-overlay/20 text-text-tertiary">Unknown</span>;
  };

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="border-b border-border bg-surface-base px-6 py-4">
        <h1 className="text-2xl font-bold text-white mb-2">Capabilities Dashboard</h1>
        <p className="text-text-tertiary">
          System capabilities and UI wiring status
        </p>
      </div>

      {/* Summary Cards - Requirement 12.4 */}
      <div className="border-b border-border bg-surface-base px-6 py-4">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-background-primary rounded-lg p-4 border border-border">
            <div className="text-3xl font-bold text-white mb-1">{summary.reachabilityScore}%</div>
            <div className="text-sm text-text-tertiary">Reachability Score</div>
          </div>
          <div className="bg-background-primary rounded-lg p-4 border border-success-600/30">
            <div className="text-3xl font-bold text-success-400 mb-1">{summary.enabledAndUsed}</div>
            <div className="text-sm text-text-tertiary">Enabled & Used</div>
          </div>
          <div className="bg-background-primary rounded-lg p-4 border border-border">
            <div className="text-3xl font-bold text-text-tertiary mb-1">{summary.enabledButUnused}</div>
            <div className="text-sm text-text-tertiary">Enabled but Unused</div>
          </div>
          <div className="bg-background-primary rounded-lg p-4 border border-warning-600/30">
            <div className="text-3xl font-bold text-warning-400 mb-1">{summary.stubbed}</div>
            <div className="text-sm text-text-tertiary">Stubbed</div>
          </div>
          <div className="bg-background-primary rounded-lg p-4 border border-border">
            <div className="text-3xl font-bold text-text-tertiary mb-1">{summary.backendOnly}</div>
            <div className="text-sm text-text-tertiary">Backend Only</div>
          </div>
        </div>
      </div>

      {/* Capabilities Table - Requirement 12.1, 12.3 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {Object.entries(groupedCapabilities).map(([category, capabilities]) => (
          capabilities.length > 0 && (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {getCategoryIcon(category)}
                <h2 className="text-lg font-semibold text-white">
                  {getCategoryLabel(category)} ({capabilities.length})
                </h2>
              </div>

              <div className="space-y-2">
                {capabilities.map((cap) => (
                  <div
                    key={cap.id}
                    className="bg-surface-base rounded-lg p-4 border border-border hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{cap.name}</h3>
                          {getStatusBadge(cap.backendStatus, cap.uiStatus)}
                        </div>
                        <p className="text-sm text-text-tertiary">{cap.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {cap.endpoint && (
                        <div>
                          <span className="text-text-disabled">Endpoint:</span>
                          <code className="ml-2 text-primary-400 font-mono text-xs">{cap.endpoint}</code>
                        </div>
                      )}
                      {cap.route && (
                        <div className="flex items-center gap-2">
                          <span className="text-text-disabled">Route:</span>
                          <a
                            href={cap.route}
                            className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            {cap.route}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Missing tasks - Requirement 12.5 */}
                    {cap.missingTasks && cap.missingTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-text-disabled mb-1">Missing tasks:</div>
                        <ul className="list-disc list-inside text-xs text-warning-400 space-y-1">
                          {cap.missingTasks.map((task, idx) => (
                            <li key={idx}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Backend Capabilities Info */}
      {backendCapabilities && (
        <div className="border-t border-border bg-surface-base px-6 py-4">
          <div className="text-sm text-text-tertiary">
            <span className="font-semibold text-white">Backend Info:</span>
            {' '}Version {backendCapabilities.version}
            {' • '}Build {backendCapabilities.build_hash.slice(0, 8)}
            {' • '}Accounting: {backendCapabilities.accounting_mode}
            {' • '}Export: {backendCapabilities.features.export ? 'Enabled' : 'Disabled'}
            {' • '}Sync: {backendCapabilities.features.sync ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      )}
    </div>
  );
};

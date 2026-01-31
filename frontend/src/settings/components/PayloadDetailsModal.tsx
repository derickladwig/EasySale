import React, { useState, useEffect } from 'react';
import { X, Copy, Check, AlertTriangle, Clock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { syncApi } from '../../services/syncApi';
import { useAuth } from '@common/contexts/AuthContext';
import { redactPII, REDACTION_BANNER_TEXT } from '@common/utils/piiRedaction';

interface FailedRecordDetails {
  id: number;
  entity: string;
  sourceId: string;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  lastAttemptAt: string;
  createdAt: string;
  payload?: unknown;
  retryHistory?: Array<{
    attemptedAt: string;
    errorMessage: string;
  }>;
}

interface PayloadDetailsModalProps {
  recordId: number;
  onClose: () => void;
}

/**
 * PayloadDetailsModal - Displays detailed information about a failed sync record
 * 
 * Validates: Requirements 12.4, 17.1, 17.2, 17.3, 17.4
 * 
 * Features:
 * - Read-only JSON viewer for payload
 * - Full error message and stack trace
 * - Retry history
 * - PII redaction for sensitive fields
 * - Manager role check for viewing
 */
export const PayloadDetailsModal: React.FC<PayloadDetailsModalProps> = ({
  recordId,
  onClose,
}) => {
  const { user } = useAuth();
  const [details, setDetails] = useState<FailedRecordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);

  // Check if user has manager role for viewing sensitive data
  // Validates: Requirements 17.4
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await syncApi.getFailedRecordDetails(recordId);
        setDetails(data);
      } catch (err) {
        console.error('Failed to load record details:', err);
        setError('Failed to load record details');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [recordId]);

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Copy payload to clipboard
  const handleCopyPayload = async () => {
    if (!details?.payload) return;

    try {
      const payloadStr = JSON.stringify(
        isManager && showRawPayload ? details.payload : redactPII(details.payload),
        null,
        2
      );
      await navigator.clipboard.writeText(payloadStr);
      setCopied(true);
      toast.success('Payload copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy payload');
    }
  };

  // Format payload for display with PII redaction
  // Validates: Requirements 17.1, 17.2, 17.3
  const formatPayload = (payload: unknown): string => {
    if (!payload) return 'No payload data';
    
    // Apply PII redaction unless manager is viewing raw
    const displayPayload = isManager && showRawPayload ? payload : redactPII(payload);
    return JSON.stringify(displayPayload, null, 2);
  };

  // Check if max retries exceeded
  const isMaxRetriesExceeded = details && details.retryCount >= details.maxRetries;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex: 'var(--z-modal)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payload-modal-title"
    >
      <div className="bg-surface-base border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 id="payload-modal-title" className="text-xl font-semibold text-text-primary">
              Failed Record Details
            </h2>
            {details && (
              <p className="text-sm text-text-tertiary mt-1">
                {details.entity} • ID: {details.sourceId}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4 text-error-400">
              {error}
            </div>
          )}

          {details && !loading && (
            <>
              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-elevated rounded-lg p-4">
                  <div className="text-sm text-text-tertiary">Retry Count</div>
                  <div className="text-xl font-semibold text-text-primary mt-1">
                    {details.retryCount} / {details.maxRetries}
                  </div>
                  {isMaxRetriesExceeded && (
                    <div className="flex items-center gap-1 mt-2 text-warning-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Max Retries Exceeded
                    </div>
                  )}
                </div>
                <div className="bg-surface-elevated rounded-lg p-4">
                  <div className="text-sm text-text-tertiary">Last Attempt</div>
                  <div className="text-sm font-medium text-text-primary mt-1">
                    {new Date(details.lastAttemptAt).toLocaleString()}
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-4">
                  <div className="text-sm text-text-tertiary">Next Retry</div>
                  <div className="text-sm font-medium text-text-primary mt-1">
                    {details.nextRetryAt
                      ? new Date(details.nextRetryAt).toLocaleString()
                      : isMaxRetriesExceeded
                      ? 'Manual intervention required'
                      : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Error Message</h3>
                <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                  <pre className="text-sm text-error-400 whitespace-pre-wrap font-mono">
                    {details.errorMessage}
                  </pre>
                </div>
              </div>

              {/* Payload */}
              {details.payload && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">Payload</h3>
                    <div className="flex items-center gap-2">
                      {isManager && (
                        <Button
                          onClick={() => setShowRawPayload(!showRawPayload)}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          {showRawPayload ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide Raw
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Show Raw
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={handleCopyPayload}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* PII Redaction Banner */}
                  {/* Validates: Requirements 17.3 */}
                  {(!isManager || !showRawPayload) && (
                    <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-3 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-400" />
                      <span className="text-sm text-warning-400">{REDACTION_BANNER_TEXT}</span>
                    </div>
                  )}

                  <div className="bg-surface-elevated rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-text-secondary font-mono whitespace-pre-wrap">
                      {formatPayload(details.payload)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Retry History */}
              {details.retryHistory && details.retryHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Retry History</h3>
                  <div className="space-y-2">
                    {details.retryHistory.map((attempt, index) => (
                      <div
                        key={index}
                        className="bg-surface-elevated rounded-lg p-3 border border-border-default"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-text-tertiary" />
                          <span className="text-sm text-text-secondary">
                            {new Date(attempt.attemptedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-error-400 font-mono">
                          {attempt.errorMessage}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-text-disabled">
                Created: {new Date(details.createdAt).toLocaleString()}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PayloadDetailsModal;

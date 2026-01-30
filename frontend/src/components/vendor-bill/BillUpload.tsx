/**
 * BillUpload Component
 *
 * File upload interface for vendor bills with drag-and-drop support
 * Requirements: 1.1, 1.7, 5.1, 5.3, 2.6, 2.7
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIngestDocument } from '../../documents/hooks/useIngestDocument';
import { toast } from '../../common/utils/toast';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface BillUploadProps {
  onUploadComplete?: (billId: string) => void;
}

type UploadStage = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface UploadProgress {
  stage: UploadStage;
  percent: number;
  message: string;
}

export const BillUpload: React.FC<BillUploadProps> = ({ onUploadComplete }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    percent: 0,
    message: '',
  });
  
  const ingestMutation = useIngestDocument();
  const uploading = ingestMutation.isPending;

  // Simulate progress stages during upload
  useEffect(() => {
    if (uploading && uploadProgress.stage === 'uploading') {
      const stages = [
        { percent: 30, message: 'Uploading file...', delay: 500 },
        { percent: 50, message: 'Detecting vendor...', delay: 1500 },
        { percent: 70, message: 'Running OCR extraction...', delay: 2500 },
        { percent: 90, message: 'Validating results...', delay: 3500 },
      ];

      const timers = stages.map(({ percent, message, delay }) =>
        setTimeout(() => {
          if (uploading) {
            setUploadProgress(prev => ({
              ...prev,
              percent,
              message,
            }));
          }
        }, delay)
      );

      return () => timers.forEach(clearTimeout);
    }
  }, [uploading, uploadProgress.stage]);

  // Accepted file types
  const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, JPG, PNG, or TIFF files.';
    }
    if (file.size > maxFileSize) {
      return 'File size exceeds 10MB limit.';
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setError(null);
    setUploadProgress({
      stage: 'uploading',
      percent: 10,
      message: 'Starting upload...',
    });

    try {
      const response = await ingestMutation.mutateAsync({
        file,
        vendorId: vendorId || undefined,
      });

      // Update to complete state
      setUploadProgress({
        stage: 'complete',
        percent: 100,
        message: 'Document processed successfully!',
      });

      // Show success toast with case ID
      toast.success(`Document uploaded successfully! Case ID: ${response.case_id}`, {
        description: `Estimated processing time: ${Math.round(response.estimated_time_ms / 1000)}s`,
      });

      // Short delay to show completion state
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(response.case_id);
        } else {
          // Navigate to review queue
          navigate('/review');
        }
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload document. Please try again.';
      setError(errorMessage);
      setUploadProgress({
        stage: 'error',
        percent: 0,
        message: errorMessage,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-surface-base rounded-lg shadow-md p-6 border border-border">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Upload Document
        </h2>

        {/* Drag and Drop Zone */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              dragActive
                ? 'border-accent bg-info-50 dark:bg-info-900/20'
                : 'border-border hover:border-border-dark'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-text-tertiary"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-accent hover:text-accent-hover font-medium"
            >
              Choose a file
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileInput}
              disabled={uploading}
            />
            <span className="text-text-secondary"> or drag and drop</span>
          </div>
          <p className="text-sm text-text-tertiary mt-2">
            PDF, JPG, PNG, or TIFF up to 10MB
          </p>
        </div>

        {/* Selected File Info */}
        {file && (
          <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="h-8 w-8 text-text-tertiary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-error hover:text-error-dark"
                disabled={uploading}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Vendor Selection (Optional) */}
        <div className="mt-6">
          <label
            htmlFor="vendor-id"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Vendor (Optional)
          </label>
          <input
            type="text"
            id="vendor-id"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            placeholder="Leave blank for auto-detection"
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent bg-surface-elevated text-text-primary"
            disabled={uploading}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            If left blank, the system will attempt to detect the vendor automatically
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/vendor-bills')}
            className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-text-secondary bg-surface-elevated hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
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
                Processing...
              </span>
            ) : (
              'Upload Document'
            )}
          </button>
        </div>

        {/* OCR Status Info */}
        {uploading && (
          <div className="mt-4 p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded-md">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-info-dark dark:text-info"
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
              <div>
                <p className="text-sm font-medium text-info-dark dark:text-info">
                  Processing Document
                </p>
                <p className="text-xs text-info-600 dark:text-info-400 mt-1">
                  Uploading file, detecting vendor, and queuing for OCR processing...
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-info-200 dark:bg-info-800 rounded-full h-1.5">
                <div 
                  className="bg-info-500 h-1.5 rounded-full animate-pulse" 
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {uploadProgress.stage !== 'idle' && (
          <div className="mt-6 p-4 bg-surface-elevated rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-3">
              {uploadProgress.stage === 'uploading' && (
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              )}
              {uploadProgress.stage === 'processing' && (
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              )}
              {uploadProgress.stage === 'complete' && (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
              {uploadProgress.stage === 'error' && (
                <AlertCircle className="w-5 h-5 text-error" />
              )}
              <span className={`text-sm font-medium ${
                uploadProgress.stage === 'complete' ? 'text-success' :
                uploadProgress.stage === 'error' ? 'text-error' :
                'text-text-primary'
              }`}>
                {uploadProgress.message}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-surface-base rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  uploadProgress.stage === 'complete' ? 'bg-success' :
                  uploadProgress.stage === 'error' ? 'bg-error' :
                  'bg-primary-500'
                }`}
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            
            {/* Stage Indicators */}
            <div className="flex justify-between mt-3 text-xs text-text-tertiary">
              <span className={uploadProgress.percent >= 10 ? 'text-primary-400' : ''}>Upload</span>
              <span className={uploadProgress.percent >= 50 ? 'text-primary-400' : ''}>Detect Vendor</span>
              <span className={uploadProgress.percent >= 70 ? 'text-primary-400' : ''}>OCR</span>
              <span className={uploadProgress.percent >= 100 ? 'text-success' : ''}>Complete</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

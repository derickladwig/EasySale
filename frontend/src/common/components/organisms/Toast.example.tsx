import React, { useState } from 'react';
import { ToastVariant } from './Toast';
import { ToastContainer } from './ToastContainer';

/**
 * Toast Component Examples
 * 
 * This file demonstrates all toast features including:
 * - Semantic color variants (Requirement 11.2)
 * - Auto-dismiss functionality (Requirement 11.3)
 * - Manual dismissal (Requirement 11.4)
 * - Vertical stacking (Requirement 11.5)
 * - Slide-in animation (Requirement 11.6)
 * - Icon matching toast type (Requirement 11.7)
 * - 8px gap between stacked toasts (Requirement 11.8)
 * - Smooth slide-up on dismiss (Requirement 11.9)
 * - Full-width on mobile (Requirement 11.10)
 */

interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export const ToastExamples: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [nextId, setNextId] = useState(1);

  const addToast = (message: string, variant: ToastVariant = 'info', duration = 5000) => {
    const id = `toast-${nextId}`;
    setNextId(nextId + 1);
    setToasts([...toasts, { id, message, variant, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(toasts.filter(toast => toast.id !== id));
  };

  return (
    <div className="min-h-screen bg-background-primary p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-h1 font-semibold text-text-primary mb-2">
            Toast Component Examples
          </h1>
          <p className="text-text-secondary">
            Demonstrates all toast features including responsive behavior, stacking, and animations.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-background-secondary rounded-lg p-6 space-y-4">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Add Toasts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Success Toast */}
            <button
              onClick={() => addToast('Operation completed successfully!', 'success')}
              className="px-4 py-3 bg-success-DEFAULT hover:bg-success-dark text-white rounded-lg font-medium transition-colors"
            >
              Add Success Toast
            </button>

            {/* Error Toast */}
            <button
              onClick={() => addToast('An error occurred. Please try again.', 'error')}
              className="px-4 py-3 bg-error-DEFAULT hover:bg-error-dark text-white rounded-lg font-medium transition-colors"
            >
              Add Error Toast
            </button>

            {/* Warning Toast */}
            <button
              onClick={() => addToast('Warning: This action cannot be undone.', 'warning')}
              className="px-4 py-3 bg-warning-DEFAULT hover:bg-warning-dark text-white rounded-lg font-medium transition-colors"
            >
              Add Warning Toast
            </button>

            {/* Info Toast */}
            <button
              onClick={() => addToast('New updates are available.', 'info')}
              className="px-4 py-3 bg-info-DEFAULT hover:bg-info-dark text-white rounded-lg font-medium transition-colors"
            >
              Add Info Toast
            </button>

            {/* No Auto-dismiss */}
            <button
              onClick={() => addToast('This toast will not auto-dismiss.', 'info', 0)}
              className="px-4 py-3 bg-background-tertiary hover:bg-surface-elevated text-text-primary rounded-lg font-medium transition-colors"
            >
              Add Persistent Toast
            </button>

            {/* Multiple Toasts */}
            <button
              onClick={() => {
                addToast('First toast', 'success');
                setTimeout(() => addToast('Second toast', 'info'), 200);
                setTimeout(() => addToast('Third toast', 'warning'), 400);
              }}
              className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              Add Multiple Toasts
            </button>
          </div>

          {/* Clear All */}
          {toasts.length > 0 && (
            <button
              onClick={() => setToasts([])}
              className="w-full px-4 py-3 bg-background-tertiary hover:bg-surface-elevated text-text-primary rounded-lg font-medium transition-colors"
            >
              Clear All Toasts ({toasts.length})
            </button>
          )}
        </div>

        {/* Requirements Documentation */}
        <div className="bg-background-secondary rounded-lg p-6 space-y-6">
          <h2 className="text-h3 font-semibold text-text-primary">
            Responsive Features
          </h2>

          <div className="space-y-4">
            {/* Requirement 11.8 */}
            <div className="border-l-4 border-primary-500 pl-4">
              <h3 className="text-lg font-medium text-text-primary mb-1">
                Requirement 11.8: 8px Gap Between Stacked Toasts
              </h3>
              <p className="text-text-secondary text-sm">
                When multiple toasts are displayed, they are stacked vertically with an 8px gap between them.
                This is implemented using Tailwind's <code className="bg-background-tertiary px-1 rounded">gap-2</code> class
                (0.5rem = 8px).
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                <strong>Try it:</strong> Click "Add Multiple Toasts" to see the 8px spacing between toasts.
              </p>
            </div>

            {/* Requirement 11.9 */}
            <div className="border-l-4 border-success-DEFAULT pl-4">
              <h3 className="text-lg font-medium text-text-primary mb-1">
                Requirement 11.9: Smooth Slide-Up on Dismiss
              </h3>
              <p className="text-text-secondary text-sm">
                When a toast is dismissed, the remaining toasts smoothly slide up to fill the space.
                This is achieved through CSS transitions on the flexbox layout with gap property.
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                <strong>Try it:</strong> Add multiple toasts and dismiss one in the middle to see the smooth slide-up animation.
              </p>
            </div>

            {/* Requirement 11.10 */}
            <div className="border-l-4 border-info-DEFAULT pl-4">
              <h3 className="text-lg font-medium text-text-primary mb-1">
                Requirement 11.10: Full-Width on Mobile
              </h3>
              <p className="text-text-secondary text-sm">
                On mobile devices (screens &lt; 640px), toasts are displayed full-width at the top of the screen
                with no rounded corners. On desktop, they appear in the top-right corner with rounded corners.
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                <strong>Try it:</strong> Resize your browser window to &lt; 640px width to see the mobile layout.
              </p>
              <div className="mt-2 space-y-1 text-xs text-text-tertiary">
                <p>• Desktop: <code className="bg-background-tertiary px-1 rounded">top-4 right-4</code> positioning</p>
                <p>• Mobile: <code className="bg-background-tertiary px-1 rounded">top-0 right-0 left-0</code> positioning (full-width)</p>
                <p>• Desktop: <code className="bg-background-tertiary px-1 rounded">min-w-[300px] max-w-md rounded-lg</code></p>
                <p>• Mobile: <code className="bg-background-tertiary px-1 rounded">min-w-full rounded-none</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Details */}
        <div className="bg-background-secondary rounded-lg p-6 space-y-4">
          <h2 className="text-h3 font-semibold text-text-primary">
            Implementation Details
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium text-text-primary mb-1">Toast Component</h4>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Semantic color variants: success (green), error (red), warning (yellow), info (blue)</li>
                <li>Auto-dismiss after 5 seconds (configurable, 0 = no auto-dismiss)</li>
                <li>Manual dismissal with close button</li>
                <li>Slide-in animation from right (300ms ease-out)</li>
                <li>Slide-out animation to right on dismiss (300ms ease-in)</li>
                <li>Icon matching toast type (CheckCircle, AlertCircle, AlertTriangle, Info)</li>
                <li>Mobile: full-width with no rounded corners</li>
                <li>Desktop: min-width 300px, max-width 28rem (448px)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-1">ToastContainer Component</h4>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Desktop: positioned in top-right corner (top-4 right-4)</li>
                <li>Mobile: positioned at top full-width (top-0 right-0 left-0)</li>
                <li>Vertical stacking with flexbox (flex flex-col)</li>
                <li>8px gap between toasts (gap-2 = 0.5rem = 8px)</li>
                <li>Smooth slide-up when toast is dismissed (CSS transitions)</li>
                <li>Proper z-index layering (z-toast = 1080)</li>
                <li>Pointer events only on toasts, not container</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-1">Responsive Behavior</h4>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Breakpoint: 640px (sm) - below this is considered mobile</li>
                <li>Mobile: <code className="bg-background-tertiary px-1 rounded">max-sm:*</code> classes apply</li>
                <li>Desktop: default classes apply</li>
                <li>Smooth transitions between breakpoints</li>
                <li>No horizontal scrolling at any breakpoint</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current State */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Current State
          </h2>
          <div className="space-y-2 text-sm">
            <p className="text-text-secondary">
              <strong className="text-text-primary">Active Toasts:</strong> {toasts.length}
            </p>
            {toasts.length > 0 && (
              <div className="mt-4 space-y-2">
                {toasts.map((toast, index) => (
                  <div
                    key={toast.id}
                    className="flex items-center justify-between bg-background-tertiary rounded p-2"
                  >
                    <span className="text-text-secondary">
                      {index + 1}. {toast.message}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {toast.variant} • {toast.duration === 0 ? 'persistent' : `${toast.duration}ms`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default ToastExamples;

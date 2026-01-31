import React from 'react';

interface FlagChipsProps {
  hardFlags?: string[];
  softFlags?: string[];
}

export const FlagChips: React.FC<FlagChipsProps> = ({ hardFlags = [], softFlags = [] }) => {
  if (hardFlags.length === 0 && softFlags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {hardFlags.map((flag, index) => (
        <span
          key={`hard-${index}`}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-error-100)] text-[var(--color-error-800)] border border-[var(--color-error-200)]"
          title="Hard flag - must be resolved"
        >
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {flag}
        </span>
      ))}
      {softFlags.map((flag, index) => (
        <span
          key={`soft-${index}`}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-warning-100)] text-[var(--color-warning-800)] border border-[var(--color-warning-200)]"
          title="Soft flag - review recommended"
        >
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {flag}
        </span>
      ))}
    </div>
  );
};

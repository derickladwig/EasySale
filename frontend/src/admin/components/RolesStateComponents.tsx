import React from 'react';
import { LoadingSpinner } from '@common/components/organisms';

export function RolesLoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="lg" />
      <span className="ml-3 text-text-secondary">Loading roles...</span>
    </div>
  );
}

export interface RolesErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function RolesErrorState({ error, onRetry }: RolesErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-error mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium">Failed to load roles</h3>
      </div>
      <p className="text-text-secondary mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Try Again
      </button>
    </div>
  );
}

export function RolesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-text-tertiary mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-lg font-medium text-text-primary">No roles found</h3>
      </div>
      <p className="text-text-secondary mb-4">
        No roles have been configured yet. Create your first role to get started.
      </p>
    </div>
  );
}

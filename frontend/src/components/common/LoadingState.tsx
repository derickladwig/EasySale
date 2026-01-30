/**
 * LoadingState Component
 * 
 * Provides skeleton loading states for pages with consistent animation.
 * Matches page layout structure for smooth transitions.
 * 
 * Requirements: 16.1
 */

import React from 'react';

interface LoadingStateProps {
  /** Layout variant to match the page structure */
  variant?: 'default' | 'table' | 'cards' | 'detail';
  /** Optional custom className */
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ variant = 'default', className = '' }) => {
  const baseClasses = 'animate-pulse';

  if (variant === 'table') {
    return (
      <div className={`${baseClasses} space-y-4 ${className}`}>
        {/* Header skeleton */}
        <div className="h-8 bg-surface-elevated rounded w-1/4" />
        
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-surface-elevated rounded" />
          <div className="h-24 bg-surface-elevated rounded" />
          <div className="h-24 bg-surface-elevated rounded" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-2">
          <div className="h-12 bg-surface-elevated rounded" />
          <div className="h-16 bg-surface-elevated rounded" />
          <div className="h-16 bg-surface-elevated rounded" />
          <div className="h-16 bg-surface-elevated rounded" />
          <div className="h-16 bg-surface-elevated rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`${baseClasses} space-y-4 ${className}`}>
        {/* Header skeleton */}
        <div className="h-8 bg-surface-elevated rounded w-1/4" />
        
        {/* Cards grid skeleton */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-48 bg-surface-elevated rounded" />
          <div className="h-48 bg-surface-elevated rounded" />
          <div className="h-48 bg-surface-elevated rounded" />
          <div className="h-48 bg-surface-elevated rounded" />
          <div className="h-48 bg-surface-elevated rounded" />
          <div className="h-48 bg-surface-elevated rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={`${baseClasses} space-y-4 ${className}`}>
        {/* Header skeleton */}
        <div className="h-8 bg-surface-elevated rounded w-1/3" />
        
        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-64 bg-surface-elevated rounded" />
            <div className="h-32 bg-surface-elevated rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-surface-elevated rounded" />
            <div className="h-48 bg-surface-elevated rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`${baseClasses} space-y-4 ${className}`}>
      <div className="h-8 bg-surface-elevated rounded w-1/4" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-surface-elevated rounded" />
        <div className="h-24 bg-surface-elevated rounded" />
        <div className="h-24 bg-surface-elevated rounded" />
      </div>
      <div className="h-64 bg-surface-elevated rounded" />
    </div>
  );
};

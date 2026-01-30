/**
 * Skeleton Component
 *
 * Base skeleton component for creating loading placeholders.
 * Provides a pulsing animation to indicate content is loading.
 *
 * Requirements:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-4 w-full" />
 *
 * @example
 * // Circle skeleton (for avatars)
 * <Skeleton variant="circle" className="w-12 h-12" />
 *
 * @example
 * // Custom animation speed
 * <Skeleton className="h-4 w-full" speed="fast" />
 */

import React from 'react';
import { cn } from '../../utils/classNames';

export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;

  /** Variant of the skeleton */
  variant?: 'rectangle' | 'circle' | 'text';

  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast';

  /** Width of the skeleton (for text variant) */
  width?: string | number;

  /** Height of the skeleton */
  height?: string | number;
}

/**
 * Base Skeleton component
 * Displays an animated placeholder while content is loading
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangle',
  speed = 'normal',
  width,
  height,
}) => {
  // Animation duration based on speed
  const animationDuration = {
    slow: 'animate-pulse-slow',
    normal: 'animate-pulse',
    fast: 'animate-pulse-fast',
  }[speed];

  // Variant-specific styles
  const variantStyles = {
    rectangle: 'rounded',
    circle: 'rounded-full',
    text: 'rounded',
  }[variant];

  // Default dimensions for text variant
  const defaultTextWidth = variant === 'text' ? 'w-full' : '';
  const defaultTextHeight = variant === 'text' ? 'h-4' : '';

  return (
    <div
      className={cn(
        'bg-background-tertiary',
        variantStyles,
        animationDuration,
        defaultTextWidth,
        defaultTextHeight,
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      aria-busy="true"
      aria-live="polite"
      role="status"
    />
  );
};

/**
 * Skeleton Text component
 * Displays multiple lines of skeleton text
 */
export interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;

  /** Width of the last line (percentage or specific value) */
  lastLineWidth?: string;

  /** Spacing between lines */
  spacing?: 'tight' | 'normal' | 'loose';

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  spacing = 'normal',
  className,
}) => {
  const spacingClass = {
    tight: 'space-y-2',
    normal: 'space-y-3',
    loose: 'space-y-4',
  }[spacing];

  return (
    <div className={cn(spacingClass, className)}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLastLine = index === lines - 1;
        return (
          <Skeleton
            key={index}
            variant="text"
            className="h-4"
            width={isLastLine ? lastLineWidth : undefined}
          />
        );
      })}
    </div>
  );
};

/**
 * Skeleton Avatar component
 * Displays a circular skeleton for avatar placeholders
 */
export interface SkeletonAvatarProps {
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ size = 'md', className }) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  return <Skeleton variant="circle" className={cn(sizeClass, className)} />;
};

export default Skeleton;

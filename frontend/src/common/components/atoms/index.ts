/**
 * Atoms - Basic Building Blocks
 *
 * Atomic components that serve as the foundation for more complex components.
 * These are the smallest, most reusable UI elements.
 */

// Button component
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Badge component
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Input component
export { Input } from './Input';
export type { InputProps, InputVariant } from './Input';

// Icon component
export { Icon } from './Icon';
export type { IconProps, IconSize } from './Icon';

// Spinner components for loading states
export {
  Spinner,
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
} from './Spinner';
export type {
  SpinnerProps,
  ButtonSpinnerProps,
  PageSpinnerProps,
  InlineSpinnerProps,
  SpinnerSize,
  SpinnerVariant,
} from './Spinner';

// Skeleton components for loading states
export { Skeleton, SkeletonText, SkeletonAvatar } from './Skeleton';
export type { SkeletonProps, SkeletonTextProps, SkeletonAvatarProps } from './Skeleton';

export { SkeletonCard, SkeletonCardGrid } from './SkeletonCard';
export type { SkeletonCardProps, SkeletonCardGridProps } from './SkeletonCard';

export { SkeletonTable, SkeletonTableWithPagination } from './SkeletonTable';
export type { SkeletonTableProps, SkeletonTableWithPaginationProps } from './SkeletonTable';

export {
  SkeletonForm,
  SkeletonFormSection,
  SkeletonFormTabs,
} from './SkeletonForm';
export type {
  SkeletonFormProps,
  SkeletonFormField,
  SkeletonFormFieldType,
  SkeletonFormSectionProps,
  SkeletonFormTabsProps,
} from './SkeletonForm';

// Additional specialized skeleton screens
export {
  SkeletonList,
  SkeletonGrid,
  SkeletonDashboard,
} from './SkeletonScreens';
export type {
  SkeletonListProps,
  SkeletonGridProps,
  SkeletonDashboardProps,
} from './SkeletonScreens';

// Progress bar components for loading states
export {
  ProgressBar,
  DeterminateProgressBar,
  IndeterminateProgressBar,
} from './ProgressBar';
export type {
  ProgressBarProps,
  DeterminateProgressBarProps,
  IndeterminateProgressBarProps,
  ProgressBarSize,
  ProgressBarVariant,
} from './ProgressBar';

// Empty state component
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateVariant } from './EmptyState';

// Logo with fallback component
export { LogoWithFallback } from './LogoWithFallback';
export type { LogoWithFallbackProps } from './LogoWithFallback';

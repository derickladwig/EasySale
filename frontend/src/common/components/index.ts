/**
 * Common Components - Unified Design System
 *
 * This file exports all components from the atomic design structure.
 * Components are organized by complexity:
 * - Atoms: Basic building blocks (Button, Input, Badge, Icon)
 * - Molecules: Simple combinations (FormField, SearchBar)
 * - Organisms: Complex components (DataTable, Modal, Toast)
 * - Templates: Page-level layouts (DashboardTemplate, SalesTemplate)
 *
 * Import examples:
 * ```typescript
 * // Import specific components
 * import { Button, Input } from '@common/components';
 *
 * // Import from specific level
 * import { Button } from '@common/components/atoms';
 * import { FormField } from '@common/components/molecules';
 * import { DataTable } from '@common/components/organisms';
 * ```
 */

// ============================================================================
// Atomic Design Structure
// ============================================================================

// Atoms - Basic building blocks
export * from './atoms';

// Molecules - Simple combinations
export * from './molecules';

// Organisms - Complex components
export * from './organisms';

// Templates - Page-level layouts
export * from './templates';

// Layout Components - Structural layouts
export * from './layout';

// ============================================================================
// Unique Components (not part of atomic design)
// ============================================================================

// Error Handling
export { ErrorBoundary } from './ErrorBoundary';

// Route Guards
export { RequireAuth } from './RequireAuth';
export { RequirePermission } from './RequirePermission';
export { RequireSetup, withSetupRequired } from './RequireSetup';

// Navigation
export { Navigation } from './Navigation';

// ============================================================================
// Re-export commonly used types for convenience
// ============================================================================

// Button types
export type { ButtonProps, ButtonVariant, ButtonSize } from './atoms/Button';

// Input types
export type { InputProps, InputType, InputSize, InputVariant } from './atoms/Input';

// Badge types
export type { BadgeProps, BadgeVariant, BadgeSize } from './atoms/Badge';

// Icon types
export type { IconProps, IconSize } from './atoms/Icon';

// StatusIndicator types
export type { StatusIndicatorProps, StatusType, StatusSize } from './atoms/StatusIndicator';

// FormField types
export type { FormFieldProps } from './molecules/FormField';

// DataTable types
export type { DataTableProps, Column } from './organisms/DataTable';

// Modal types
export type { ModalProps, ModalSize } from './organisms/Modal';

// Toast types
export type { ToastProps, ToastVariant } from './organisms/Toast';

// Card types
export type { CardProps, CardVariant } from './organisms/Card';

// Tabs types
export type { TabsProps, TabItem } from './organisms/Tabs';

// Grid types
export type { GridProps } from './layout/Grid';

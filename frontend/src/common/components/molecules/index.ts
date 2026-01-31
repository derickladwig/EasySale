/**
 * Molecules - Simple Component Combinations
 *
 * Molecules are combinations of atoms that function together as a unit.
 * They are still relatively simple but provide more functionality than atoms alone.
 *
 * Molecules should be:
 * - Composed of 2-5 atoms
 * - Focused on a single task
 * - Reusable across different contexts
 * - Well-documented with usage examples
 *
 * Example molecules:
 * - FormField (Label + Input + Error Message)
 * - SearchBar (Input + Icon + Clear Button)
 * - Card (Container + Header + Body + Footer)
 * - StatusIndicator (Icon + Label)
 * - Dropdown (Button + Menu)
 */

// Export molecules here as they are created
export { EmptyDetailPane } from './EmptyDetailPane';
export type { EmptyDetailPaneProps, KeyboardShortcut } from './EmptyDetailPane';
export { EmptyChart } from './EmptyChart';
export type { EmptyChartProps } from './EmptyChart';
export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';
export { FormGroup } from './FormGroup';
export type { FormGroupLayout, FormGroupProps } from './FormGroup';
export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';
export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';
export { OfflineBanner } from './OfflineBanner';
export type { OfflineBannerProps } from './OfflineBanner';
export { SyncProgressIndicator } from './SyncProgressIndicator';
export type { SyncProgressIndicatorProps } from './SyncProgressIndicator';
export { ProfileMenu } from './ProfileMenu';
export { CapabilityGate } from './CapabilityGate';
export { ScopeSelector, persistScope, loadPersistedScope } from './ScopeSelector';
export type { ScopeSelectorProps, ScopeSelectorStore } from './ScopeSelector';
export { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmDialogVariant, UseConfirmDialogOptions, UseConfirmDialogReturn } from './ConfirmDialog';
// export { Card } from './Card';
// export { StatusIndicator } from './StatusIndicator';

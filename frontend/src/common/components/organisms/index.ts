/**
 * Organisms - Complex Component Assemblies
 *
 * Organisms are complex components composed of molecules and/or atoms.
 * They form distinct sections of an interface and often contain business logic.
 *
 * Organisms should be:
 * - Composed of multiple molecules and atoms
 * - Focused on a specific feature or section
 * - May contain state and business logic
 * - Well-documented with integration examples
 *
 * Example organisms:
 * - DataTable (Headers + Rows + Pagination + Sorting)
 * - ProductCard (Image + Title + Price + Actions)
 * - CartSummary (Items + Totals + Actions)
 * - Modal (Backdrop + Header + Body + Footer + Close Button)
 * - Navigation (Logo + Menu Items + User Menu)
 */

// Export organisms here as they are created
export { DataTable } from './DataTable';
export type { DataTableProps, Column } from './DataTable';
export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';
export { StatCard } from './StatCard';
export type { StatCardProps, StatCardVariant, TrendDirection } from './StatCard';
export { Toast } from './Toast';
export type { ToastProps, ToastVariant } from './Toast';
export { ToastContainer } from './ToastContainer';
export type { ToastContainerProps } from './ToastContainer';
export { ToastProvider, useToast } from '../../contexts/ToastContext';
export type { ToastOptions } from '../../contexts/ToastContext';
export { Alert } from './Alert';
export type { AlertProps, AlertVariant } from './Alert';
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';
export { LoadingSpinner } from './LoadingSpinner';
export type {
  LoadingSpinnerProps,
  LoadingSpinnerSize,
  LoadingSpinnerVariant,
} from './LoadingSpinner';
export { LoadingContainer } from './LoadingContainer';
export type { LoadingContainerProps } from './LoadingContainer';
export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';
export { Sidebar } from './Sidebar';
export type { SidebarProps, NavItem as SidebarNavItem } from './Sidebar';
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps, BreadcrumbItem } from './Breadcrumbs';
export { Tabs } from './Tabs';
export type { TabsProps, TabItem, TabsVariant } from './Tabs';
export { PageTabs } from './PageTabs';
export type { PageTabsProps, PageTabItem } from './PageTabs';
export { BottomNav } from './BottomNav';
export type { BottomNavProps, BottomNavItem } from './BottomNav';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { Panel } from './Panel';
export type { PanelProps } from './Panel';
// export { ProductCard } from './ProductCard';
// export { CartSummary } from './CartSummary';

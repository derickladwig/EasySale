/**
 * AppShell Component
 * 
 * Top-level layout component that manages sidebar, header, and content area positioning.
 * This is the ONLY component allowed to set sidebar and header positioning.
 * 
 * Features:
 * - CSS Grid layout with sidebar and main area
 * - Prevents content overlap through layout contracts
 * - Responsive behavior for mobile viewports
 * - Uses design tokens for all spacing and z-index values
 */

import React from 'react';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** Optional sidebar content (navigation, etc.) */
  sidebar?: React.ReactNode;
  /** Optional header content (top bar, breadcrumbs, etc.) */
  header?: React.ReactNode;
  /** Main content area */
  children: React.ReactNode;
  /** Control sidebar visibility on mobile (optional) */
  isSidebarOpen?: boolean;
  /** Callback when sidebar backdrop is clicked (mobile only) */
  onSidebarClose?: () => void;
}

/**
 * AppShell provides the top-level layout structure for the application.
 * 
 * Layout Contract:
 * - Sidebar width: var(--appSidebarW) = 240px
 * - Header height: var(--appHeaderH) = 64px
 * - Content padding: var(--pageGutter) = 16px
 * - Z-index: sidebar (--z-sidebar = 900), header (--z-header = 800)
 * 
 * Responsive Behavior:
 * - Desktop (>768px): Sidebar is static, always visible
 * - Mobile (<=768px): Sidebar is overlay, controlled by isSidebarOpen prop
 * 
 * @example
 * ```tsx
 * <AppShell
 *   sidebar={<Navigation />}
 *   header={<TopBar />}
 * >
 *   <PageContent />
 * </AppShell>
 * ```
 */
export function AppShell({
  sidebar,
  header,
  children,
  isSidebarOpen = false,
  onSidebarClose,
}: AppShellProps) {
  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      {sidebar && (
        <aside
          className={styles.sidebar}
          data-open={isSidebarOpen}
          aria-hidden={!isSidebarOpen ? 'true' : undefined}
        >
          {sidebar}
        </aside>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebar && isSidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={onSidebarClose}
          aria-label="Close sidebar"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSidebarClose?.();
            }
          }}
        />
      )}

      {/* Main area (header + content) */}
      <div className={styles.mainArea}>
        {/* Header */}
        {header && <header className={styles.header}>{header}</header>}

        {/* Content */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

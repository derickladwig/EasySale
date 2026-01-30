/**
 * PageHeader Component
 * 
 * Provides consistent page titles, breadcrumbs, and action buttons.
 * This is an extension point for the AppShell layout system.
 * 
 * Features:
 * - Title with optional breadcrumbs
 * - Action buttons area (right-aligned)
 * - Uses design tokens for spacing and typography
 * - Works in both light and dark themes
 */

import React from 'react';
import styles from './PageHeader.module.css';

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Optional href for navigation (if omitted, renders as plain text) */
  href?: string;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional action buttons or controls (right-aligned) */
  actions?: React.ReactNode;
}

/**
 * PageHeader provides a consistent header for pages with title, breadcrumbs, and actions.
 * 
 * Design Tokens Used:
 * - Spacing: var(--space-2), var(--space-3), var(--space-4)
 * - Typography: var(--font-size-2xl), var(--font-size-sm), var(--font-weight-semibold)
 * - Colors: var(--color-text-primary), var(--color-text-secondary), var(--color-accent)
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="Inventory Management"
 *   breadcrumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Inventory' }
 *   ]}
 *   actions={
 *     <Button variant="primary">Add Product</Button>
 *   }
 * />
 * ```
 */
export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((item, index) => (
              <li key={index} className={styles.breadcrumbItem}>
                {item.href ? (
                  <a href={item.href} className={styles.breadcrumbLink}>
                    {item.label}
                  </a>
                ) : (
                  <span className={styles.breadcrumbText}>{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className={styles.breadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title and Actions Row */}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}

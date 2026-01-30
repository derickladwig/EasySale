/**
 * PageHeader Component Examples
 * 
 * This file demonstrates various usage patterns for the PageHeader component.
 * These examples can be used as reference or in a component gallery.
 */

import React from 'react';
import { PageHeader } from './PageHeader';

/**
 * Example 1: Simple page header with just a title
 */
export function SimplePageHeader() {
  return <PageHeader title="Dashboard" />;
}

/**
 * Example 2: Page header with breadcrumbs
 */
export function PageHeaderWithBreadcrumbs() {
  return (
    <PageHeader
      title="Product Details"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Products', href: '/inventory/products' },
        { label: 'Product #12345' },
      ]}
    />
  );
}

/**
 * Example 3: Page header with action buttons
 */
export function PageHeaderWithActions() {
  return (
    <PageHeader
      title="Inventory Management"
      actions={
        <>
          <button type="button">Export</button>
          <button type="button">Add Product</button>
        </>
      }
    />
  );
}

/**
 * Example 4: Complete page header with all features
 */
export function CompletePageHeader() {
  return (
    <PageHeader
      title="Customer Details"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Customers', href: '/customers' },
        { label: 'John Doe' },
      ]}
      actions={
        <>
          <button type="button">Edit</button>
          <button type="button">Delete</button>
        </>
      }
    />
  );
}

/**
 * Example 5: Settings page header
 */
export function SettingsPageHeader() {
  return (
    <PageHeader
      title="Store Settings"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Settings', href: '/settings' },
        { label: 'Stores & Tax' },
      ]}
      actions={
        <button type="button">Save Changes</button>
      }
    />
  );
}

/**
 * Example 6: Reports page header
 */
export function ReportsPageHeader() {
  return (
    <PageHeader
      title="Sales Report"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reports', href: '/reports' },
        { label: 'Sales' },
      ]}
      actions={
        <>
          <button type="button">Print</button>
          <button type="button">Export PDF</button>
          <button type="button">Export CSV</button>
        </>
      }
    />
  );
}

/**
 * Example 7: Page header with single breadcrumb
 */
export function PageHeaderWithSingleBreadcrumb() {
  return (
    <PageHeader
      title="Current Page"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Current Page' },
      ]}
    />
  );
}

/**
 * Example 8: Page header in a full page layout
 */
export function FullPageExample() {
  return (
    <div style={{ padding: '16px' }}>
      <PageHeader
        title="Inventory Management"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Inventory' },
        ]}
        actions={
          <button type="button">Add Product</button>
        }
      />
      
      {/* Page content would go here */}
      <div style={{ marginTop: '24px' }}>
        <p>Page content...</p>
      </div>
    </div>
  );
}

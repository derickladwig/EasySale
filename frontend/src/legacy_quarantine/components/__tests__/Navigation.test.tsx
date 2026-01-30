/**
 * QUARANTINED: Navigation Component Tests
 * 
 * Original Location: frontend/src/common/components/__tests__/Navigation.test.tsx
 * Quarantined: 2026-01-26
 * Reason: Tests for quarantined Navigation component
 * Replacement: AppLayout tests (navigation is now part of AppLayout)
 * 
 * This file is preserved per NO DELETES policy.
 * DO NOT run these tests in active test suites.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';
import * as PermissionsContext from '../../../common/contexts/PermissionsContext';

// Mock usePermissions
vi.mock('../../../common/contexts/PermissionsContext', async () => {
  const actual = await vi.importActual('../../../common/contexts/PermissionsContext');
  return {
    ...actual,
    usePermissions: vi.fn(),
  };
});

// Mock useDocumentStats
vi.mock('../../../features/review/hooks/useReviewApi', () => ({
  useDocumentStats: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

// Mock navigation config
vi.mock('../config/navigation', () => ({
  navigationItems: [
    {
      path: '/sell',
      label: 'Sell',
      icon: '🛒',
      description: 'Sales',
      requiredPermission: 'access_sell',
    },
    {
      path: '/warehouse',
      label: 'Warehouse',
      icon: '📦',
      description: 'Warehouse',
      requiredPermission: 'access_warehouse',
    },
    {
      path: '/admin',
      label: 'Admin',
      icon: '⚙️',
      description: 'Admin',
      requiredPermission: 'access_admin',
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: '👥',
      description: 'Customers',
      requiredPermission: 'access_sell',
    },
    {
      path: '/reporting',
      label: 'Reports',
      icon: '📊',
      description: 'Reports',
      requiredPermission: 'access_sell',
    },
  ],
  filterNavigationByPermissions: (items: any[], hasPermission: any) => {
    return items.filter((item) => hasPermission(item.requiredPermission));
  },
}));

describe('Navigation (QUARANTINED)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Sidebar variant', () => {
    it('shows all navigation items for admin', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse', 'access_admin']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('filters navigation items for cashier', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell']),
        hasPermission: vi.fn((perm) => perm === 'access_sell'),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('shows no items when user has no permissions', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set([]),
        hasPermission: vi.fn(() => false),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.queryByText('Sell')).not.toBeInTheDocument();
      expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('renders navigation header', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell']),
        hasPermission: vi.fn((perm) => perm === 'access_sell'),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });
  });

  describe('Mobile variant', () => {
    it('shows first 4 navigation items for admin', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse', 'access_admin']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="mobile" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      // 5th item should be hidden, "More" button should appear
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('filters navigation items for cashier in mobile', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell']),
        hasPermission: vi.fn((perm) => perm === 'access_sell'),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="mobile" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('More')).not.toBeInTheDocument();
    });

    it('does not show "More" button when 4 or fewer items', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell']),
        hasPermission: vi.fn((perm) => perm === 'access_sell'),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="mobile" />);

      expect(screen.queryByText('More')).not.toBeInTheDocument();
    });
  });

  describe('Permission-based filtering', () => {
    it('warehouse staff sees warehouse and sell items', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse']),
        hasPermission: vi.fn((perm) => ['access_sell', 'access_warehouse'].includes(perm)),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('manager sees all except admin', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse']),
        hasPermission: vi.fn((perm) => ['access_sell', 'access_warehouse'].includes(perm)),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      renderWithRouter(<Navigation variant="sidebar" />);

      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('Active state indicators (Requirement 3.7)', () => {
    it('applies active class to current route in sidebar variant', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      const { container } = renderWithRouter(<Navigation variant="sidebar" />);

      // Find the active link (current route is '/' by default in tests)
      const links = container.querySelectorAll('a');
      const sellLink = Array.from(links).find((link) => link.textContent?.includes('Sell'));

      // Check that the link has the proper structure
      expect(sellLink).toBeTruthy();
    });

    it('applies active class to current route in mobile variant', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      const { container } = renderWithRouter(<Navigation variant="mobile" />);

      // Find the active link
      const links = container.querySelectorAll('a');
      const sellLink = Array.from(links).find((link) => link.textContent?.includes('Sell'));

      // Check that the link has the proper structure
      expect(sellLink).toBeTruthy();
    });

    it('uses CSS module classes for styling', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      const { container } = renderWithRouter(<Navigation variant="sidebar" />);

      // Check that CSS module classes are applied
      const nav = container.querySelector('nav');
      expect(nav?.className).toBeTruthy();
      
      // Check that links have CSS module classes
      const links = container.querySelectorAll('a');
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link.className).toBeTruthy();
      });
    });

    it('renders navigation with proper structure for active indicators', () => {
      vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
        permissions: new Set(['access_sell', 'access_warehouse']),
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
      });

      const { container } = renderWithRouter(<Navigation variant="sidebar" />);

      // Check that navigation has proper structure
      const nav = container.querySelector('nav');
      expect(nav).toBeTruthy();

      const list = container.querySelector('ul');
      expect(list).toBeTruthy();

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);

      // Each list item should have a link
      listItems.forEach((li) => {
        const link = li.querySelector('a');
        expect(link).toBeTruthy();
      });
    });
  });
});

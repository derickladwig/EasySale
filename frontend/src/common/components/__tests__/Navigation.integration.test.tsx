/**
 * @deprecated QUARANTINED TESTS - DO NOT RUN
 * 
 * These tests are for the quarantined Navigation component.
 * The Navigation component has been superseded by AppLayout's built-in navigation.
 * 
 * Quarantine Location: frontend/src/legacy_quarantine/components/__tests__/Navigation.integration.test.tsx
 * Quarantined: 2026-01-26
 * Reason: Tests for quarantined Navigation component
 * Replacement: AppLayout integration tests (navigation is now part of AppLayout)
 * 
 * These tests are skipped to prevent CI failures.
 * See docs/ui/LEGACY_QUARANTINE.md for migration details.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { PermissionsProvider } from '../../contexts/PermissionsContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the permissions context
const mockPermissions = {
  hasPermission: (permission: string) => true, // Admin user has all permissions
  permissions: ['access_sell', 'access_warehouse', 'access_admin'],
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe.skip('Navigation Integration (QUARANTINED - see legacy_quarantine/)', () => {
  it('should render all navigation items for admin user', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Check that all main navigation items are present
    expect(screen.getByText('Sell')).toBeInTheDocument();
    expect(screen.getByText('Lookup')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should filter navigation items based on permissions', () => {
    const limitedPermissions = {
      hasPermission: (permission: string) => permission === 'access_sell',
      permissions: ['access_sell'],
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <PermissionsProvider>
            <Navigation />
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Should show sell-related items
    expect(screen.getByText('Sell')).toBeInTheDocument();
    expect(screen.getByText('Lookup')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();

    // Should not show admin items
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Reporting')).not.toBeInTheDocument();
  });

  it('should render mobile navigation variant', () => {
    render(
      <TestWrapper>
        <Navigation variant="mobile" />
      </TestWrapper>
    );

    // Mobile nav should show first 4 items
    expect(screen.getByText('Sell')).toBeInTheDocument();
    expect(screen.getByText('Lookup')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });
});

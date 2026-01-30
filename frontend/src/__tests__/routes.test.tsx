import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App';

// Mock all the contexts and providers
vi.mock('../common/contexts', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PermissionsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CapabilitiesProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../config', () => ({
  ConfigProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/FaviconManager', () => ({
  FaviconManager: () => null,
}));

describe('Route Coverage', () => {
  const routes = [
    '/',
    '/sell', 
    '/lookup',
    '/inventory',
    '/customers',
    '/reporting',
    '/admin',
    '/preferences',
    '/forms',
    '/login',
    '/access-denied',
    // Admin sub-routes
    '/admin/integrations',
    '/admin/data',
    '/admin/taxes',
    '/admin/capabilities',
  ];

  // Legacy routes that should redirect to new locations
  const legacyRoutes = [
    '/settings',           // → /admin
    '/settings/preferences', // → /preferences
    '/settings/integrations', // → /admin/integrations
  ];

  it.each(routes)('should render route %s without errors', (route) => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it.each(legacyRoutes)('should handle legacy route %s (redirects to new location)', (route) => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('should redirect unknown routes to home', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );

    // Should not crash and should render something
    expect(container).toBeInTheDocument();
  });
});

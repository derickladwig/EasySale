import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequirePermission } from '../RequirePermission';
import * as AuthContext from '../../contexts/AuthContext';
import * as PermissionsContext from '../../contexts/PermissionsContext';

// Mock useAuth and usePermissions
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../../contexts/PermissionsContext', async () => {
  const actual = await vi.importActual('../../contexts/PermissionsContext');
  return {
    ...actual,
    usePermissions: vi.fn(),
  };
});

describe('RequirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={component} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/access-denied" element={<div>Access Denied Page</div>} />
          <Route path="/custom-denied" element={<div>Custom Denied Page</div>} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('shows loading state while checking authentication', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="access_sell">
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(),
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="access_sell">
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });

  it('redirects to access denied when authenticated but lacking permission', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(['access_sell']),
      hasPermission: vi.fn((perm) => perm === 'access_sell'),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="manage_users">
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and has permission', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(['access_sell']),
      hasPermission: vi.fn((perm) => perm === 'access_sell'),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="access_sell">
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });

  it('uses custom redirect path when provided', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(['access_sell']),
      hasPermission: vi.fn((perm) => perm === 'access_sell'),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="manage_users" redirectTo="/custom-denied">
        <div>Protected Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Custom Denied Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });

  it('admin can access admin-only content', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['access_sell', 'access_admin', 'manage_users'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(['access_sell', 'access_admin', 'manage_users']),
      hasPermission: vi.fn((perm) =>
        ['access_sell', 'access_admin', 'manage_users'].includes(perm)
      ),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="access_admin">
        <div>Admin Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('cashier cannot access admin content', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'cashier',
        email: 'cashier@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    vi.mocked(PermissionsContext.usePermissions).mockReturnValue({
      permissions: new Set(['access_sell']),
      hasPermission: vi.fn((perm) => perm === 'access_sell'),
      hasAnyPermission: vi.fn(),
      hasAllPermissions: vi.fn(),
    });

    renderWithRouter(
      <RequirePermission permission="access_admin">
        <div>Admin Content</div>
      </RequirePermission>
    );

    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});

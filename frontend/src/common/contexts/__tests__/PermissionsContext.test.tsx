import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { PermissionsProvider, usePermissions, Permission } from '../PermissionsContext';
import { AuthProvider, useAuth } from '../AuthContext';
import { ReactNode } from 'react';

// Mock useAuth
vi.mock('../AuthContext', async () => {
  const actual = await vi.importActual('../AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('PermissionsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = (permissions: string[]) => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'test',
        permissions,
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
    });

    const TestWrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <PermissionsProvider>{children}</PermissionsProvider>
      </AuthProvider>
    );
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
  };

  describe('hasPermission', () => {
    it('returns true when user has the permission', () => {
      const wrapper = createWrapper(['access_sell', 'process_return']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('access_sell')).toBe(true);
      expect(result.current.hasPermission('process_return')).toBe(true);
    });

    it('returns false when user does not have the permission', () => {
      const wrapper = createWrapper(['access_sell']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('manage_users')).toBe(false);
      expect(result.current.hasPermission('access_admin')).toBe(false);
    });

    it('returns false when user has no permissions', () => {
      const wrapper = createWrapper([]);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('access_sell')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one of the permissions', () => {
      const wrapper = createWrapper(['access_sell', 'process_return']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAnyPermission('access_sell', 'manage_users')).toBe(true);
      expect(result.current.hasAnyPermission('process_return', 'access_admin')).toBe(true);
    });

    it('returns false when user has none of the permissions', () => {
      const wrapper = createWrapper(['access_sell']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAnyPermission('manage_users', 'access_admin')).toBe(false);
    });

    it('returns true when user has all of the permissions', () => {
      const wrapper = createWrapper(['access_sell', 'process_return', 'apply_discount']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAnyPermission('access_sell', 'process_return')).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all of the permissions', () => {
      const wrapper = createWrapper(['access_sell', 'process_return', 'apply_discount']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAllPermissions('access_sell', 'process_return')).toBe(true);
      expect(result.current.hasAllPermissions('access_sell', 'apply_discount')).toBe(true);
    });

    it('returns false when user is missing at least one permission', () => {
      const wrapper = createWrapper(['access_sell', 'process_return']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAllPermissions('access_sell', 'manage_users')).toBe(false);
      expect(
        result.current.hasAllPermissions('process_return', 'access_admin', 'apply_discount')
      ).toBe(false);
    });

    it('returns false when user has no permissions', () => {
      const wrapper = createWrapper([]);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasAllPermissions('access_sell', 'process_return')).toBe(false);
    });
  });

  describe('Role-based permissions', () => {
    it('admin has all permissions', () => {
      const adminPermissions = [
        'access_sell',
        'access_inventory',
        'access_admin',
        'apply_discount',
        'override_price',
        'process_return',
        'receive_stock',
        'adjust_inventory',
        'manage_users',
        'manage_settings',
        'view_audit_logs',
      ];
      const wrapper = createWrapper(adminPermissions);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('manage_users')).toBe(true);
      expect(result.current.hasPermission('manage_settings')).toBe(true);
      expect(result.current.hasPermission('access_admin')).toBe(true);
      expect(
        result.current.hasAllPermissions('access_sell', 'access_inventory', 'access_admin')
      ).toBe(true);
    });

    it('cashier has limited permissions', () => {
      const cashierPermissions = ['access_sell', 'process_return'];
      const wrapper = createWrapper(cashierPermissions);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('access_sell')).toBe(true);
      expect(result.current.hasPermission('process_return')).toBe(true);
      expect(result.current.hasPermission('manage_users')).toBe(false);
      expect(result.current.hasPermission('access_admin')).toBe(false);
    });

    it('manager has intermediate permissions', () => {
      const managerPermissions = [
        'access_sell',
        'access_inventory',
        'apply_discount',
        'override_price',
        'process_return',
        'receive_stock',
        'adjust_inventory',
        'view_audit_logs',
      ];
      const wrapper = createWrapper(managerPermissions);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.hasPermission('access_sell')).toBe(true);
      expect(result.current.hasPermission('apply_discount')).toBe(true);
      expect(result.current.hasPermission('view_audit_logs')).toBe(true);
      expect(result.current.hasPermission('manage_users')).toBe(false);
      expect(result.current.hasPermission('access_admin')).toBe(false);
    });
  });

  describe('permissions Set', () => {
    it('exposes permissions as a Set', () => {
      const wrapper = createWrapper(['access_sell', 'process_return']);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.permissions).toBeInstanceOf(Set);
      expect(result.current.permissions.size).toBe(2);
      expect(result.current.permissions.has('access_sell' as Permission)).toBe(true);
      expect(result.current.permissions.has('process_return' as Permission)).toBe(true);
    });

    it('handles empty permissions', () => {
      const wrapper = createWrapper([]);
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.permissions.size).toBe(0);
    });
  });

  describe('usePermissions hook', () => {
    it('throws error when used outside PermissionsProvider', () => {
      // Temporarily restore the real useAuth
      vi.mocked(useAuth).mockRestore();

      expect(() => {
        renderHook(() => usePermissions());
      }).toThrow('usePermissions must be used within a PermissionsProvider');
    });
  });
});

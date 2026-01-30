import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Permission =
  | 'access_sell'
  | 'access_warehouse'
  | 'access_inventory'
  | 'access_admin'
  | 'apply_discount'
  | 'override_price'
  | 'process_return'
  | 'receive_stock'
  | 'adjust_inventory'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'upload_vendor_bills'
  | 'view_vendor_bills'
  | 'review_vendor_bills'
  | 'post_vendor_bills';

export interface PermissionsContextType {
  permissions: Set<Permission>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
  hasAllPermissions: (...permissions: Permission[]) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const permissions = new Set<Permission>((user?.permissions || []) as Permission[]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.has(permission);
  };

  const hasAnyPermission = (...perms: Permission[]): boolean => {
    return perms.some((perm) => permissions.has(perm));
  };

  const hasAllPermissions = (...perms: Permission[]): boolean => {
    return perms.every((perm) => permissions.has(perm));
  };

  const value: PermissionsContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

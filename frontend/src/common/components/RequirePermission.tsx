import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, Permission } from '../contexts/PermissionsContext';

interface RequirePermissionProps {
  children: ReactNode;
  permission: Permission;
  redirectTo?: string;
}

/**
 * Route guard component that checks if the user has the required permission.
 * Redirects to login if not authenticated, or to access denied if lacking permission.
 */
export function RequirePermission({
  children,
  permission,
  redirectTo = '/access-denied',
}: RequirePermissionProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to access denied if lacking permission
  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has permission
  return <>{children}</>;
}

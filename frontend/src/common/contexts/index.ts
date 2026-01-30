export { AuthProvider, useAuth } from './AuthContext';
export type { User, LoginCredentials, AuthContextType } from './AuthContext';

export { PermissionsProvider, usePermissions } from './PermissionsContext';
export type { Permission, PermissionsContextType } from './PermissionsContext';

export { 
  CapabilitiesProvider, 
  useCapabilities,
  useHasAccountingFeatures,
  useHasExportFeatures,
  useHasSyncFeatures,
  useHasIntegrations,
  useHasPayments,
  useHasStripe,
  useHasSquare,
  useHasClover,
  useHasDataManager,
  useBuildVariant
} from './CapabilitiesContext';

export { TenantSetupProvider, useTenantSetup } from './TenantSetupContext';
export type { TenantSetupStatus, SetupStep, TenantSetupContextType } from './TenantSetupContext';

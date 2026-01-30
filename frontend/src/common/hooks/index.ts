// Custom Hooks
export { useBreakpoint } from './useBreakpoint';
export type { Breakpoint, BreakpointState } from './useBreakpoint';

export { useApiError } from './useApiError';
export { useFavicon } from './useFavicon';

export {
  useUserPreferences,
  useThemePreference,
  useDensityPreference,
  useDefaultLandingPage,
  useKeyboardShortcuts,
} from './useUserPreferences';
export type { UseUserPreferencesReturn } from './useUserPreferences';

export { useAppInfo } from './useAppInfo';
export type { AppInfo } from './useAppInfo';

export { useSystemStatus } from './useSystemStatus';
export type { SystemStatus, DatabaseStatus, SyncStatus, HealthStatus } from './useSystemStatus';

// Note: useCapabilities is exported from contexts/CapabilitiesContext (primary)
// and admin/hooks/useCapabilities (React Query version for direct API access)
// Import from the appropriate location based on your use case:
// - contexts: useCapabilities() returns { capabilities, loading, error }
// - admin/hooks: useCapabilities() returns React Query result with data, isLoading, etc.

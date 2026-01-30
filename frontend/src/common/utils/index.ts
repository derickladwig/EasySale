// Utilities
export { default as logger, logDebug, logInfo, logWarn, logError } from './logger';
export type { LogLevel, LogContext } from './logger';

export { default as apiClient, ApiError } from './apiClient';
export type { ApiResponse } from './apiClient';

export * from './sanitize';

// Error handling utilities
export * from './errorUtils';

// User Preferences
export * from './userPreferences';
export type {
  UserPreferences,
  ThemeAppearance,
  UIDensity,
  KeyboardShortcuts,
} from './userPreferences';

// Demo Mode
export * from './demoMode';

// Build Variant
export * from './buildVariant';

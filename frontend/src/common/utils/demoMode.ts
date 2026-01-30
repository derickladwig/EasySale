/**
 * Demo Mode Utilities
 * 
 * Provides utilities for checking and managing demo mode state.
 * Demo mode is determined by the RUNTIME_PROFILE environment variable.
 * 
 * Validates: Requirements 9.2
 * - THE Demo_Seed_Data SHALL only be allowed behind DEMO_MODE=true and visibly labeled
 */

/**
 * Check if the application is running in demo mode.
 * 
 * Demo mode is enabled when:
 * - VITE_RUNTIME_PROFILE is set to 'demo'
 * - Or VITE_DEMO_MODE is explicitly set to 'true'
 * 
 * @returns true if demo mode is active
 */
export function isDemoMode(): boolean {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  const demoModeFlag = import.meta.env.VITE_DEMO_MODE;
  
  return profile === 'demo' || demoModeFlag === 'true';
}

/**
 * Check if the application is running in production mode.
 * 
 * @returns true if production mode is active
 */
export function isProductionMode(): boolean {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  return profile === 'prod' || import.meta.env.PROD;
}

/**
 * Check if the application is running in development mode.
 * 
 * @returns true if development mode is active
 */
export function isDevelopmentMode(): boolean {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  return profile === 'dev' || import.meta.env.DEV;
}

/**
 * Get the current runtime profile.
 * 
 * @returns 'demo' | 'dev' | 'prod'
 */
export function getRuntimeProfile(): 'demo' | 'dev' | 'prod' {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  
  if (profile === 'demo') return 'demo';
  if (profile === 'prod' || import.meta.env.PROD) return 'prod';
  return 'dev';
}

/**
 * Gate function for demo-only features.
 * Returns the value if in demo mode, otherwise returns the fallback.
 * 
 * @param demoValue - Value to return in demo mode
 * @param fallback - Value to return in non-demo mode
 * @returns demoValue if in demo mode, fallback otherwise
 */
export function demoOnly<T>(demoValue: T, fallback: T): T {
  return isDemoMode() ? demoValue : fallback;
}

/**
 * Gate function for production-only features.
 * Returns the value if in production mode, otherwise returns the fallback.
 * 
 * @param prodValue - Value to return in production mode
 * @param fallback - Value to return in non-production mode
 * @returns prodValue if in production mode, fallback otherwise
 */
export function prodOnly<T>(prodValue: T, fallback: T): T {
  return isProductionMode() ? prodValue : fallback;
}

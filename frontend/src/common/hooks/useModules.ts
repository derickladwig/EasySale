import { useConfig } from '../../config';

/**
 * Hook for checking module availability
 * Provides utilities to check if modules are enabled in the configuration
 */
export function useModules() {
  const { modules, isModuleEnabled, getModuleSettings } = useConfig();

  /**
   * Check if a specific module is enabled
   */
  const isEnabled = (moduleName: string): boolean => {
    return isModuleEnabled(moduleName);
  };

  /**
   * Check if any of the specified modules are enabled
   */
  const isAnyEnabled = (moduleNames: string[]): boolean => {
    return moduleNames.some((name) => isModuleEnabled(name));
  };

  /**
   * Check if all of the specified modules are enabled
   */
  const areAllEnabled = (moduleNames: string[]): boolean => {
    return moduleNames.every((name) => isModuleEnabled(name));
  };

  /**
   * Get settings for a specific module
   */
  const getSettings = <T = Record<string, unknown>>(moduleName: string): T | undefined => {
    return getModuleSettings<T>(moduleName);
  };

  /**
   * Get all enabled modules
   */
  const getEnabledModules = (): string[] => {
    return Object.entries(modules)
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name);
  };

  /**
   * Get all disabled modules
   */
  const getDisabledModules = (): string[] => {
    return Object.entries(modules)
      .filter(([_, config]) => !config.enabled)
      .map(([name]) => name);
  };

  /**
   * Check if module has specific feature enabled
   */
  const hasFeature = (moduleName: string, featureName: string): boolean => {
    const settings = getModuleSettings<any>(moduleName);
    return settings?.features?.[featureName] === true;
  };

  return {
    modules,
    isEnabled,
    isAnyEnabled,
    areAllEnabled,
    getSettings,
    getEnabledModules,
    getDisabledModules,
    hasFeature,
  };
}

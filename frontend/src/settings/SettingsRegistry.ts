/**
 * Settings Registry
 * Centralized system for managing settings with scope resolution
 */

import {
  SettingDefinition,
  SettingValue,
  SettingPreferences,
  SettingScope,
  SettingGroup,
} from './types';
import { allSettingDefinitions } from './definitions';

export class InvalidScopeError extends Error {
  constructor(key: string, attemptedScope: SettingScope, allowedScopes: SettingScope[]) {
    super(
      `Cannot set setting "${key}" at ${attemptedScope} scope. ` +
        `Allowed scopes: ${allowedScopes.join(', ')}`
    );
    this.name = 'InvalidScopeError';
  }
}

export class SettingsRegistry {
  private settings: Map<string, SettingDefinition> = new Map();
  private schemaVersion: number = 1;

  constructor() {
    // Register all setting definitions
    allSettingDefinitions.forEach((def) => this.register(def));
  }

  /**
   * Register a setting definition
   */
  register<T>(definition: SettingDefinition<T>): void {
    if (this.settings.has(definition.key)) {
      console.warn(`Setting "${definition.key}" is already registered. Overwriting.`);
    }
    this.settings.set(definition.key, definition);
  }

  /**
   * Get setting value with scope resolution
   * Policy settings: store > user > default
   * Preference settings: user > store > default
   */
  get<T>(key: string, preferences: SettingPreferences<T>): SettingValue<T> {
    const definition = this.settings.get(key);

    if (!definition) {
      this.handleUnknownKey(key);
      // Return a default value to prevent crashes
      return { value: null as T, scope: 'default' };
    }

    const { type, defaultValue, allowedScopes } = definition;
    const { store, user } = preferences;

    // Policy settings: store > user > default
    if (type === 'policy') {
      if (store !== undefined && allowedScopes.includes('store')) {
        return { value: store, scope: 'store' };
      }
      if (user !== undefined && allowedScopes.includes('user')) {
        return { value: user, scope: 'user' };
      }
      return { value: defaultValue, scope: 'default' };
    }

    // Preference settings: user > store > default
    if (type === 'preference') {
      if (user !== undefined && allowedScopes.includes('user')) {
        return { value: user, scope: 'user' };
      }
      if (store !== undefined && allowedScopes.includes('store')) {
        return { value: store, scope: 'store' };
      }
      return { value: defaultValue, scope: 'default' };
    }

    return { value: defaultValue, scope: 'default' };
  }

  /**
   * Validate setting value and scope before setting
   * Throws InvalidScopeError if scope is not allowed
   */
  validateSet<T>(key: string, value: T, scope: SettingScope): void {
    const definition = this.settings.get(key);

    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    // Check if scope is allowed
    if (!definition.allowedScopes.includes(scope)) {
      throw new InvalidScopeError(key, scope, definition.allowedScopes);
    }

    // Run custom validator if provided
    if (definition.validator && !definition.validator(value)) {
      throw new Error(`Invalid value for setting "${key}": ${value}`);
    }
  }

  /**
   * Set setting value at specific scope
   * Note: This only validates. Actual persistence is handled by ConfigStore.
   */
  async set<T>(key: string, value: T, scope: SettingScope): Promise<void> {
    this.validateSet(key, value, scope);
    // Actual persistence would be handled by ConfigStore
    // This method is primarily for validation
  }

  /**
   * Get all settings in a group
   */
  getGroup(group: SettingGroup): SettingDefinition[] {
    return Array.from(this.settings.values()).filter((def) => def.group === group);
  }

  /**
   * Search settings by name or description (case-insensitive)
   */
  search(query: string): SettingDefinition[] {
    if (!query || query.trim() === '') {
      return Array.from(this.settings.values());
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(this.settings.values()).filter(
      (def) =>
        def.label.toLowerCase().includes(lowerQuery) ||
        def.description.toLowerCase().includes(lowerQuery) ||
        def.key.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get setting definition by key
   */
  getDefinition(key: string): SettingDefinition | undefined {
    return this.settings.get(key);
  }

  /**
   * Get all setting definitions
   */
  getAllDefinitions(): SettingDefinition[] {
    return Array.from(this.settings.values());
  }

  /**
   * Handle unknown setting keys safely
   * Never crash, just log and continue
   */
  handleUnknownKey(key: string): void {
    console.warn(`Unknown setting key: "${key}". Ignoring stored value.`);
  }

  /**
   * Get current schema version
   */
  getSchemaVersion(): number {
    return this.schemaVersion;
  }

  /**
   * Check if a setting is a policy setting
   */
  isPolicySetting(key: string): boolean {
    const definition = this.settings.get(key);
    return definition?.type === 'policy';
  }

  /**
   * Check if a setting is a preference setting
   */
  isPreferenceSetting(key: string): boolean {
    const definition = this.settings.get(key);
    return definition?.type === 'preference';
  }

  /**
   * Get allowed scopes for a setting
   */
  getAllowedScopes(key: string): SettingScope[] {
    const definition = this.settings.get(key);
    return definition?.allowedScopes || [];
  }
}

// Export singleton instance
export const settingsRegistry = new SettingsRegistry();

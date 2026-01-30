/**
 * Example Component: User Preferences
 * 
 * This component demonstrates how to use the user preferences system.
 * It can be used as a reference or integrated into a preferences page.
 */

import { useUserPreferences } from '../hooks';
import type { ThemeAppearance, UIDensity } from '../utils/userPreferences';

export function UserPreferencesExample() {
  const {
    preferences,
    isLoading,
    setTheme,
    setDensity,
    setDefaultLandingPage,
    setKeyboardShortcuts,
    resetToDefaults,
  } = useUserPreferences();

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>User Preferences</h2>
      
      {/* Theme Selection */}
      <section style={{ marginBottom: '20px' }}>
        <h3>Theme</h3>
        <p>Current: {preferences.theme}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setTheme('light')}
            disabled={preferences.theme === 'light'}
          >
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            disabled={preferences.theme === 'dark'}
          >
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            disabled={preferences.theme === 'system'}
          >
            System
          </button>
        </div>
      </section>

      {/* Density Selection */}
      <section style={{ marginBottom: '20px' }}>
        <h3>UI Density</h3>
        <p>Current: {preferences.density}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setDensity('compact')}
            disabled={preferences.density === 'compact'}
          >
            Compact
          </button>
          <button
            onClick={() => setDensity('comfortable')}
            disabled={preferences.density === 'comfortable'}
          >
            Comfortable
          </button>
          <button
            onClick={() => setDensity('spacious')}
            disabled={preferences.density === 'spacious'}
          >
            Spacious
          </button>
        </div>
      </section>

      {/* Default Landing Page */}
      <section style={{ marginBottom: '20px' }}>
        <h3>Default Landing Page</h3>
        <p>Current: {preferences.defaultLandingPage}</p>
        <select
          value={preferences.defaultLandingPage}
          onChange={(e) => setDefaultLandingPage(e.target.value)}
          style={{ padding: '5px', minWidth: '200px' }}
        >
          <option value="/">Home</option>
          <option value="/sell">Sell</option>
          <option value="/lookup">Lookup</option>
          <option value="/inventory">Inventory</option>
          <option value="/customers">Customers</option>
          <option value="/reporting">Reporting</option>
        </select>
      </section>

      {/* Keyboard Shortcuts */}
      <section style={{ marginBottom: '20px' }}>
        <h3>Keyboard Shortcuts</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={preferences.shortcuts?.enabled ?? true}
            onChange={(e) =>
              setKeyboardShortcuts({ enabled: e.target.checked })
            }
          />
          Enable keyboard shortcuts
        </label>
        {preferences.shortcuts?.enabled && (
          <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Custom key bindings:{' '}
            {Object.keys(preferences.shortcuts?.customBindings || {}).length > 0
              ? JSON.stringify(preferences.shortcuts?.customBindings)
              : 'None'}
          </p>
        )}
      </section>

      {/* Last Updated */}
      <section style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Last updated:{' '}
          {preferences.lastUpdated
            ? new Date(preferences.lastUpdated).toLocaleString()
            : 'Never'}
        </p>
      </section>

      {/* Reset Button */}
      <section>
        <button
          onClick={resetToDefaults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
      </section>
    </div>
  );
}

/**
 * Minimal example showing just the hook usage
 */
export function MinimalPreferencesExample() {
  const { preferences, setTheme } = useUserPreferences();

  return (
    <div>
      <p>Current theme: {preferences.theme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
    </div>
  );
}

/**
 * Example showing how to use specialized hooks
 */
export function SpecializedHooksExample() {
  const { setTheme } = useUserPreferences();
  
  // Or use specialized hooks for specific preferences
  // import { useThemePreference, useDensityPreference } from '../hooks';
  // const theme = useThemePreference();
  // const density = useDensityPreference();

  return (
    <div>
      <button onClick={() => setTheme('dark')}>Toggle Dark Mode</button>
    </div>
  );
}

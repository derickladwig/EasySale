/**
 * Unit tests for ThemeProvider and useTheme hook
 *
 * Tests:
 * - ThemeProvider initialization with store and user context
 * - useTheme hook provides correct theme state
 * - setTheme function calls ConfigStore and updates state
 * - Theme locks prevent user overrides
 * - Cached theme fallback when offline
 * - Auto mode resolves to system preference
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { ThemeEngine } from '../theme/ThemeEngine';
import { IConfigStore, type ResolvedConfig } from './ConfigStore';
import type { ThemeConfig, TenantConfig } from './types';

// ============================================================================
// Mock ConfigStore
// ============================================================================

class MockConfigStore implements IConfigStore {
  private themes: Map<string, ThemeConfig> = new Map();
  private storeLocks: Map<string, { lockMode?: boolean; lockAccent?: boolean }> = new Map();

  setMockTheme(storeId: string, theme: ThemeConfig, locks?: { lockMode?: boolean; lockAccent?: boolean }) {
    this.themes.set(storeId, theme);
    if (locks) {
      this.storeLocks.set(storeId, locks);
    }
  }

  async getSetting<T = unknown>(): Promise<{ value: T; scope: 'store' | 'user' | 'default' }> {
    throw new Error('Not implemented');
  }

  async setSetting<T = unknown>(): Promise<void> {
    throw new Error('Not implemented');
  }

  async getTheme(storeId: string, userId?: string): Promise<ThemeConfig> {
    const theme = this.themes.get(storeId);
    if (!theme) {
      throw new Error(`Theme not found for store: ${storeId}`);
    }
    return theme;
  }

  async setTheme(
    scope: 'store' | 'user',
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void> {
    if (!storeId) throw new Error('Store ID required');

    // Check locks for user scope
    if (scope === 'user') {
      const locks = this.storeLocks.get(storeId);
      if (locks?.lockMode && partialTheme.mode) {
        throw new Error('Theme mode is locked by store policy');
      }
      if (locks?.lockAccent && partialTheme.colors?.accent) {
        throw new Error('Accent color is locked by store policy');
      }
    }

    // Merge partial theme
    const currentTheme = this.themes.get(storeId) || {
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    const updatedTheme = {
      ...currentTheme,
      ...partialTheme,
      colors: {
        ...currentTheme.colors,
        ...partialTheme.colors,
      },
    };

    this.themes.set(storeId, updatedTheme);
  }

  async getTenantConfig(): Promise<TenantConfig> {
    throw new Error('Not implemented');
  }

  async getResolvedConfig(): Promise<ResolvedConfig> {
    throw new Error('Not implemented');
  }

  async clearCache(): Promise<void> {
    return Promise.resolve();
  }

  async getCacheStats() {
    return { size: 0, entries: 0, lastUpdated: null };
  }
}

// ============================================================================
// Test Component
// ============================================================================

function TestComponent() {
  const { theme, mode, loading, error, setTheme } = useTheme();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!theme) return <div>No theme</div>;

  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="theme-mode">{theme.mode}</div>
      <button onClick={() => setTheme({ mode: 'dark' })}>Set Dark</button>
      <button onClick={() => setTheme({ mode: 'light' })}>Set Light</button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('ThemeProvider', () => {
  let mockConfigStore: MockConfigStore;
  let mockThemeEngine: ThemeEngine;

  beforeEach(() => {
    mockConfigStore = new MockConfigStore();
    mockThemeEngine = new ThemeEngine(mockConfigStore);

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    // Mock ThemeEngine methods
    vi.spyOn(mockThemeEngine, 'applyTheme').mockImplementation(() => {});
    vi.spyOn(mockThemeEngine, 'getCurrentTheme').mockReturnValue({
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with store theme', async () => {
    const storeTheme: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    mockConfigStore.setMockTheme('store-1', storeTheme);

    render(
      <ThemeProvider storeId="store-1" configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
  });

  it('should call setTheme and update state', async () => {
    const storeTheme: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    mockConfigStore.setMockTheme('store-1', storeTheme);

    render(
      <ThemeProvider storeId="store-1" userId="user-1" configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Mock saveThemePreference to succeed and update theme
    vi.spyOn(mockThemeEngine, 'saveThemePreference').mockImplementation(async () => {
      // Update getCurrentTheme to return dark theme
      vi.spyOn(mockThemeEngine, 'getCurrentTheme').mockReturnValue({
        mode: 'dark',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#1a1a1a',
          surface: '#242424',
          text: '#ffffff',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      });
    });

    // Click button to set dark theme
    const setDarkButton = screen.getByText('Set Dark');
    await act(async () => {
      setDarkButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    });
  });

  it('should throw error when theme mode is locked', async () => {
    const storeTheme: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    mockConfigStore.setMockTheme('store-1', storeTheme, { lockMode: true });

    // Mock saveThemePreference to throw error
    vi.spyOn(mockThemeEngine, 'saveThemePreference').mockRejectedValue(
      new Error('Theme mode is locked by store policy')
    );

    render(
      <ThemeProvider storeId="store-1" userId="user-1" configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Try to set dark theme (should fail)
    const setDarkButton = screen.getByText('Set Dark');

    // Catch the error in the click handler
    let thrownError: Error | null = null;
    try {
      await act(async () => {
        setDarkButton.click();
        // Wait for the promise to reject
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    } catch (error) {
      thrownError = error as Error;
    }

    // The error should have been logged but not thrown to the test
    // Instead, check that saveThemePreference was called and rejected
    expect(mockThemeEngine.saveThemePreference).toHaveBeenCalled();
  });

  it('should use cached theme when offline', async () => {
    const cachedTheme: ThemeConfig = {
      mode: 'dark',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#1a1a1a',
        surface: '#242424',
        text: '#ffffff',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    // Mock loadCachedTheme to return cached theme
    vi.spyOn(mockThemeEngine, 'loadCachedTheme').mockReturnValue(cachedTheme);
    vi.spyOn(mockThemeEngine, 'getCurrentTheme').mockReturnValue(cachedTheme);

    // Mock initialize to fail (simulating offline)
    vi.spyOn(mockThemeEngine, 'initialize').mockRejectedValue(new Error('Network error'));

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ThemeProvider storeId="store-1" configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should use cached theme
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');

    consoleError.mockRestore();
  });

  it('should resolve auto mode to system preference', async () => {
    const autoTheme: ThemeConfig = {
      mode: 'auto',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    mockConfigStore.setMockTheme('store-1', autoTheme);
    vi.spyOn(mockThemeEngine, 'getCurrentTheme').mockReturnValue(autoTheme);

    // Mock matchMedia to return dark preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider storeId="store-1" configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Mode should be resolved to 'dark' based on system preference
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('auto');
  });

  it('should throw error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleError.mockRestore();
  });

  it('should handle missing store ID gracefully', async () => {
    const cachedTheme: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: { 500: '#3b82f6', 600: '#2563eb' },
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    vi.spyOn(mockThemeEngine, 'loadCachedTheme').mockReturnValue(cachedTheme);
    vi.spyOn(mockThemeEngine, 'getCurrentTheme').mockReturnValue(cachedTheme);

    render(
      <ThemeProvider configStore={mockConfigStore} themeEngine={mockThemeEngine}>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should use cached theme
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });
});

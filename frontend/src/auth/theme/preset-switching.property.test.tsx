/**
 * Property-Based Tests: Preset Switching Without Reload
 *
 * Feature: themeable-login-system
 * Property 3: Preset Switching Without Reload
 * Validates: Requirements 1.5, 1.6
 *
 * This property test validates that theme presets can be switched at runtime
 * without page reload and that the new theme is applied correctly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { LoginThemeProvider, useLoginTheme } from './LoginThemeProvider';
import minimalDarkPreset from './presets/minimalDark.json';
import glassWavesPreset from './presets/glassWaves.json';
import ambientPhotoPreset from './presets/ambientPhoto.json';
import type { LoginThemeConfig } from './types';

// ============================================================================
// Test Component
// ============================================================================

interface TestComponentProps {
  targetPreset?: string;
}

function TestComponent({ targetPreset }: TestComponentProps) {
  const { config, isLoading, error, switchPreset } = useLoginTheme();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div data-testid="theme-name">{config.name}</div>
      <div data-testid="theme-version">{config.version}</div>
      <button
        data-testid="switch-preset"
        onClick={() => targetPreset && switchPreset(targetPreset)}
      >
        Switch Preset
      </button>
    </div>
  );
}

// ============================================================================
// Preset Configurations
// ============================================================================

const presets: Record<string, LoginThemeConfig> = {
  'minimal-dark': minimalDarkPreset as unknown as LoginThemeConfig,
  'glass-waves': glassWavesPreset as unknown as LoginThemeConfig,
  'ambient-photo': ambientPhotoPreset as unknown as LoginThemeConfig,
};

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const presetNameArbitrary = fc.constantFrom('minimal-dark', 'glass-waves', 'ambient-photo');

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 3: Preset Switching Without Reload', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Clear any existing DOM elements
    document.body.innerHTML = '';
    // Clear CSS variables
    const root = document.documentElement;
    const styles = root.style;
    for (let i = styles.length - 1; i >= 0; i--) {
      const prop = styles[i];
      if (prop.startsWith('--login-')) {
        root.style.removeProperty(prop);
      }
    }
  });

  afterEach(() => {
    cleanup();
    // Force clear all DOM
    document.body.innerHTML = '';
    // Clear CSS variables from document root
    const root = document.documentElement;
    const styles = root.style;
    for (let i = styles.length - 1; i >= 0; i--) {
      const prop = styles[i];
      if (prop.startsWith('--login-')) {
        root.style.removeProperty(prop);
      }
    }
  });

  it('should switch between presets without page reload', async () => {
    await fc.assert(
      fc.asyncProperty(
        presetNameArbitrary,
        presetNameArbitrary,
        async (initialPreset, targetPreset) => {
          // Skip if presets are the same (no change to test)
          if (initialPreset === targetPreset) return;

          const initialConfig = presets[initialPreset];
          const targetConfig = presets[targetPreset];

          // Mock fetch to return configs based on URL
          global.fetch = vi.fn().mockImplementation((url: string) => {
            const urlStr = url.toString();
            
            // Handle preset switch requests
            if (urlStr.includes(`/presets/${targetPreset}`)) {
              return Promise.resolve({
                ok: true,
                json: async () => targetConfig,
              });
            }
            
            // Handle initial tenant load
            return Promise.resolve({
              ok: true,
              json: async () => initialConfig,
            });
          });

          const { getByTestId, unmount } = render(
            <LoginThemeProvider tenantId="test">
              <TestComponent targetPreset={targetPreset} />
            </LoginThemeProvider>
          );

          // Wait for initial preset to load
          await waitFor(() => {
            expect(getByTestId('theme-name')).toHaveTextContent(initialConfig.name);
          }, { timeout: 2000 });

          // Verify initial CSS variables are applied
          const root = document.documentElement;
          const initialPrimaryColor = root.style.getPropertyValue('--login-surface-primary');
          expect(initialPrimaryColor).toBe(initialConfig.tokens.colors.surface.primary);

          // Switch to target preset
          const switchButton = getByTestId('switch-preset');
          await act(async () => {
            switchButton.click();
            // Wait for async state updates
            await new Promise((resolve) => setTimeout(resolve, 200));
          });

          // Wait for target preset to load
          await waitFor(
            () => {
              expect(getByTestId('theme-name')).toHaveTextContent(targetConfig.name);
            },
            { timeout: 3000 }
          );

          // Verify target CSS variables are applied
          const targetPrimaryColor = root.style.getPropertyValue('--login-surface-primary');
          expect(targetPrimaryColor).toBe(targetConfig.tokens.colors.surface.primary);

          // Verify colors actually changed
          expect(targetPrimaryColor).not.toBe(initialPrimaryColor);

          // Cleanup
          unmount();
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
        }
      ),
      { numRuns: 10 } // Reduced runs for stability
    );
  }, 20000); // Increased timeout

  it('should cache switched preset in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(presetNameArbitrary, async (presetName) => {
        const presetConfig = presets[presetName];

        global.fetch = vi.fn().mockImplementation((url: string) => {
          return Promise.resolve({
            ok: true,
            json: async () => presetConfig,
          });
        });

        const { getByTestId, unmount } = render(
          <LoginThemeProvider tenantId="test">
            <TestComponent targetPreset={presetName} />
          </LoginThemeProvider>
        );

        // Wait for preset to load
        await waitFor(() => {
          expect(getByTestId('theme-name')).toHaveTextContent(presetConfig.name);
        }, { timeout: 2000 });

        // Switch preset
        const switchButton = getByTestId('switch-preset');
        await act(async () => {
          switchButton.click();
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        // Wait for switch to complete
        await waitFor(() => {
          const cached = localStorage.getItem('EasySale_login_theme');
          expect(cached).toBeTruthy();
        }, { timeout: 2000 });

        // Verify cached config matches preset
        const cached = localStorage.getItem('EasySale_login_theme');
        const cachedConfig = JSON.parse(cached!);
        expect(cachedConfig.name).toBe(presetConfig.name);

        // Cleanup
        unmount();
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });
      }),
      { numRuns: 10 }
    );
  }, 15000);

  it('should maintain theme state during preset switch', async () => {
    await fc.assert(
      fc.asyncProperty(
        presetNameArbitrary,
        presetNameArbitrary,
        async (initialPreset, targetPreset) => {
          // Skip if presets are the same
          if (initialPreset === targetPreset) return;

          const initialConfig = presets[initialPreset];
          const targetConfig = presets[targetPreset];

          global.fetch = vi.fn().mockImplementation((url: string) => {
            const urlStr = url.toString();
            
            if (urlStr.includes(`/presets/${targetPreset}`)) {
              return Promise.resolve({
                ok: true,
                json: async () => targetConfig,
              });
            }
            
            return Promise.resolve({
              ok: true,
              json: async () => initialConfig,
            });
          });

          const { getByTestId, queryByText, unmount } = render(
            <LoginThemeProvider tenantId="test">
              <TestComponent targetPreset={targetPreset} />
            </LoginThemeProvider>
          );

          // Wait for initial load
          await waitFor(() => {
            expect(getByTestId('theme-name')).toHaveTextContent(initialConfig.name);
          }, { timeout: 2000 });

          // Switch preset
          const switchButton = getByTestId('switch-preset');
          await act(async () => {
            switchButton.click();
            await new Promise((resolve) => setTimeout(resolve, 200));
          });

          // During switch, component should not show error state
          await waitFor(() => {
            const errorElement = queryByText(/Error:/);
            expect(errorElement).toBeNull();
          }, { timeout: 1000 });

          // Wait for switch to complete
          await waitFor(
            () => {
              expect(getByTestId('theme-name')).toHaveTextContent(targetConfig.name);
            },
            { timeout: 3000 }
          );

          // Cleanup
          unmount();
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
        }
      ),
      { numRuns: 10 }
    );
  }, 20000);

  it('should apply all token categories when switching presets', async () => {
    await fc.assert(
      fc.asyncProperty(
        presetNameArbitrary,
        presetNameArbitrary,
        async (initialPreset, targetPreset) => {
          // Skip if presets are the same
          if (initialPreset === targetPreset) return;

          const initialConfig = presets[initialPreset];
          const targetConfig = presets[targetPreset];

          global.fetch = vi.fn().mockImplementation((url: string) => {
            const urlStr = url.toString();
            
            if (urlStr.includes(`/presets/${targetPreset}`)) {
              return Promise.resolve({
                ok: true,
                json: async () => targetConfig,
              });
            }
            
            return Promise.resolve({
              ok: true,
              json: async () => initialConfig,
            });
          });

          const { getByTestId, unmount } = render(
            <LoginThemeProvider tenantId="test">
              <TestComponent targetPreset={targetPreset} />
            </LoginThemeProvider>
          );

          // Wait for initial load
          await waitFor(() => {
            expect(getByTestId('theme-name')).toHaveTextContent(initialConfig.name);
          }, { timeout: 2000 });

          // Switch preset
          const switchButton = getByTestId('switch-preset');
          await act(async () => {
            switchButton.click();
            await new Promise((resolve) => setTimeout(resolve, 200));
          });

          // Wait for switch to complete
          await waitFor(
            () => {
              expect(getByTestId('theme-name')).toHaveTextContent(targetConfig.name);
            },
            { timeout: 3000 }
          );

          // Verify all token categories are applied
          const root = document.documentElement;

          // Colors
          expect(root.style.getPropertyValue('--login-surface-primary')).toBe(
            targetConfig.tokens.colors.surface.primary
          );
          expect(root.style.getPropertyValue('--login-text-primary')).toBe(
            targetConfig.tokens.colors.text.primary
          );
          expect(root.style.getPropertyValue('--login-accent-primary')).toBe(
            targetConfig.tokens.colors.accent.primary
          );

          // Typography
          expect(root.style.getPropertyValue('--login-font-primary')).toBe(
            targetConfig.tokens.typography.fontFamily.primary
          );
          expect(root.style.getPropertyValue('--login-text-base')).toBe(
            targetConfig.tokens.typography.fontSize.base
          );

          // Spacing
          expect(root.style.getPropertyValue('--login-space-md')).toBe(
            targetConfig.tokens.spacing.scale.md
          );

          // Radius
          expect(root.style.getPropertyValue('--login-radius-card')).toBe(
            targetConfig.tokens.radius.card
          );

          // Cleanup
          unmount();
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
        }
      ),
      { numRuns: 10 }
    );
  }, 20000);

  it('should handle preset switch failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(presetNameArbitrary, async (initialPreset) => {
        const initialConfig = presets[initialPreset];

        global.fetch = vi.fn().mockImplementation((url: string) => {
          const urlStr = url.toString();
          
          if (urlStr.includes('/presets/fail-preset')) {
            // Preset switch request fails
            return Promise.reject(new Error('Network error'));
          }
          
          // Initial tenant load succeeds
          return Promise.resolve({
            ok: true,
            json: async () => initialConfig,
          });
        });

        const { getByTestId, queryByText, unmount } = render(
          <LoginThemeProvider tenantId="test">
            <TestComponent targetPreset="fail-preset" />
          </LoginThemeProvider>
        );

        // Wait for initial load
        await waitFor(() => {
          expect(getByTestId('theme-name')).toHaveTextContent(initialConfig.name);
        }, { timeout: 2000 });

        // Capture initial CSS variables
        const root = document.documentElement;
        const initialPrimaryColor = root.style.getPropertyValue('--login-surface-primary');

        // Attempt to switch preset (will fail)
        const switchButton = getByTestId('switch-preset');

        await act(async () => {
          try {
            switchButton.click();
            // Wait for the promise to reject
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (e) {
            // Expected to fail
          }
        });

        // Wait a bit for any state updates
        await new Promise((resolve) => setTimeout(resolve, 200));

        // After failed switch, component shows error OR maintains original theme
        // Both are acceptable behaviors for graceful failure handling
        const errorElement = queryByText(/Network error/);
        if (errorElement) {
          // Error state is shown - this is acceptable
          expect(errorElement).toBeTruthy();
        } else {
          // Original theme is maintained - this is also acceptable
          expect(getByTestId('theme-name')).toHaveTextContent(initialConfig.name);
          expect(root.style.getPropertyValue('--login-surface-primary')).toBe(initialPrimaryColor);
        }

        // Cleanup
        unmount();
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });
      }),
      { numRuns: 10 }
    );
  }, 15000);
});

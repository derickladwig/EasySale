/**
 * Configuration Loading Tests
 *
 * Unit tests for configuration precedence, caching, and offline access.
 * Validates Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { LoginThemeProvider, useLoginTheme } from './LoginThemeProvider';
import type { LoginThemeConfig } from './types';
import minimalDarkPreset from './presets/minimalDark.json';

// ============================================================================
// Test Component
// ============================================================================

function TestComponent() {
  const { config, isLoading } = useLoginTheme();
  return (
    <div data-testid="test-component" data-loading={isLoading}>
      <span data-testid="config-name">{config.name}</span>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Configuration Loading', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration Precedence (Requirement 8.2)', () => {
    it('should prioritize device config over store and tenant configs', async () => {
      // Arrange
      const deviceConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Device Config',
      } as LoginThemeConfig;

      const storeConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Store Config',
      } as LoginThemeConfig;

      const tenantConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Tenant Config',
      } as LoginThemeConfig;

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/device/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(deviceConfig),
          });
        }
        if (url.includes('/store/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(storeConfig),
          });
        }
        if (url.includes('/tenant/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(tenantConfig),
          });
        }
        return Promise.resolve({ ok: false });
      });

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1" storeId="store-1" deviceId="device-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe('Device Config');
        },
        { timeout: 2000 }
      );
    });

    it('should prioritize store config over tenant config when device config is unavailable', async () => {
      // Arrange
      const storeConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Store Config',
      } as LoginThemeConfig;

      const tenantConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Tenant Config',
      } as LoginThemeConfig;

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/device/')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('/store/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(storeConfig),
          });
        }
        if (url.includes('/tenant/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(tenantConfig),
          });
        }
        return Promise.resolve({ ok: false });
      });

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1" storeId="store-1" deviceId="device-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe('Store Config');
        },
        { timeout: 2000 }
      );
    });

    it('should use tenant config when device and store configs are unavailable', async () => {
      // Arrange
      const tenantConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Tenant Config',
      } as LoginThemeConfig;

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/device/') || url.includes('/store/')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('/tenant/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(tenantConfig),
          });
        }
        return Promise.resolve({ ok: false });
      });

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1" storeId="store-1" deviceId="device-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe('Tenant Config');
        },
        { timeout: 2000 }
      );
    });

    it('should use default preset when all network requests fail (Requirement 8.5)', async () => {
      // Arrange
      fetchMock.mockImplementation(() => Promise.resolve({ ok: false }));

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1" storeId="store-1" deviceId="device-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe(minimalDarkPreset.name);
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Configuration Caching (Requirements 8.3, 8.4)', () => {
    it('should cache configuration in localStorage after successful load', async () => {
      // Arrange
      const config: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Test Config',
      } as LoginThemeConfig;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(config),
      });

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const cached = localStorage.getItem('EasySale_login_theme');
          expect(cached).toBeTruthy();
          if (cached) {
            const parsedConfig = JSON.parse(cached);
            expect(parsedConfig.name).toBe('Test Config');
          }
        },
        { timeout: 2000 }
      );
    });

    it('should use cached configuration when network is unavailable', async () => {
      // Arrange
      const cachedConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Cached Config',
      } as LoginThemeConfig;

      localStorage.setItem('EasySale_login_theme', JSON.stringify(cachedConfig));
      localStorage.setItem('EasySale_login_theme_timestamp', Date.now().toString());

      fetchMock.mockRejectedValue(new Error('Network unavailable'));

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe('Cached Config');
        },
        { timeout: 2000 }
      );
    });

    it('should prefer network config over cached config when network is available', async () => {
      // Arrange
      const cachedConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Cached Config',
      } as LoginThemeConfig;

      localStorage.setItem('EasySale_login_theme', JSON.stringify(cachedConfig));

      const networkConfig: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Network Config',
      } as LoginThemeConfig;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(networkConfig),
      });

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe('Network Config');

          // Verify cache was updated
          const cached = localStorage.getItem('EasySale_login_theme');
          if (cached) {
            const parsedConfig = JSON.parse(cached);
            expect(parsedConfig.name).toBe('Network Config');
          }
        },
        { timeout: 2000 }
      );
    });

    it('should fall back to default preset when cache is invalid and network fails', async () => {
      // Arrange
      localStorage.setItem('EasySale_login_theme', 'invalid json');
      fetchMock.mockRejectedValue(new Error('Network unavailable'));

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const configNameElement = document.querySelector('[data-testid="config-name"]');
          expect(configNameElement?.textContent).toBe(minimalDarkPreset.name);
        },
        { timeout: 2000 }
      );
    });

    it('should store timestamp when caching configuration', async () => {
      // Arrange
      const config: LoginThemeConfig = {
        ...minimalDarkPreset,
        name: 'Test Config',
      } as LoginThemeConfig;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(config),
      });

      const beforeTimestamp = Date.now();

      // Act
      render(
        <LoginThemeProvider tenantId="tenant-1">
          <TestComponent />
        </LoginThemeProvider>
      );

      // Assert
      await waitFor(
        () => {
          const timestamp = localStorage.getItem('EasySale_login_theme_timestamp');
          expect(timestamp).toBeTruthy();
          if (timestamp) {
            const parsedTimestamp = parseInt(timestamp, 10);
            expect(parsedTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(parsedTimestamp).toBeLessThanOrEqual(Date.now());
          }
        },
        { timeout: 2000 }
      );
    });
  });
});

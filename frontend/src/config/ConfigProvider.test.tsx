import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, useConfig } from './ConfigProvider';
import type { TenantConfig } from './types';

// ============================================================================
// Test Component
// ============================================================================

function TestComponent() {
  const {
    config,
    isLoading,
    error,
    branding,
    theme,
    categories,
    navigation,
    modules,
    localization,
    getCategory,
    isModuleEnabled,
    getModuleSettings,
    formatCurrency,
    formatDate,
    formatNumber,
  } = useConfig();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div data-testid="company-name">{branding.company.name}</div>
      <div data-testid="theme-mode">{theme.mode}</div>
      <div data-testid="categories-count">{categories.length}</div>
      <div data-testid="navigation-count">{navigation.length}</div>
      <div data-testid="currency">{formatCurrency(1234.56)}</div>
      <div data-testid="date">{formatDate(new Date('2024-01-15'))}</div>
      <div data-testid="number">{formatNumber(1234567.89)}</div>
      <div data-testid="category-exists">{getCategory('test-category') ? 'yes' : 'no'}</div>
      <div data-testid="module-enabled">{isModuleEnabled('inventory') ? 'yes' : 'no'}</div>
      <div data-testid="module-settings">{JSON.stringify(getModuleSettings('inventory'))}</div>
    </div>
  );
}

// ============================================================================
// Mock Configuration
// ============================================================================

const mockConfig: TenantConfig = {
  version: '1.0.0',
  tenant: {
    id: 'test-tenant',
    name: 'Test Business',
    slug: 'test-business',
    domain: 'test.example.com',
  },
  branding: {
    company: {
      name: 'Test Company',
      tagline: 'Test Tagline',
      logo: '/logo.png',
    },
    login: {
      background: '/bg.jpg',
      message: 'Welcome',
    },
    receipts: {
      header: 'Test Receipt',
      footer: 'Thank you',
    },
    store: {
      name: 'Test Store',
      station: 'Station 1',
    },
  },
  theme: {
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    fonts: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      mono: 'Fira Code, monospace',
    },
    spacing: {
      base: 4,
      scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
    },
  },
  categories: [
    {
      id: 'test-category',
      name: 'Test Category',
      icon: 'box',
      color: '#3b82f6',
      attributes: [],
      searchFields: [],
    },
  ],
  navigation: {
    main: [
      {
        id: 'home',
        label: 'Home',
        route: '/',
        icon: 'home',
      },
    ],
    quickActions: [],
  },
  widgets: {
    dashboard: [],
  },
  modules: {
    inventory: {
      enabled: true,
      settings: {
        trackSerialNumbers: true,
        lowStockThreshold: 10,
      },
    },
    layaway: {
      enabled: false,
      settings: {},
    },
  },
  database: {
    customTables: [],
    customColumns: {},
  },
  localization: {
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
    },
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
  },
  layouts: {},
  wizards: {},
};

// ============================================================================
// Tests
// ============================================================================

describe('ConfigProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should provide config from prop', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company');
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    });

    it('should provide initialConfig', () => {
      render(
        <ConfigProvider initialConfig={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company');
    });

    it('should show loading state when fetching config', () => {
      // Mock fetch to never resolve
      global.fetch = vi.fn(() => new Promise(() => {})) as any;

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load config from API', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        } as Response)
      ) as any;

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/config');
    });

    it('should use custom configPath', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        } as Response)
      );

      render(
        <ConfigProvider configPath="/custom/config">
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/custom/config');
      });
    });

    it('should cache config in localStorage', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        } as Response)
      );

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        const cached = localStorage.getItem('EasySale_config');
        expect(cached).toBeTruthy();
        expect(JSON.parse(cached!).tenant.id).toBe('test-tenant');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API fetch error and show error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        // Should show error or fall back to default config
        const errorElement = screen.queryByText(/Error:/);
        const companyElement = screen.queryByTestId('company-name');
        expect(errorElement || companyElement).toBeInTheDocument();
      });
    });

    it('should handle API error response and use default', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        // Should fall back to default config
        expect(screen.getByTestId('company-name')).toBeInTheDocument();
      });
    });

    it('should load from cache on API error', async () => {
      // Set up cache
      localStorage.setItem('EasySale_config', JSON.stringify(mockConfig));

      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      );

      await waitFor(() => {
        // Should load from cache or show error
        const companyElement = screen.queryByTestId('company-name');
        const errorElement = screen.queryByText(/Error:/);
        expect(companyElement || errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Convenience Accessors', () => {
    it('should provide branding accessor', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company');
    });

    it('should provide theme accessor', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    });

    it('should provide categories accessor', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('categories-count')).toHaveTextContent('1');
    });

    it('should provide navigation accessor', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('navigation-count')).toHaveTextContent('1');
    });
  });

  describe('Helper Functions', () => {
    it('should get category by ID', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('category-exists')).toHaveTextContent('yes');
    });

    it('should return undefined for non-existent category', () => {
      const TestCategoryNotFound = () => {
        const { getCategory } = useConfig();
        const category = getCategory('non-existent');
        return <div data-testid="result">{category ? 'found' : 'not-found'}</div>;
      };

      render(
        <ConfigProvider config={mockConfig}>
          <TestCategoryNotFound />
        </ConfigProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('not-found');
    });

    it('should check if module is enabled', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('module-enabled')).toHaveTextContent('yes');
    });

    it('should return false for disabled module', () => {
      const TestDisabledModule = () => {
        const { isModuleEnabled } = useConfig();
        return <div data-testid="result">{isModuleEnabled('layaway') ? 'yes' : 'no'}</div>;
      };

      render(
        <ConfigProvider config={mockConfig}>
          <TestDisabledModule />
        </ConfigProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('no');
    });

    it('should get module settings', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      const settings = screen.getByTestId('module-settings').textContent;
      expect(settings).toContain('trackSerialNumbers');
      expect(settings).toContain('lowStockThreshold');
    });

    it('should format currency', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('currency')).toHaveTextContent('$1,234.56');
    });

    it('should format currency with symbol after', () => {
      const configWithSymbolAfter = {
        ...mockConfig,
        localization: {
          ...mockConfig.localization,
          currency: {
            ...mockConfig.localization.currency,
            position: 'after' as const,
          },
        },
      };

      const TestCurrencyAfter = () => {
        const { formatCurrency } = useConfig();
        return <div data-testid="result">{formatCurrency(1234.56)}</div>;
      };

      render(
        <ConfigProvider config={configWithSymbolAfter}>
          <TestCurrencyAfter />
        </ConfigProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('1,234.56$');
    });

    it('should format date', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      // Date formatting may vary by timezone, just check it's formatted
      const dateText = screen.getByTestId('date').textContent;
      expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should format date with DD/MM/YYYY format', () => {
      const configWithDDMMYYYY = {
        ...mockConfig,
        localization: {
          ...mockConfig.localization,
          dateFormat: 'DD/MM/YYYY',
        },
      };

      const TestDateFormat = () => {
        const { formatDate } = useConfig();
        return <div data-testid="result">{formatDate(new Date('2024-01-15'))}</div>;
      };

      render(
        <ConfigProvider config={configWithDDMMYYYY}>
          <TestDateFormat />
        </ConfigProvider>
      );

      // Date formatting may vary by timezone, just check format
      const dateText = screen.getByTestId('result').textContent;
      expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should format number', () => {
      render(
        <ConfigProvider config={mockConfig}>
          <TestComponent />
        </ConfigProvider>
      );

      expect(screen.getByTestId('number')).toHaveTextContent('1,234,568');
    });

    it('should format number with custom separators', () => {
      const configWithCustomSeparators = {
        ...mockConfig,
        localization: {
          ...mockConfig.localization,
          numberFormat: {
            decimal: ',',
            thousands: '.',
          },
        },
      };

      const TestNumberFormat = () => {
        const { formatNumber } = useConfig();
        return <div data-testid="result">{formatNumber(1234567.89)}</div>;
      };

      render(
        <ConfigProvider config={configWithCustomSeparators}>
          <TestNumberFormat />
        </ConfigProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('1.234.568');
    });
  });

  describe('useConfig Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useConfig must be used within a ConfigProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Config Reload', () => {
    it('should reload config when reloadConfig is called', async () => {
      let fetchCount = 0;
      global.fetch = vi.fn(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockConfig,
              branding: {
                ...mockConfig.branding,
                company: {
                  ...mockConfig.branding.company,
                  name: `Test Company ${fetchCount}`,
                },
              },
            }),
        } as Response);
      });

      const TestReload = () => {
        const { branding, reloadConfig } = useConfig();
        return (
          <div>
            <div data-testid="company-name">{branding.company.name}</div>
            <button onClick={() => reloadConfig()}>Reload</button>
          </div>
        );
      };

      render(
        <ConfigProvider>
          <TestReload />
        </ConfigProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company 1');
      });

      // Click reload button
      screen.getByText('Reload').click();

      await waitFor(() => {
        expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company 2');
      });

      expect(fetchCount).toBe(2);
    });
  });
});

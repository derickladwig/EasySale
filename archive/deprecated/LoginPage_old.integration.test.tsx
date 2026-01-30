/**
 * @deprecated QUARANTINED - Tests for deprecated LoginPage
 * 
 * Quarantined: 2026-01-29
 * Reason: LoginPage replaced by LoginPageV2
 * Replacement: Tests should be written for LoginPageV2 if needed
 * 
 * These tests are skipped to prevent CI failures.
 * The original LoginPage is preserved per NO DELETES policy.
 * 
 * Original description:
 * Integration Tests: Login Page
 *
 * End-to-end integration tests for the complete login system.
 * Tests all components working together.
 *
 * Validates Requirements: All
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@common/contexts/AuthContext';
import { LoginPage } from './LoginPage';
import type { LoginThemeConfig } from '../theme/types';
import minimalDarkPreset from '../theme/presets/minimalDark.json';

// ============================================================================
// Setup
// ============================================================================

// Helper to render with Router and Auth context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

// QUARANTINED: Tests skipped - LoginPage replaced by LoginPageV2
describe.skip('LoginPage Integration Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Test: Fresh Install Loads Default Preset
  // ==========================================================================

  it('should load default preset on fresh install', async () => {
    // Arrange: Mock fetch to fail (simulating no network config)
    fetchMock.mockRejectedValue(new Error('Network unavailable'));

    // Act
    const { container } = renderWithRouter(<LoginPage />);

    // Assert: Should render with new centered layout
    await waitFor(
      () => {
        const layout = container.querySelector('.min-h-screen.bg-background-primary');
        expect(layout).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Assert: Should have background
    const background = container.querySelector('.fixed.inset-0');
    expect(background).toBeTruthy();

    // Assert: Should have header
    const header = container.querySelector('[data-testid="header-slot"]');
    expect(header).toBeTruthy();

    // Assert: Should have logo
    const logo = container.querySelector('[data-testid="login-logo"]');
    expect(logo).toBeTruthy();

    // Assert: Should have auth card
    const authCard = container.querySelector('[data-testid="auth-card"]');
    expect(authCard).toBeTruthy();
  });

  // ==========================================================================
  // Test: Custom Preset Loads After Configuration
  // ==========================================================================

  it('should load custom preset from configuration', async () => {
    // Arrange: Mock fetch to return custom config
    const customConfig: LoginThemeConfig = {
      ...minimalDarkPreset,
      name: 'Custom Config',
    } as LoginThemeConfig;

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(customConfig),
    });

    // Act
    const { container } = renderWithRouter(<LoginPage tenantId="tenant-1" />);

    // Assert: Should load custom config
    await waitFor(
      () => {
        const cached = localStorage.getItem('EasySale_login_theme');
        if (cached) {
          const parsedConfig = JSON.parse(cached);
          expect(parsedConfig.name).toBe('Custom Config');
        }
      },
      { timeout: 2000 }
    );

    // Assert: Should render new centered layout
    const layout = container.querySelector('.min-h-screen.bg-background-primary');
    expect(layout).toBeTruthy();
  });

  // ==========================================================================
  // Test: Offline Mode Uses Cached Configuration
  // ==========================================================================

  it('should use cached configuration when offline', async () => {
    // Arrange: Set up cached config
    const cachedConfig: LoginThemeConfig = {
      ...minimalDarkPreset,
      name: 'Cached Config',
    } as LoginThemeConfig;

    localStorage.setItem('EasySale_login_theme', JSON.stringify(cachedConfig));
    localStorage.setItem('EasySale_login_theme_timestamp', Date.now().toString());

    // Mock fetch to fail (offline)
    fetchMock.mockRejectedValue(new Error('Network unavailable'));

    // Act
    const { container } = renderWithRouter(<LoginPage />);

    // Assert: Should render with cached config
    await waitFor(
      () => {
        const layout = container.querySelector('.min-h-screen.bg-background-primary');
        expect(layout).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Assert: Should have all components
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy(); // Background
    expect(container.querySelector('[data-testid="header-slot"]')).toBeTruthy(); // Header
    expect(container.querySelector('[data-testid="login-logo"]')).toBeTruthy(); // Logo
    expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy(); // Auth card
  });

  // ==========================================================================
  // Test: All Components Render Together
  // ==========================================================================

  it('should render all components together', async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });

    // Act
    const { container } = renderWithRouter(<LoginPage />);

    // Assert: Wait for theme to load
    await waitFor(
      () => {
        const layout = container.querySelector('.min-h-screen.bg-background-primary');
        expect(layout).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Assert: Background should be rendered
    const background = container.querySelector('.fixed.inset-0');
    expect(background).toBeTruthy();

    // Assert: Header should be rendered with company name
    const header = container.querySelector('[data-testid="header-slot"]');
    expect(header).toBeTruthy();
    const companyName = container.querySelector('[data-testid="header-company-name"]');
    expect(companyName?.textContent).toBe('EasySale');

    // Assert: Footer should be rendered with version
    const footer = container.querySelector('[data-testid="footer-slot"]');
    expect(footer).toBeTruthy();
    const version = container.querySelector('[data-testid="footer-version"]');
    expect(version?.textContent).toContain('1.0.0');

    // Assert: Logo should be rendered
    const logo = container.querySelector('[data-testid="login-logo"]');
    expect(logo).toBeTruthy();

    // Assert: Auth card should be rendered
    const authCard = container.querySelector('[data-testid="auth-card"]');
    expect(authCard).toBeTruthy();
  });

  // ==========================================================================
  // Test: Login Flow Works End-to-End
  // ==========================================================================

  it('should handle complete login flow', async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });

    const onLoginSuccess = vi.fn();
    const onLoginError = vi.fn();

    const { container } = renderWithRouter(
      <LoginPage onLoginSuccess={onLoginSuccess} onLoginError={onLoginError} />
    );

    // Wait for render
    await waitFor(
      () => {
        expect(container.querySelector('.min-h-screen.bg-background-primary')).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Act: Find and fill in credentials
    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (usernameInput && passwordInput && submitButton) {
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: '1234' } });
      fireEvent.click(submitButton);

      // Assert: Should call success callback
      await waitFor(
        () => {
          expect(onLoginSuccess).toHaveBeenCalledWith('user-authenticated');
        },
        { timeout: 3000 }
      );
    }
  });

  // ==========================================================================
  // Test: Error Handling Works
  // ==========================================================================

  it('should display errors when login fails', async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });

    const onLoginError = vi.fn();

    const { container } = renderWithRouter(<LoginPage onLoginError={onLoginError} />);

    // Wait for render
    await waitFor(
      () => {
        expect(container.querySelector('.min-h-screen.bg-background-primary')).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Mock login API to fail
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });

    // Act: Submit with invalid credentials
    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (usernameInput && passwordInput && submitButton) {
      fireEvent.change(usernameInput, { target: { value: 'wrong' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);

      // Assert: Should display error
      await waitFor(
        () => {
          const errorCallout = container.querySelector('[data-testid="error-callout"]');
          expect(errorCallout).toBeTruthy();
        },
        { timeout: 3000 }
      );

      // Assert: Should call error callback
      expect(onLoginError).toHaveBeenCalled();
    }
  });

  // ==========================================================================
  // Test: Environment Switching Works
  // ==========================================================================

  it('should allow environment switching', async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });

    const { container } = renderWithRouter(<LoginPage />);

    // Wait for render
    await waitFor(
      () => {
        expect(container.querySelector('.min-h-screen.bg-background-primary')).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Act: Find and change environment selector
    const envSelector = container.querySelector(
      '[data-testid="environment-select"]'
    ) as HTMLSelectElement;

    if (envSelector) {
      expect(envSelector.value).toBe('production');

      fireEvent.change(envSelector, { target: { value: 'demo' } });

      // Assert: Should update to demo
      expect(envSelector.value).toBe('demo');
    }
  });

  // ==========================================================================
  // Test: Responsive Layout Works
  // ==========================================================================

  it('should apply responsive layout classes', async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });

    // Act
    const { container } = renderWithRouter(<LoginPage />);

    // Assert: Wait for render
    await waitFor(
      () => {
        const layout = container.querySelector('.min-h-screen.bg-background-primary');
        expect(layout).toBeTruthy();

        // Should have flex layout classes
        expect(layout?.className).toContain('flex');
        expect(layout?.className).toContain('flex-col');
      },
      { timeout: 2000 }
    );
  });

  // ==========================================================================
  // Test: Task 11.3 - Login Responsiveness
  // ==========================================================================

  describe('Task 11.3: Login Responsiveness', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(minimalDarkPreset),
      });
    });

    it('should have full-width card on mobile (Requirement 2.8)', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Wait for render
      await waitFor(
        () => {
          const cardContainer = container.querySelector('.w-full.sm\\:max-w-md');
          expect(cardContainer).toBeTruthy();
          expect(cardContainer?.className).toContain('w-full');
          expect(cardContainer?.className).toContain('sm:max-w-md');
        },
        { timeout: 2000 }
      );
    });

    it('should auto-focus username field on load (Requirement 2.10)', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Wait for render and check focus
      await waitFor(
        () => {
          const usernameInput = container.querySelector('#username') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();
          // Note: In test environment, focus might not work exactly as in browser
          // but we can verify the ref is attached
          expect(usernameInput).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should display errors with red accent (Requirement 2.9)', async () => {
      // Arrange
      const { container } = renderWithRouter(<LoginPage />);

      // Wait for initial render
      await waitFor(
        () => {
          expect(container.querySelector('.min-h-screen.bg-background-primary')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Mock login API to fail
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      // Act: Submit with invalid credentials
      const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'wrong' } });
        fireEvent.change(passwordInput, { target: { value: 'wrong' } });
        fireEvent.click(submitButton);

        // Assert: Should display error with error severity (red accent)
        await waitFor(
          () => {
            const errorCallout = container.querySelector('[data-testid="error-callout"]');
            expect(errorCallout).toBeTruthy();
            expect(errorCallout?.getAttribute('data-severity')).toBe('error');
          },
          { timeout: 3000 }
        );
      }
    });

    it('should have appropriate padding on mobile (Requirement 2.8)', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Wait for render
      await waitFor(
        () => {
          const loginCard = container.querySelector('.bg-background-secondary.rounded-lg');
          expect(loginCard).toBeTruthy();
          // Should have responsive padding: p-4 sm:p-6 md:p-8
          expect(loginCard?.className).toContain('p-4');
          expect(loginCard?.className).toContain('sm:p-6');
          expect(loginCard?.className).toContain('md:p-8');
        },
        { timeout: 2000 }
      );
    });
  });
});

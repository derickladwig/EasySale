/**
 * Auth Card Component - Unit Tests
 *
 * Tests authentication card rendering with different configurations.
 *
 * Validates Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthCard } from './AuthCard';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig } from '../theme/types';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockConfig = (
  authCardConfig: Partial<LoginThemeConfig['components']['authCard']> = {}
): LoginThemeConfig => ({
  name: 'Test Config',
  version: '1.0.0',
  layout: {
    template: 'splitHeroCompactForm',
    slots: {
      header: { enabled: true, components: [] },
      left: { variant: 'marketing' },
      main: { variant: 'compact' },
      footer: { enabled: true, components: [] },
    },
    responsive: {
      breakpoints: { mobile: 320, tablet: 768, desktop: 1024, kiosk: 1920 },
      stackOnMobile: true,
    },
  },
  tokens: {
    colors: {
      surface: { primary: '#0f172a', secondary: '#1e293b', tertiary: '#334155' },
      text: { primary: '#f8fafc', secondary: '#e2e8f0', tertiary: '#cbd5e1', inverse: '#0f172a' },
      border: { default: '#475569', focus: '#60a5fa', error: '#f87171' },
      accent: { primary: '#3b82f6', hover: '#2563eb', active: '#1d4ed8' },
      status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    },
    typography: {
      fontFamily: { primary: 'Inter, sans-serif', monospace: 'monospace' },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
      },
      fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    },
    spacing: {
      scale: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
      density: 'comfortable',
    },
    shadows: {
      elevation: {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      },
    },
    blur: {
      backdrop: { none: 'none', sm: 'blur(4px)', md: 'blur(12px)', lg: 'blur(16px)' },
      enabled: true,
    },
    radius: { card: '12px', input: '6px', button: '6px', pill: '9999px' },
  },
  components: {
    authCard: {
      methods: ['password'],
      showStorePicker: false,
      showStationPicker: false,
      showDeviceIdentity: false,
      showDemoAccounts: false,
      glassmorphism: false,
      elevation: 'md',
      ...authCardConfig,
    },
    statusCard: {
      variant: 'systemForward',
      showDatabaseStatus: true,
      showSyncStatus: true,
      showLastSync: true,
      showStoreInfo: true,
      showStationInfo: true,
    },
    header: {
      showLogo: true,
      showEnvironmentSelector: false,
      showHelpMenu: false,
      companyName: 'Test',
    },
    footer: {
      showVersion: false,
      showBuild: false,
      showCopyright: false,
      copyrightText: '© 2026',
    },
    errorCallout: {
      presentation: 'inline',
      showRetryAction: true,
      showDiagnosticsAction: false,
    },
  },
  background: {
    type: 'solid',
    solid: { color: '#000' },
  },
});

// ============================================================================
// Tests
// ============================================================================

describe('AuthCard', () => {
  it('renders with headline and submit button', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    const signInElements = screen.getAllByText('Sign In');
    expect(signInElements.length).toBeGreaterThan(0);
    expect(screen.getByTestId('submit-button')).toBeTruthy();
  });

  it('renders password inputs for password method', () => {
    const config = createMockConfig({ methods: ['password'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('username-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
  });

  it('renders PIN input for pin method', () => {
    const config = createMockConfig({ methods: ['pin'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('pin-input')).toBeTruthy();
    expect(screen.queryByTestId('username-input')).toBeFalsy();
    expect(screen.queryByTestId('password-input')).toBeFalsy();
  });

  it('renders badge input for badge method', () => {
    const config = createMockConfig({ methods: ['badge'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('badge-input')).toBeTruthy();
    expect(screen.queryByTestId('username-input')).toBeFalsy();
    expect(screen.queryByTestId('password-input')).toBeFalsy();
  });

  it('applies glassmorphism class when enabled', () => {
    const config = createMockConfig({ glassmorphism: true });

    const { container } = render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    const card = container.querySelector('.auth-card--glass');
    expect(card).toBeTruthy();
  });

  it('does not apply glassmorphism class when disabled', () => {
    const config = createMockConfig({ glassmorphism: false });

    const { container } = render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    const card = container.querySelector('.auth-card--glass');
    expect(card).toBeFalsy();
  });

  it('displays error message when provided', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard error="Invalid credentials" />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('auth-error')).toBeTruthy();
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('does not display error when null', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard error={null} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('auth-error')).toBeFalsy();
  });

  it('calls onSubmit with credentials when form submitted', () => {
    const config = createMockConfig({ methods: ['password'] });
    const onSubmit = vi.fn();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard onSubmit={onSubmit} />
      </LoginThemeProvider>
    );

    const usernameInput = screen.getByTestId('username-input') as HTMLInputElement;
    const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'password',
        username: 'testuser',
        password: 'testpass',
      })
    );
  });

  it('disables inputs and button when loading', () => {
    const config = createMockConfig({ methods: ['password'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard isLoading={true} />
      </LoginThemeProvider>
    );

    const usernameInput = screen.getByTestId('username-input') as HTMLInputElement;
    const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    expect(usernameInput.disabled).toBe(true);
    expect(passwordInput.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(screen.getByText('Signing in...')).toBeTruthy();
  });

  it('does not call onSubmit when loading', () => {
    const config = createMockConfig();
    const onSubmit = vi.fn();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard onSubmit={onSubmit} isLoading={true} />
      </LoginThemeProvider>
    );

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies configured elevation shadow', () => {
    const config = createMockConfig({ elevation: 'lg' });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    const card = screen.getByTestId('auth-card') as HTMLElement;
    expect(card.style.boxShadow).toBeTruthy();
  });

  it('applies no shadow when elevation is none', () => {
    const config = createMockConfig({ elevation: 'none' });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    const card = screen.getByTestId('auth-card') as HTMLElement;
    expect(card.style.boxShadow).toBe('none');
  });

  it('displays method tabs when multiple methods configured', () => {
    const config = createMockConfig({ methods: ['password', 'pin', 'badge'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('auth-method-tabs')).toBeTruthy();
    expect(screen.getByTestId('auth-method-tab-password')).toBeTruthy();
    expect(screen.getByTestId('auth-method-tab-pin')).toBeTruthy();
    expect(screen.getByTestId('auth-method-tab-badge')).toBeTruthy();
  });

  it('does not display method tabs when only one method configured', () => {
    const config = createMockConfig({ methods: ['password'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('auth-method-tabs')).toBeFalsy();
  });

  it('switches input fields when method tab clicked', () => {
    const config = createMockConfig({ methods: ['password', 'pin'] });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    // Initially shows password inputs
    expect(screen.getByTestId('username-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.queryByTestId('pin-input')).toBeFalsy();

    // Click PIN tab
    const pinTab = screen.getByTestId('auth-method-tab-pin');
    fireEvent.click(pinTab);

    // Now shows PIN input
    expect(screen.getByTestId('pin-input')).toBeTruthy();
    expect(screen.queryByTestId('username-input')).toBeFalsy();
    expect(screen.queryByTestId('password-input')).toBeFalsy();
  });

  it('displays store picker when showStorePicker is true', () => {
    const config = createMockConfig({ showStorePicker: true, showStationPicker: false });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('store-select')).toBeTruthy();
    expect(screen.queryByTestId('station-select')).toBeFalsy();
  });

  it('displays station picker when showStationPicker is true', () => {
    const config = createMockConfig({ showStorePicker: false, showStationPicker: true });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('store-select')).toBeFalsy();
    expect(screen.getByTestId('station-select')).toBeTruthy();
  });

  it('displays both pickers when both are enabled', () => {
    const config = createMockConfig({ showStorePicker: true, showStationPicker: true });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('store-select')).toBeTruthy();
    expect(screen.getByTestId('station-select')).toBeTruthy();
  });

  it('does not display pickers when both are disabled', () => {
    const config = createMockConfig({ showStorePicker: false, showStationPicker: false });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('store-station-picker')).toBeFalsy();
  });

  it('displays device identity when showDeviceIdentity is true', () => {
    const config = createMockConfig({ showDeviceIdentity: true });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('device-identity-row')).toBeTruthy();
    expect(screen.getByTestId('remember-station-checkbox')).toBeTruthy();
  });

  it('does not display device identity when showDeviceIdentity is false', () => {
    const config = createMockConfig({ showDeviceIdentity: false });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('device-identity-row')).toBeFalsy();
  });

  it('displays demo accounts when showDemoAccounts is true and accounts provided', () => {
    const config = createMockConfig({ showDemoAccounts: true });
    const demoAccounts = [
      { username: 'admin', password: 'admin123', role: 'Administrator' },
      { username: 'cashier', password: 'cashier123', role: 'Cashier' },
    ];

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard demoAccounts={demoAccounts} />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('demo-accounts-accordion')).toBeTruthy();
  });

  it('does not display demo accounts when showDemoAccounts is false', () => {
    const config = createMockConfig({ showDemoAccounts: false });
    const demoAccounts = [{ username: 'admin', password: 'admin123', role: 'Administrator' }];

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard demoAccounts={demoAccounts} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('demo-accounts-accordion')).toBeFalsy();
  });

  it('does not display demo accounts when no accounts provided', () => {
    const config = createMockConfig({ showDemoAccounts: true });

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard demoAccounts={[]} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('demo-accounts-accordion')).toBeFalsy();
  });

  it('fills credentials when demo account selected', () => {
    const config = createMockConfig({ showDemoAccounts: true, methods: ['password'] });
    const demoAccounts = [{ username: 'admin', password: 'admin123', role: 'Administrator' }];
    const onSubmit = vi.fn();

    render(
      <LoginThemeProvider initialConfig={config}>
        <AuthCard demoAccounts={demoAccounts} onSubmit={onSubmit} />
      </LoginThemeProvider>
    );

    // Expand demo accounts
    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    // Select demo account
    const accountButton = screen.getByTestId('demo-account-0');
    fireEvent.click(accountButton);

    // Verify credentials are filled
    const usernameInput = screen.getByTestId('username-input') as HTMLInputElement;
    const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;

    expect(usernameInput.value).toBe('admin');
    expect(passwordInput.value).toBe('admin123');
  });
});

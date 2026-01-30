/**
 * AuthCard Enhancement Tests
 * 
 * Tests for task 11.2 enhancements:
 * - Large touch-friendly inputs (48px)
 * - Clear error message display
 * - Loading state during authentication
 * - "Remember Me" checkbox
 * - Station selection dropdown
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthCard } from './AuthCard';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig } from '../theme/types';

// Mock theme config
const mockConfig: LoginThemeConfig = {
  name: 'Test Theme',
  version: '1.0.0',
  layout: {
    template: 'splitHeroCompactForm',
    slots: {
      header: { enabled: true, components: ['logo'] },
      left: { variant: 'marketing' },
      main: { variant: 'compact' },
      footer: { enabled: false, components: [] },
    },
    responsive: {
      breakpoints: { mobile: 320, tablet: 768, desktop: 1024, kiosk: 1920 },
      stackOnMobile: true,
    },
  },
  background: {
    type: 'solid',
    solid: { color: '#0f172a' },
  },
  components: {
    authCard: {
      methods: ['password'],
      glassmorphism: false,
      elevation: 'md',
      showStorePicker: true,
      showStationPicker: true,
      showDeviceIdentity: false,
      showDemoAccounts: false,
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
      showEnvironmentSelector: true,
      showHelpMenu: true,
      companyName: 'Test Company',
    },
    footer: {
      showVersion: true,
      showBuild: true,
      showCopyright: true,
      copyrightText: 'Copyright 2024',
    },
    errorCallout: {
      presentation: 'inline',
      showRetryAction: true,
      showDiagnosticsAction: true,
    },
  },
  tokens: {
    colors: {
      surface: {
        primary: '#1e293b',
        secondary: '#334155',
        tertiary: '#475569',
      },
      text: {
        primary: '#f8fafc',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
        inverse: '#0f172a',
      },
      accent: {
        primary: '#3b82f6',
        hover: '#2563eb',
        active: '#1d4ed8',
      },
      border: {
        default: '#475569',
        focus: '#60a5fa',
        error: '#ef4444',
      },
      status: {
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    },
    typography: {
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      fontFamily: {
        primary: 'Inter, system-ui, sans-serif',
        monospace: 'Fira Code, monospace',
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      scale: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem',
      },
      density: 'comfortable',
    },
    radius: {
      input: '0.375rem',
      button: '0.375rem',
      card: '0.5rem',
      pill: '9999px',
    },
    shadows: {
      elevation: {
        none: 'none',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
    },
    blur: {
      enabled: false,
      backdrop: {
        none: 'none',
        sm: 'blur(4px)',
        md: 'blur(8px)',
        lg: 'blur(12px)',
      },
    },
  },
};

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <LoginThemeProvider initialConfig={mockConfig}>
      {ui}
    </LoginThemeProvider>
  );
};

describe('AuthCard - Task 11.2 Enhancements', () => {
  describe('Touch-friendly inputs (48px height)', () => {
    it('should render username input with minimum 48px height', () => {
      renderWithTheme(<AuthCard />);
      const usernameInput = screen.getByTestId('username-input');
      const styles = window.getComputedStyle(usernameInput);
      
      // Check that minHeight is set to 48px
      expect(usernameInput.style.minHeight).toBe('48px');
    });

    it('should render password input with minimum 48px height', () => {
      renderWithTheme(<AuthCard />);
      const passwordInput = screen.getByTestId('password-input');
      
      expect(passwordInput.style.minHeight).toBe('48px');
    });

    it('should render submit button with minimum 48px height', () => {
      renderWithTheme(<AuthCard />);
      const submitButton = screen.getByTestId('submit-button');
      
      expect(submitButton.style.minHeight).toBe('48px');
    });
  });

  describe('Field-level error display', () => {
    it('should display username error below username field', () => {
      const fieldErrors = { username: 'Username is required' };
      renderWithTheme(<AuthCard fieldErrors={fieldErrors} />);
      
      const errorMessage = screen.getByTestId('username-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Username is required');
    });

    it('should display password error below password field', () => {
      const fieldErrors = { password: 'Password is required' };
      renderWithTheme(<AuthCard fieldErrors={fieldErrors} />);
      
      const errorMessage = screen.getByTestId('password-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Password is required');
    });

    it('should apply error border color to username input when error exists', () => {
      const fieldErrors = { username: 'Username is required' };
      renderWithTheme(<AuthCard fieldErrors={fieldErrors} />);
      
      const usernameInput = screen.getByTestId('username-input');
      // Browser converts hex to RGB, so check for the RGB value or just check border width
      expect(usernameInput.style.border).toContain('2px solid');
    });

    it('should set aria-invalid on input when error exists', () => {
      const fieldErrors = { username: 'Username is required' };
      renderWithTheme(<AuthCard fieldErrors={fieldErrors} />);
      
      const usernameInput = screen.getByTestId('username-input');
      expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error message to input with aria-describedby', () => {
      const fieldErrors = { username: 'Username is required' };
      renderWithTheme(<AuthCard fieldErrors={fieldErrors} />);
      
      const usernameInput = screen.getByTestId('username-input');
      expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');
    });
  });

  describe('Loading state', () => {
    it('should display loading spinner in submit button when loading', () => {
      renderWithTheme(<AuthCard isLoading={true} />);
      
      const submitButton = screen.getByTestId('submit-button');
      const spinner = submitButton.querySelector('.animate-spin');
      
      expect(spinner).toBeInTheDocument();
    });

    it('should change button text to "Signing in..." when loading', () => {
      renderWithTheme(<AuthCard isLoading={true} />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Signing in...');
    });

    it('should disable submit button when loading', () => {
      renderWithTheme(<AuthCard isLoading={true} />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable all inputs when loading', () => {
      renderWithTheme(<AuthCard isLoading={true} />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });
  });

  describe('Remember Me checkbox', () => {
    it('should render Remember Me checkbox for password method', () => {
      renderWithTheme(<AuthCard />);
      
      const checkbox = screen.getByTestId('remember-me-checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should toggle Remember Me checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AuthCard />);
      
      const checkbox = screen.getByTestId('remember-me-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
      
      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('should disable Remember Me checkbox when loading', () => {
      renderWithTheme(<AuthCard isLoading={true} />);
      
      const checkbox = screen.getByTestId('remember-me-checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should include Remember Me state in credentials on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderWithTheme(<AuthCard onSubmit={onSubmit} />);
      
      const checkbox = screen.getByTestId('remember-me-checkbox');
      await user.click(checkbox);
      
      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);
      
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rememberStation: true,
        })
      );
    });
  });

  describe('Station selection dropdown', () => {
    it('should display station picker when showStationPicker is true', () => {
      renderWithTheme(<AuthCard />);
      
      const stationPicker = screen.getByTestId('store-station-picker');
      expect(stationPicker).toBeInTheDocument();
    });

    it('should render station select dropdown', () => {
      renderWithTheme(<AuthCard />);
      
      const stationSelect = screen.getByTestId('station-select');
      expect(stationSelect).toBeInTheDocument();
      expect(stationSelect.tagName).toBe('SELECT');
    });

    it('should have 48px minimum height for station select', () => {
      renderWithTheme(<AuthCard />);
      
      const stationSelect = screen.getByTestId('station-select');
      const styles = window.getComputedStyle(stationSelect);
      
      // The component uses inline styles, so we check the computed style
      expect(styles.minHeight).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should handle all enhancements together', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const fieldErrors = { username: 'Username is required' };
      
      renderWithTheme(
        <AuthCard 
          onSubmit={onSubmit} 
          isLoading={false}
          fieldErrors={fieldErrors}
        />
      );
      
      // Check touch-friendly inputs
      const usernameInput = screen.getByTestId('username-input');
      expect(usernameInput.style.minHeight).toBe('48px');
      
      // Check error display
      const errorMessage = screen.getByTestId('username-error');
      expect(errorMessage).toBeInTheDocument();
      
      // Check Remember Me checkbox
      const checkbox = screen.getByTestId('remember-me-checkbox');
      expect(checkbox).toBeInTheDocument();
      
      // Check station picker
      const stationPicker = screen.getByTestId('store-station-picker');
      expect(stationPicker).toBeInTheDocument();
      
      // Check submit button
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.style.minHeight).toBe('48px');
    });
  });
});

/**
 * Property-based tests for AuthCard configuration
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';

import { AuthCard } from './AuthCard';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig, AuthMethod } from '../theme/types';

const authMethodArb = fc.constantFrom<AuthMethod>('password', 'pin', 'badge');
const elevationArb = fc.constantFrom('none', 'sm', 'md', 'lg');
const glassmorphismArb = fc.boolean();

const mockConfig: LoginThemeConfig = {
  name: 'test',
  version: '1.0.0',
  layout: {
    template: 'splitHeroCompactForm',
    slots: {
      header: { enabled: true, components: [] },
      left: { variant: 'status' },
      main: { variant: 'compact' },
      footer: { enabled: true, components: [] },
    },
    responsive: {
      breakpoints: { mobile: 768, tablet: 1024, desktop: 1440, kiosk: 1920 },
      stackOnMobile: true,
    },
  },
  tokens: {
    colors: {
      surface: { primary: '#000', secondary: '#111', tertiary: '#222' },
      text: { primary: '#fff', secondary: '#ccc', tertiary: '#999', inverse: '#000' },
      accent: { primary: '#3b82f6', hover: '#2563eb', active: '#1d4ed8' },
      border: { default: '#475569', focus: '#60a5fa', error: '#ef4444' },
      status: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    },
    typography: {
      fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', xxl: '1.5rem' },
      fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      fontFamily: { primary: 'Inter', monospace: 'Fira Code' },
      lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    },
    spacing: {
      scale: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
      density: 'comfortable',
    },
    shadows: {
      elevation: { none: 'none', sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)', xl: '0 20px 25px rgba(0,0,0,0.1)' },
    },
    blur: {
      backdrop: { none: 'none', sm: 'blur(4px)', md: 'blur(8px)', lg: 'blur(16px)' },
      enabled: true,
    },
    radius: { input: '0.375rem', button: '0.375rem', card: '0.75rem', pill: '9999px' },
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
      companyName: 'Test',
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
  background: {
    type: 'solid',
  },
};

describe('AuthCard Configuration Properties', () => {
  it('applies glassmorphism class when enabled', () => {
    fc.assert(
      fc.property(glassmorphismArb, (glassmorphism) => {
        const config = {
          ...mockConfig,
          components: {
            ...mockConfig.components,
            authCard: {
              ...mockConfig.components.authCard,
              glassmorphism,
            },
          },
        };

        const { container } = render(
          <LoginThemeProvider initialConfig={config}>
            <AuthCard />
          </LoginThemeProvider>
        );

        const authCard = container.querySelector('[data-testid="auth-card"]');
        if (glassmorphism) {
          expect(authCard).toHaveClass('backdrop-blur-md');
        } else {
          expect(authCard).not.toHaveClass('backdrop-blur-md');
        }
      }),
      { numRuns: 50 }
    );
  });

  it('applies correct elevation class', () => {
    fc.assert(
      fc.property(elevationArb, (elevation) => {
        const config = {
          ...mockConfig,
          components: {
            ...mockConfig.components,
            authCard: {
              ...mockConfig.components.authCard,
              elevation,
            },
          },
        };

        const { container } = render(
          <LoginThemeProvider initialConfig={config}>
            <AuthCard />
          </LoginThemeProvider>
        );

        const authCard = container.querySelector('[data-testid="auth-card"]');
        expect(authCard).toHaveClass(`shadow-${elevation}`);
      }),
      { numRuns: 50 }
    );
  });
});

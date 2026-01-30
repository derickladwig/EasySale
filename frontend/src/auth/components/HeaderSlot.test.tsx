/**
 * Header Slot Component Tests
 *
 * Unit tests for HeaderSlot component.
 * Validates Requirements 9.1, 9.2, 9.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderSlot } from './HeaderSlot';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import minimalDarkPreset from '../theme/presets/minimalDark.json';
import type { LoginThemeConfig } from '../theme/types';

// ============================================================================
// Test Wrapper
// ============================================================================

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <LoginThemeProvider initialConfig={minimalDarkPreset as LoginThemeConfig}>
      {ui}
    </LoginThemeProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('HeaderSlot', () => {
  describe('Branding Display', () => {
    it('should display company name', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" />);

      expect(screen.getByTestId('header-company-name')).toHaveTextContent('EasySale');
    });

    it('should display logo when logoUrl is provided', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" logoUrl="/logo.png" />);

      const logo = screen.getByTestId('header-logo');
      expect(logo).toBeInTheDocument();
      // Logo component should render the image
      const image = screen.getByTestId('header-logo-image');
      expect(image).toHaveAttribute('src', '/logo.png');
      expect(image).toHaveAttribute('alt', 'EasySale logo');
    });

    it('should display text fallback when logoUrl is not provided', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" />);

      const logo = screen.getByTestId('header-logo');
      expect(logo).toBeInTheDocument();
      // Should show text fallback instead of image
      expect(screen.getByTestId('header-logo-text-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('header-logo-image')).not.toBeInTheDocument();
    });
  });

  describe('Environment Selector', () => {
    it('should display environment selector when enabled', () => {
      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          showEnvironmentSelector={true}
          currentEnvironment="production"
        />
      );

      expect(screen.getByTestId('environment-selector')).toBeInTheDocument();
      expect(screen.getByTestId('environment-select')).toHaveValue('production');
    });

    it('should not display environment selector when disabled', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showEnvironmentSelector={false} />);

      expect(screen.queryByTestId('environment-selector')).not.toBeInTheDocument();
    });

    it('should call onEnvironmentChange when environment is changed', async () => {
      const user = userEvent.setup();
      const onEnvironmentChange = vi.fn();

      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          showEnvironmentSelector={true}
          currentEnvironment="production"
          onEnvironmentChange={onEnvironmentChange}
        />
      );

      const select = screen.getByTestId('environment-select');
      await user.selectOptions(select, 'demo');

      expect(onEnvironmentChange).toHaveBeenCalledWith('demo');
    });

    it('should display demo environment correctly', () => {
      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          showEnvironmentSelector={true}
          currentEnvironment="demo"
        />
      );

      expect(screen.getByTestId('environment-select')).toHaveValue('demo');
    });
  });

  describe('Help Icon', () => {
    it('should display help icon when enabled', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showHelpIcon={true} />);

      expect(screen.getByTestId('help-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Help')).toBeInTheDocument();
    });

    it('should not display help icon when disabled', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showHelpIcon={false} />);

      expect(screen.queryByTestId('help-button')).not.toBeInTheDocument();
    });

    it('should call onHelpClick when help icon is clicked', async () => {
      const user = userEvent.setup();
      const onHelpClick = vi.fn();

      renderWithTheme(
        <HeaderSlot companyName="EasySale" showHelpIcon={true} onHelpClick={onHelpClick} />
      );

      await user.click(screen.getByTestId('help-button'));

      expect(onHelpClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Icon', () => {
    it('should display settings icon when enabled', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showSettingsIcon={true} />);

      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should not display settings icon when disabled', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showSettingsIcon={false} />);

      expect(screen.queryByTestId('settings-button')).not.toBeInTheDocument();
    });

    it('should call onSettingsClick when settings icon is clicked', async () => {
      const user = userEvent.setup();
      const onSettingsClick = vi.fn();

      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          showSettingsIcon={true}
          onSettingsClick={onSettingsClick}
        />
      );

      await user.click(screen.getByTestId('settings-button'));

      expect(onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Combined Features', () => {
    it('should display all features when enabled', () => {
      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          logoUrl="/logo.png"
          showEnvironmentSelector={true}
          currentEnvironment="demo"
          showHelpIcon={true}
          showSettingsIcon={true}
        />
      );

      expect(screen.getByTestId('header-logo')).toBeInTheDocument();
      expect(screen.getByTestId('header-company-name')).toHaveTextContent('EasySale');
      expect(screen.getByTestId('environment-selector')).toBeInTheDocument();
      expect(screen.getByTestId('help-button')).toBeInTheDocument();
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('should display only branding when all optional features are disabled', () => {
      renderWithTheme(
        <HeaderSlot
          companyName="EasySale"
          showEnvironmentSelector={false}
          showHelpIcon={false}
          showSettingsIcon={false}
        />
      );

      expect(screen.getByTestId('header-company-name')).toHaveTextContent('EasySale');
      expect(screen.queryByTestId('environment-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('help-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-button')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for environment selector', () => {
      renderWithTheme(<HeaderSlot companyName="EasySale" showEnvironmentSelector={true} />);

      expect(screen.getByLabelText('Select environment')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for icon buttons', () => {
      renderWithTheme(
        <HeaderSlot companyName="EasySale" showHelpIcon={true} showSettingsIcon={true} />
      );

      expect(screen.getByLabelText('Help')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });
  });
});

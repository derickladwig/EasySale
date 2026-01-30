/**
 * Footer Slot Component Tests
 *
 * Unit tests for FooterSlot component.
 * Validates Requirements 9.4, 9.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FooterSlot } from './FooterSlot';
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

describe('FooterSlot', () => {
  describe('Version Display', () => {
    it('should display version number', () => {
      renderWithTheme(<FooterSlot version="1.0.0" copyright="© 2026 EasySale" />);

      expect(screen.getByTestId('footer-version')).toHaveTextContent('v1.0.0');
    });

    it('should format version with "v" prefix', () => {
      renderWithTheme(<FooterSlot version="2.5.3" copyright="© 2026 EasySale" />);

      expect(screen.getByTestId('footer-version')).toHaveTextContent('v2.5.3');
    });
  });

  describe('Build ID Display', () => {
    it('should display build ID when provided', () => {
      renderWithTheme(
        <FooterSlot version="1.0.0" buildId="abc123def" copyright="© 2026 EasySale" />
      );

      expect(screen.getByTestId('footer-build')).toHaveTextContent('abc123def');
    });

    it('should not display build ID when not provided', () => {
      renderWithTheme(<FooterSlot version="1.0.0" copyright="© 2026 EasySale" />);

      expect(screen.queryByTestId('footer-build')).not.toBeInTheDocument();
    });

    it('should display separator between version and build ID', () => {
      renderWithTheme(
        <FooterSlot version="1.0.0" buildId="abc123def" copyright="© 2026 EasySale" />
      );

      const versionInfo = screen.getByTestId('footer-version-info');
      expect(versionInfo.textContent).toContain('•');
    });
  });

  describe('Copyright Display', () => {
    it('should display copyright text', () => {
      renderWithTheme(<FooterSlot version="1.0.0" copyright="© 2026 EasySale" />);

      expect(screen.getByTestId('footer-copyright')).toHaveTextContent('© 2026 EasySale');
    });

    it('should display custom copyright text', () => {
      renderWithTheme(
        <FooterSlot version="1.0.0" copyright="© 2026 My Company. All rights reserved." />
      );

      expect(screen.getByTestId('footer-copyright')).toHaveTextContent(
        '© 2026 My Company. All rights reserved.'
      );
    });
  });

  describe('Combined Display', () => {
    it('should display all information when build ID is provided', () => {
      renderWithTheme(
        <FooterSlot version="1.2.3" buildId="build-456" copyright="© 2026 EasySale Inc." />
      );

      expect(screen.getByTestId('footer-version')).toHaveTextContent('v1.2.3');
      expect(screen.getByTestId('footer-build')).toHaveTextContent('build-456');
      expect(screen.getByTestId('footer-copyright')).toHaveTextContent('© 2026 EasySale Inc.');
    });

    it('should display version and copyright when build ID is not provided', () => {
      renderWithTheme(<FooterSlot version="1.2.3" copyright="© 2026 EasySale Inc." />);

      expect(screen.getByTestId('footer-version')).toHaveTextContent('v1.2.3');
      expect(screen.queryByTestId('footer-build')).not.toBeInTheDocument();
      expect(screen.getByTestId('footer-copyright')).toHaveTextContent('© 2026 EasySale Inc.');
    });
  });

  describe('Layout', () => {
    it('should render footer element', () => {
      renderWithTheme(<FooterSlot version="1.0.0" copyright="© 2026 EasySale" />);

      const footer = screen.getByTestId('footer-slot');
      expect(footer.tagName).toBe('FOOTER');
    });

    it('should have version info and copyright sections', () => {
      renderWithTheme(<FooterSlot version="1.0.0" copyright="© 2026 EasySale" />);

      expect(screen.getByTestId('footer-version-info')).toBeInTheDocument();
      expect(screen.getByTestId('footer-copyright')).toBeInTheDocument();
    });
  });
});

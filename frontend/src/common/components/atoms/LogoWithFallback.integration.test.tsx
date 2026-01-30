/**
 * LogoWithFallback Integration Tests
 * 
 * Integration tests to verify logo fallback works in real-world scenarios.
 * Validates: Requirements 6.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LogoWithFallback } from './LogoWithFallback';

describe('LogoWithFallback Integration Tests', () => {
  describe('Real-world scenarios', () => {
    it('should handle missing logo URL gracefully', () => {
      render(
        <LogoWithFallback
          logoUrl={undefined}
          companyName="EasySale"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toBeInTheDocument();
      expect(textFallback).toHaveTextContent('EA');
    });

    it('should handle null logo URL gracefully', () => {
      render(
        <LogoWithFallback
          logoUrl={null}
          companyName="EasySale"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toBeInTheDocument();
      expect(textFallback).toHaveTextContent('EA');
    });

    it('should handle empty string logo URL gracefully', () => {
      render(
        <LogoWithFallback
          logoUrl=""
          companyName="EasySale"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toBeInTheDocument();
      expect(textFallback).toHaveTextContent('EA');
    });

    it('should show text fallback when image fails to load', async () => {
      render(
        <LogoWithFallback
          logoUrl="https://invalid-domain-that-does-not-exist.com/logo.png"
          companyName="Test Company"
        />
      );

      // Initially, image should be rendered
      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toBeInTheDocument();

      // Simulate image load error
      image.dispatchEvent(new Event('error'));

      // Wait for text fallback to appear
      await waitFor(() => {
        const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
        expect(textFallback).toBeInTheDocument();
        expect(textFallback).toHaveTextContent('TE');
      });

      // Image should no longer be visible
      expect(screen.queryByTestId('logo-with-fallback-image')).not.toBeInTheDocument();
    });

    it('should use company icon when provided', () => {
      render(
        <LogoWithFallback
          companyName="EasySale"
          icon="🏪"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('🏪');
    });

    it('should use shortName when provided', () => {
      render(
        <LogoWithFallback
          companyName="EasySale Point of Sale System"
          shortName="ES"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('ES');
    });

    it('should handle single character company names', () => {
      render(
        <LogoWithFallback
          companyName="X"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('X');
    });

    it('should handle company names with special characters', () => {
      render(
        <LogoWithFallback
          companyName="@Company"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('@C');
    });

    it('should handle company names with numbers', () => {
      render(
        <LogoWithFallback
          companyName="123 Store"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('12');
    });
  });

  describe('Branding configuration scenarios', () => {
    it('should work with minimal branding config', () => {
      const branding = {
        company: {
          name: 'My Store',
          logo: undefined,
        },
      };

      render(
        <LogoWithFallback
          logoUrl={branding.company.logo}
          companyName={branding.company.name}
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('MY');
    });

    it('should work with full branding config', () => {
      const branding = {
        company: {
          name: 'EasySale',
          shortName: 'ES',
          icon: '🏪',
          logo: 'https://example.com/logo.png',
        },
      };

      render(
        <LogoWithFallback
          logoUrl={branding.company.logo}
          companyName={branding.company.name}
          shortName={branding.company.shortName}
          icon={branding.company.icon}
        />
      );

      // Should render image initially
      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', branding.company.logo);
    });

    it('should prioritize icon over shortName in fallback', () => {
      const branding = {
        company: {
          name: 'EasySale',
          shortName: 'ES',
          icon: '🏪',
        },
      };

      render(
        <LogoWithFallback
          companyName={branding.company.name}
          shortName={branding.company.shortName}
          icon={branding.company.icon}
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('🏪');
    });

    it('should use shortName when icon is not provided', () => {
      const branding = {
        company: {
          name: 'EasySale',
          shortName: 'ES',
        },
      };

      render(
        <LogoWithFallback
          companyName={branding.company.name}
          shortName={branding.company.shortName}
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('ES');
    });

    it('should use first 2 letters when neither icon nor shortName provided', () => {
      const branding = {
        company: {
          name: 'EasySale',
        },
      };

      render(
        <LogoWithFallback
          companyName={branding.company.name}
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('EA');
    });
  });
});

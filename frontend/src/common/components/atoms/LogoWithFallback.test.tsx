/**
 * LogoWithFallback Component Tests
 * 
 * Tests the logo rendering with automatic fallback to text when image fails to load.
 * Validates: Requirements 6.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LogoWithFallback } from './LogoWithFallback';

describe('LogoWithFallback', () => {
  describe('Image rendering', () => {
    it('should render image when logoUrl is provided', () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/logo.png"
          companyName="Test Company"
        />
      );

      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/logo.png');
      expect(image).toHaveAttribute('alt', 'Test Company logo');
    });

    it('should not render text fallback when image loads successfully', () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/logo.png"
          companyName="Test Company"
        />
      );

      expect(screen.queryByTestId('logo-with-fallback-text-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Text fallback rendering', () => {
    it('should render text fallback when logoUrl is not provided', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toBeInTheDocument();
      expect(textFallback).toHaveTextContent('TE'); // First 2 letters of "Test Company"
    });

    it('should render text fallback when image fails to load', async () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/invalid-logo.png"
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
    });

    it('should use icon as fallback when provided', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          icon="🏢"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('🏢');
    });

    it('should use shortName as fallback when provided', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          shortName="TC"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('TC');
    });

    it('should prioritize icon over shortName', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          shortName="TC"
          icon="🏢"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('🏢');
    });

    it('should use first 2 letters of companyName when no icon or shortName', () => {
      render(
        <LogoWithFallback
          companyName="EasySale"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('FL');
    });

    it('should uppercase the first 2 letters', () => {
      render(
        <LogoWithFallback
          companyName="EasySale"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveTextContent('FL');
    });
  });

  describe('Size variants', () => {
    it('should apply correct size classes for sm', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          size="sm"
        />
      );

      const container = screen.getByTestId('logo-with-fallback');
      expect(container).toHaveClass('w-6', 'h-6', 'text-xs');
    });

    it('should apply correct size classes for md (default)', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          size="md"
        />
      );

      const container = screen.getByTestId('logo-with-fallback');
      expect(container).toHaveClass('w-8', 'h-8', 'text-sm');
    });

    it('should apply correct size classes for lg', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          size="lg"
        />
      );

      const container = screen.getByTestId('logo-with-fallback');
      expect(container).toHaveClass('w-12', 'h-12', 'text-base');
    });

    it('should apply correct size classes for xl', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          size="xl"
        />
      );

      const container = screen.getByTestId('logo-with-fallback');
      expect(container).toHaveClass('w-16', 'h-16', 'text-lg');
    });
  });

  describe('Custom styling', () => {
    it('should apply custom className to container', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          className="custom-container-class"
        />
      );

      const container = screen.getByTestId('logo-with-fallback');
      expect(container).toHaveClass('custom-container-class');
    });

    it('should apply custom imgClassName to image', () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/logo.png"
          companyName="Test Company"
          imgClassName="custom-image-class"
        />
      );

      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toHaveClass('custom-image-class');
    });

    it('should apply custom textClassName to text fallback', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          textClassName="custom-text-class"
        />
      );

      const textFallback = screen.getByTestId('logo-with-fallback-text-fallback');
      expect(textFallback).toHaveClass('custom-text-class');
    });
  });

  describe('Custom testId', () => {
    it('should use custom testId when provided', () => {
      render(
        <LogoWithFallback
          companyName="Test Company"
          testId="custom-logo"
        />
      );

      expect(screen.getByTestId('custom-logo')).toBeInTheDocument();
      expect(screen.getByTestId('custom-logo-text-fallback')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for image', () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/logo.png"
          companyName="Test Company"
        />
      );

      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toHaveAttribute('alt', 'Test Company logo');
    });

    it('should have proper alt text with different company name', () => {
      render(
        <LogoWithFallback
          logoUrl="https://example.com/logo.png"
          companyName="EasySale"
        />
      );

      const image = screen.getByTestId('logo-with-fallback-image');
      expect(image).toHaveAttribute('alt', 'EasySale logo');
    });
  });
});

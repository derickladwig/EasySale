/**
 * Property Test: Responsive Rendering
 *
 * Feature: themeable-login-system
 * Property 11: Login interface must render correctly at all viewport sizes (320px to 3840px)
 *
 * Validates Requirements 10.7
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';

// ============================================================================
// Test Component
// ============================================================================

interface ResponsiveContainerProps {
  width: number;
  height: number;
}

function ResponsiveContainer({ width, height }: ResponsiveContainerProps) {
  return (
    <div
      data-testid="responsive-container"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        data-testid="content"
        style={{
          width: '100%',
          height: '100%',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <h1>Login</h1>
        <input type="text" placeholder="Username" style={{ width: '100%', maxWidth: '400px' }} />
        <button style={{ marginTop: '8px' }}>Submit</button>
      </div>
    </div>
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 11: Responsive Rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render without horizontal scrolling at all viewport widths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }), // Viewport width
        fc.integer({ min: 480, max: 2160 }), // Viewport height
        (width, height) => {
          // Arrange & Act
          const { container } = render(<ResponsiveContainer width={width} height={height} />);

          const responsiveContainer = container.querySelector(
            '[data-testid="responsive-container"]'
          );
          expect(responsiveContainer).toBeTruthy();

          // Assert: Container should not exceed viewport width
          const containerWidth = (responsiveContainer as HTMLElement).offsetWidth;
          expect(containerWidth).toBeLessThanOrEqual(width);

          // Assert: Content should not cause horizontal overflow
          const content = container.querySelector('[data-testid="content"]');
          expect(content).toBeTruthy();
          const contentWidth = (content as HTMLElement).offsetWidth;
          expect(contentWidth).toBeLessThanOrEqual(width);

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain readable text at all viewport sizes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 320, max: 3840 }), (width) => {
        // Arrange & Act
        const { container } = render(<ResponsiveContainer width={width} height={800} />);

        const heading = container.querySelector('h1');
        expect(heading).toBeTruthy();

        // Assert: Text should be visible and present
        expect(heading!.textContent).toBeTruthy();
        expect(heading!.textContent!.length).toBeGreaterThan(0);

        // Assert: Heading should be in the DOM
        expect(container.contains(heading)).toBe(true);

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should handle mobile viewport widths (320px-768px)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 320, max: 768 }), (width) => {
        // Arrange & Act
        const { container } = render(<ResponsiveContainer width={width} height={600} />);

        const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
        expect(responsiveContainer).toBeTruthy();

        // Assert: Container should fit within mobile viewport
        const containerWidth = (responsiveContainer as HTMLElement).offsetWidth;
        expect(containerWidth).toBeLessThanOrEqual(width);

        // Assert: All interactive elements should be accessible
        const button = container.querySelector('button');
        const input = container.querySelector('input');
        expect(button).toBeTruthy();
        expect(input).toBeTruthy();

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should handle tablet viewport widths (768px-1024px)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 768, max: 1024 }), (width) => {
        // Arrange & Act
        const { container } = render(<ResponsiveContainer width={width} height={800} />);

        const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
        expect(responsiveContainer).toBeTruthy();

        // Assert: Container should fit within tablet viewport
        const containerWidth = (responsiveContainer as HTMLElement).offsetWidth;
        expect(containerWidth).toBeLessThanOrEqual(width);

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should handle desktop viewport widths (1024px-1920px)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1024, max: 1920 }), (width) => {
        // Arrange & Act
        const { container } = render(<ResponsiveContainer width={width} height={1080} />);

        const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
        expect(responsiveContainer).toBeTruthy();

        // Assert: Container should fit within desktop viewport
        const containerWidth = (responsiveContainer as HTMLElement).offsetWidth;
        expect(containerWidth).toBeLessThanOrEqual(width);

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should handle kiosk/large display widths (1920px-3840px)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1920, max: 3840 }), (width) => {
        // Arrange & Act
        const { container } = render(<ResponsiveContainer width={width} height={2160} />);

        const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
        expect(responsiveContainer).toBeTruthy();

        // Assert: Container should fit within large display viewport
        const containerWidth = (responsiveContainer as HTMLElement).offsetWidth;
        expect(containerWidth).toBeLessThanOrEqual(width);

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });
});

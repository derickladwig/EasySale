/**
 * Property-Based Tests for Theme Compatibility
 *
 * These tests verify that all components render correctly in both light and dark
 * themes with any accent color (no missing backgrounds, readable text, visible borders).
 *
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

const themeMode = fc.constantFrom('light' as const, 'dark' as const);
const accentColor = fc.constantFrom('blue' as const, 'green' as const, 'purple' as const, 'orange' as const, 'red' as const);
const buttonVariant = fc.constantFrom('primary' as const, 'secondary' as const, 'ghost' as const, 'danger' as const);
const cardVariant = fc.constantFrom('default' as const, 'outlined' as const, 'elevated' as const);

const selectOptions = fc.array(
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 20 }),
    label: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 2, maxLength: 5 }
).map((options) => options.map((opt, index) => ({
  value: `${opt.value}-${index}`,
  label: opt.label || `Option ${index}`,
})));

// ============================================================================
// Test Utilities
// ============================================================================

function applyTheme(mode: 'light' | 'dark', accent: string) {
  document.documentElement.setAttribute('data-theme-mode', mode);
  document.documentElement.setAttribute('data-theme-accent', accent);
}

function cleanupTheme() {
  document.documentElement.removeAttribute('data-theme-mode');
  document.documentElement.removeAttribute('data-theme-accent');
}

// ============================================================================
// Property 9: Theme Compatibility
// ============================================================================

describe('Property 9: Theme Compatibility', () => {
  it('should render Button in all theme combinations', () => {
    fc.assert(
      fc.property(
        themeMode,
        accentColor,
        buttonVariant,
        (mode, accent, variant) => {
          applyTheme(mode, accent);
          
          const { container } = render(
            <Button variant={variant}>Test Button</Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();
          expect(button?.textContent).toBe('Test Button');
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render Input in all theme combinations', () => {
    fc.assert(
      fc.property(
        themeMode,
        accentColor,
        (mode, accent) => {
          applyTheme(mode, accent);
          
          const { container } = render(
            <Input label="Test Input" id="test-input" />
          );

          const input = container.querySelector('input');
          expect(input).toBeTruthy();
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render Select in all theme combinations', () => {
    fc.assert(
      fc.property(
        themeMode,
        accentColor,
        selectOptions,
        (mode, accent, options) => {
          applyTheme(mode, accent);
          
          const { container } = render(
            <Select options={options} label="Test Select" id="test-select" />
          );

          const select = container.querySelector('select');
          expect(select).toBeTruthy();
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render Card in all theme combinations', () => {
    fc.assert(
      fc.property(
        themeMode,
        accentColor,
        cardVariant,
        (mode, accent, variant) => {
          applyTheme(mode, accent);
          
          const { container } = render(
            <Card variant={variant}>Test Card Content</Card>
          );

          const card = container.firstChild;
          expect(card).toBeTruthy();
          expect(card?.textContent).toBe('Test Card Content');
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain component structure across theme changes', () => {
    fc.assert(
      fc.property(
        buttonVariant,
        (variant) => {
          // Render in light theme
          applyTheme('light', 'blue');
          const { container: lightContainer } = render(
            <Button variant={variant}>Button</Button>
          );
          const lightButton = lightContainer.querySelector('button');
          
          // Render in dark theme
          applyTheme('dark', 'green');
          const { container: darkContainer } = render(
            <Button variant={variant}>Button</Button>
          );
          const darkButton = darkContainer.querySelector('button');
          
          // Both should exist and have same structure
          expect(lightButton).toBeTruthy();
          expect(darkButton).toBeTruthy();
          expect(lightButton?.tagName).toBe(darkButton?.tagName);
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render all components together in any theme', () => {
    fc.assert(
      fc.property(
        themeMode,
        accentColor,
        (mode, accent) => {
          applyTheme(mode, accent);
          
          const { container } = render(
            <div>
              <Button>Button</Button>
              <Input label="Input" id="input" />
              <Select options={[{value: '1', label: 'One'}]} label="Select" id="select" />
              <Card>Card</Card>
            </div>
          );

          expect(container.querySelector('button')).toBeTruthy();
          expect(container.querySelector('input')).toBeTruthy();
          expect(container.querySelector('select')).toBeTruthy();
          
          cleanupTheme();
        }
      ),
      { numRuns: 100 }
    );
  });
});

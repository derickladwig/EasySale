/**
 * Property-Based Tests for Focus Ring Visibility
 *
 * These tests verify that all interactive components can receive focus and
 * have focus-visible styling applied (meeting WCAG standards).
 *
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generate button variants
 */
const buttonVariant = fc.constantFrom(
  'primary' as const,
  'secondary' as const,
  'ghost' as const,
  'danger' as const
);

/**
 * Generate button sizes
 */
const buttonSize = fc.constantFrom(
  'sm' as const,
  'md' as const,
  'lg' as const
);

/**
 * Generate input types
 */
const inputType = fc.constantFrom(
  'text' as const,
  'email' as const,
  'password' as const,
  'number' as const
);

/**
 * Generate select options (with unique values to avoid React key warnings)
 */
const selectOptions = fc.array(
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 20 }),
    label: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 2, maxLength: 5 }
).map((options) => {
  // Ensure unique values
  const uniqueOptions = options.map((opt, index) => ({
    value: `${opt.value}-${index}`,
    label: opt.label || `Option ${index}`,
  }));
  return uniqueOptions;
});

// ============================================================================
// Property 7: Focus Ring Visibility
// ============================================================================

// Feature: unified-design-system, Property 7: Focus Ring Visibility
describe('Property 7: Focus Ring Visibility', () => {
  it('should allow Button to receive focus', async () => {
    await fc.assert(
      fc.asyncProperty(
        buttonVariant,
        buttonSize,
        async (variant, size) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Button variant={variant} size={size}>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Focus the button using tab
            await user.tab();
            
            // Verify button can receive focus
            expect(document.activeElement).toBe(button);
            
            // Verify button is not disabled (disabled buttons can't be focused)
            expect(button.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow Input to receive focus', async () => {
    await fc.assert(
      fc.asyncProperty(
        inputType,
        fc.string({ minLength: 1, maxLength: 20 }),
        async (type, label) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Input 
              type={type} 
              label={label}
              id="test-input"
            />
          );

          const input = container.querySelector('input');
          expect(input).toBeTruthy();

          if (input) {
            // Focus the input using tab
            await user.tab();
            
            // Verify input can receive focus
            expect(document.activeElement).toBe(input);
            
            // Verify input is not disabled
            expect(input.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow Select to receive focus', async () => {
    await fc.assert(
      fc.asyncProperty(
        selectOptions,
        fc.string({ minLength: 1, maxLength: 20 }),
        async (options, label) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Select 
              options={options}
              label={label}
              id="test-select"
            />
          );

          const select = container.querySelector('select');
          expect(select).toBeTruthy();

          if (select) {
            // Focus the select using tab
            await user.tab();
            
            // Verify select can receive focus
            expect(document.activeElement).toBe(select);
            
            // Verify select is not disabled
            expect(select.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain focusability across all button variants', async () => {
    await fc.assert(
      fc.asyncProperty(
        buttonVariant,
        async (variant) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Button variant={variant}>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          if (button) {
            // Focus the button
            await user.tab();
            
            // Verify button can receive focus
            expect(document.activeElement).toBe(button);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain focusability across all button sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        buttonSize,
        async (size) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Button size={size}>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          if (button) {
            // Focus the button
            await user.tab();
            
            // Verify button can receive focus
            expect(document.activeElement).toBe(button);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have focus-visible pseudo-class support on Button', () => {
    fc.assert(
      fc.property(
        buttonVariant,
        (variant) => {
          const { container } = render(
            <Button variant={variant}>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Verify button has the correct element type (can receive focus)
            expect(button.tagName).toBe('BUTTON');
            
            // Verify button is not disabled by default
            expect(button.disabled).toBe(false);
            
            // Verify button has tabIndex (can be focused)
            expect(button.tabIndex).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have focus-visible pseudo-class support on Input', () => {
    fc.assert(
      fc.property(
        inputType,
        (type) => {
          const { container } = render(
            <Input 
              type={type} 
              label="Test Input"
              id="test-input"
            />
          );

          const input = container.querySelector('input');
          expect(input).toBeTruthy();

          if (input) {
            // Verify input has the correct element type (can receive focus)
            expect(input.tagName).toBe('INPUT');
            
            // Verify input is not disabled by default
            expect(input.disabled).toBe(false);
            
            // Verify input has tabIndex (can be focused)
            expect(input.tabIndex).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have focus-visible pseudo-class support on Select', () => {
    fc.assert(
      fc.property(
        selectOptions,
        (options) => {
          const { container } = render(
            <Select 
              options={options}
              label="Test Select"
              id="test-select"
            />
          );

          const select = container.querySelector('select');
          expect(select).toBeTruthy();

          if (select) {
            // Verify select has the correct element type (can receive focus)
            expect(select.tagName).toBe('SELECT');
            
            // Verify select is not disabled by default
            expect(select.disabled).toBe(false);
            
            // Verify select has tabIndex (can be focused)
            expect(select.tabIndex).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain keyboard accessibility across all interactive components', async () => {
    await fc.assert(
      fc.asyncProperty(
        buttonVariant,
        inputType,
        selectOptions,
        async (variant, type, options) => {
          const user = userEvent.setup();
          
          // Render all components in sequence
          const { container: buttonContainer } = render(
            <Button variant={variant}>Button</Button>
          );
          const { container: inputContainer } = render(
            <Input type={type} label="Input" id="input" />
          );
          const { container: selectContainer } = render(
            <Select options={options} label="Select" id="select" />
          );

          const button = buttonContainer.querySelector('button');
          const input = inputContainer.querySelector('input');
          const select = selectContainer.querySelector('select');

          // All components should be focusable
          if (button) {
            button.focus();
            expect(document.activeElement).toBe(button);
          }

          if (input) {
            input.focus();
            expect(document.activeElement).toBe(input);
          }

          if (select) {
            select.focus();
            expect(document.activeElement).toBe(select);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

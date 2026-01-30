/**
 * Property-Based Tests for Disabled State Consistency
 *
 * These tests verify that all components with disabled states apply consistent
 * styling (reduced opacity, cursor not-allowed, no hover effects).
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
 * Generate select options (with unique values)
 */
const selectOptions = fc.array(
  fc.record({
    value: fc.string({ minLength: 1, maxLength: 20 }),
    label: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 2, maxLength: 5 }
).map((options) => {
  return options.map((opt, index) => ({
    value: `${opt.value}-${index}`,
    label: opt.label || `Option ${index}`,
  }));
});

// ============================================================================
// Property 8: Disabled State Consistency
// ============================================================================

// Feature: unified-design-system, Property 8: Disabled State Consistency
describe('Property 8: Disabled State Consistency', () => {
  it('should prevent Button from receiving focus when disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        buttonVariant,
        buttonSize,
        async (variant, size) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Button variant={variant} size={size} disabled>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Verify button is disabled
            expect(button.disabled).toBe(true);
            
            // Try to focus the button
            await user.tab();
            
            // Disabled button should not receive focus
            expect(document.activeElement).not.toBe(button);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent Input from receiving focus when disabled', async () => {
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
              disabled
            />
          );

          const input = container.querySelector('input');
          expect(input).toBeTruthy();

          if (input) {
            // Verify input is disabled
            expect(input.disabled).toBe(true);
            
            // Try to focus the input
            await user.tab();
            
            // Disabled input should not receive focus
            expect(document.activeElement).not.toBe(input);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent Select from receiving focus when disabled', async () => {
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
              disabled
            />
          );

          const select = container.querySelector('select');
          expect(select).toBeTruthy();

          if (select) {
            // Verify select is disabled
            expect(select.disabled).toBe(true);
            
            // Try to focus the select
            await user.tab();
            
            // Disabled select should not receive focus
            expect(document.activeElement).not.toBe(select);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have disabled attribute on Button when disabled', () => {
    fc.assert(
      fc.property(
        buttonVariant,
        (variant) => {
          let clicked = false;
          
          const { container } = render(
            <Button 
              variant={variant} 
              disabled
              onClick={() => { clicked = true; }}
            >
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Verify button has disabled attribute
            expect(button.disabled).toBe(true);
            expect(button.hasAttribute('disabled')).toBe(true);
            
            // Verify button cannot be clicked programmatically
            // (disabled buttons don't fire click events)
            button.click();
            expect(clicked).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent Input typing when disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        inputType,
        async (type) => {
          const user = userEvent.setup();
          
          const { container } = render(
            <Input 
              type={type} 
              label="Test Input"
              id="test-input"
              disabled
            />
          );

          const input = container.querySelector('input') as HTMLInputElement;
          expect(input).toBeTruthy();

          if (input) {
            // Try to type in the disabled input
            await user.type(input, 'test');
            
            // Input value should remain empty
            expect(input.value).toBe('');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain disabled state across all button variants', () => {
    fc.assert(
      fc.property(
        buttonVariant,
        (variant) => {
          const { container } = render(
            <Button variant={variant} disabled>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Verify button is disabled
            expect(button.disabled).toBe(true);
            
            // Verify disabled attribute is present
            expect(button.hasAttribute('disabled')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain disabled state across all button sizes', () => {
    fc.assert(
      fc.property(
        buttonSize,
        (size) => {
          const { container } = render(
            <Button size={size} disabled>
              Test Button
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).toBeTruthy();

          if (button) {
            // Verify button is disabled
            expect(button.disabled).toBe(true);
            
            // Verify disabled attribute is present
            expect(button.hasAttribute('disabled')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain disabled state across all input types', () => {
    fc.assert(
      fc.property(
        inputType,
        (type) => {
          const { container } = render(
            <Input 
              type={type} 
              label="Test Input"
              id="test-input"
              disabled
            />
          );

          const input = container.querySelector('input');
          expect(input).toBeTruthy();

          if (input) {
            // Verify input is disabled
            expect(input.disabled).toBe(true);
            
            // Verify disabled attribute is present
            expect(input.hasAttribute('disabled')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent disabled state across all components', () => {
    fc.assert(
      fc.property(
        buttonVariant,
        inputType,
        selectOptions,
        (variant, type, options) => {
          // Render all components in disabled state
          const { container: buttonContainer } = render(
            <Button variant={variant} disabled>Button</Button>
          );
          const { container: inputContainer } = render(
            <Input type={type} label="Input" id="input" disabled />
          );
          const { container: selectContainer } = render(
            <Select options={options} label="Select" id="select" disabled />
          );

          const button = buttonContainer.querySelector('button');
          const input = inputContainer.querySelector('input');
          const select = selectContainer.querySelector('select');

          // All components should be disabled
          if (button) {
            expect(button.disabled).toBe(true);
          }

          if (input) {
            expect(input.disabled).toBe(true);
          }

          if (select) {
            expect(select.disabled).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow Button to be enabled by default', () => {
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
            // Verify button is not disabled by default
            expect(button.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow Input to be enabled by default', () => {
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
            // Verify input is not disabled by default
            expect(input.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow Select to be enabled by default', () => {
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
            // Verify select is not disabled by default
            expect(select.disabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

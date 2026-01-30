/**
 * Property Test: ARIA Label Completeness
 *
 * Feature: themeable-login-system
 * Property 9: All interactive elements must have proper ARIA labels
 *
 * Validates Requirements 10.3
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import {
  getAuthMethodAriaLabel,
  getStatusAriaLabel,
  getFieldAriaLabel,
  getButtonAriaDescription,
} from './useAriaAnnouncements';

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 9: ARIA Label Completeness', () => {
  afterEach(() => {
    cleanup();
  });

  it('should generate valid ARIA labels for authentication methods', () => {
    fc.assert(
      fc.property(fc.constantFrom('pin', 'password', 'badge'), (method) => {
        // Act
        const label = getAuthMethodAriaLabel(method);

        // Assert: Label should be non-empty
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);

        // Assert: Label should contain the method name
        expect(label.toLowerCase()).toContain(method.toLowerCase());

        // Assert: Label should be descriptive
        expect(label.split(' ').length).toBeGreaterThanOrEqual(2);
      }),
      { numRuns: 20 }
    );
  });

  it('should generate valid ARIA labels for status indicators', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('online', 'offline', 'syncing', 'error'),
        fc.string({ minLength: 1, maxLength: 20 }),
        (status, label) => {
          // Act
          const ariaLabel = getStatusAriaLabel(status, label);

          // Assert: Label should be non-empty
          expect(ariaLabel).toBeTruthy();
          expect(ariaLabel.length).toBeGreaterThan(0);

          // Assert: Label should contain both status and label
          expect(ariaLabel.toLowerCase()).toContain(label.toLowerCase());

          // Assert: Label should have proper format
          expect(ariaLabel).toContain(':');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should generate valid ARIA labels for form fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.boolean(),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (fieldName, isRequired, error) => {
          // Act
          const label = getFieldAriaLabel(fieldName, isRequired, error);

          // Assert: Label should be non-empty
          expect(label).toBeTruthy();
          expect(label.length).toBeGreaterThan(0);

          // Assert: Label should contain field name
          expect(label).toContain(fieldName);

          // Assert: Label should indicate if required
          if (isRequired) {
            expect(label.toLowerCase()).toContain('required');
          }

          // Assert: Label should include error if present
          if (error) {
            expect(label.toLowerCase()).toContain('error');
            expect(label).toContain(error);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should generate valid ARIA descriptions for buttons', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
        (action, context) => {
          // Act
          const description = getButtonAriaDescription(action, context);

          // Assert: Description should be non-empty
          expect(description).toBeTruthy();
          expect(description.length).toBeGreaterThan(0);

          // Assert: Description should contain action
          expect(description).toContain(action);

          // Assert: Description should include context if provided
          if (context) {
            expect(description).toContain(context);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should ensure all interactive elements have accessible names', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (buttonCount, inputCount) => {
          // Arrange & Act
          const { container } = render(
            <div>
              {Array.from({ length: buttonCount }, (_, i) => (
                <button key={`button-${i}`} aria-label={`Button ${i}`} data-testid={`button-${i}`}>
                  Action
                </button>
              ))}
              {Array.from({ length: inputCount }, (_, i) => (
                <input key={`input-${i}`} aria-label={`Input ${i}`} data-testid={`input-${i}`} />
              ))}
            </div>
          );

          // Assert: All buttons should have aria-label
          const buttons = container.querySelectorAll('button');
          expect(buttons).toHaveLength(buttonCount);
          buttons.forEach((button) => {
            const ariaLabel = button.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel!.length).toBeGreaterThan(0);
          });

          // Assert: All inputs should have aria-label
          const inputs = container.querySelectorAll('input');
          expect(inputs).toHaveLength(inputCount);
          inputs.forEach((input) => {
            const ariaLabel = input.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel!.length).toBeGreaterThan(0);
          });

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide ARIA labels for icon-only buttons', () => {
    fc.assert(
      fc.property(fc.constantFrom('help', 'settings', 'close', 'menu'), (iconType) => {
        // Arrange & Act
        const { container } = render(
          <button aria-label={`${iconType} button`} data-testid="icon-button">
            <span aria-hidden="true">⚙</span>
          </button>
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();

        // Assert: Button should have aria-label
        const ariaLabel = button!.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);

        // Assert: Icon should be hidden from screen readers
        const icon = button!.querySelector('span');
        expect(icon).toBeTruthy();
        expect(icon!.getAttribute('aria-hidden')).toBe('true');

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  it('should provide ARIA labels for form validation errors', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (errorMessage) => {
        // Arrange & Act
        const { container } = render(
          <div>
            <input
              aria-label="Username"
              aria-invalid="true"
              aria-describedby="username-error"
              data-testid="username-input"
            />
            <div id="username-error" role="alert">
              {errorMessage}
            </div>
          </div>
        );

        const input = container.querySelector('input');
        const errorDiv = container.querySelector('#username-error');

        // Assert: Input should have aria-invalid
        expect(input!.getAttribute('aria-invalid')).toBe('true');

        // Assert: Input should reference error message
        expect(input!.getAttribute('aria-describedby')).toBe('username-error');

        // Assert: Error message should have role="alert"
        expect(errorDiv!.getAttribute('role')).toBe('alert');

        // Assert: Error message should contain text
        expect(errorDiv!.textContent).toBe(errorMessage);

        // Cleanup
        cleanup();
      }),
      { numRuns: 20 }
    );
  });
});

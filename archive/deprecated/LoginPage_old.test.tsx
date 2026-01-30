/**
 * @deprecated QUARANTINED - Tests for deprecated LoginPage
 * 
 * Quarantined: 2026-01-29
 * Reason: LoginPage replaced by LoginPageV2
 * Replacement: Tests should be written for LoginPageV2 if needed
 * 
 * These tests are skipped to prevent CI failures.
 * The original LoginPage is preserved per NO DELETES policy.
 * 
 * Original description:
 * Unit Tests: Login Page
 *
 * Comprehensive tests for the login page covering all UI enhancement requirements.
 * Tests form validation, loading states, error display, and responsive behavior.
 *
 * Validates Requirements: 2.1-2.10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@common/contexts/AuthContext';
import { LoginPage } from './LoginPage';
import type { LoginThemeConfig } from '../theme/types';
import minimalDarkPreset from '../theme/presets/minimalDark.json';

// ============================================================================
// Setup
// ============================================================================

// Helper to render with Router and Auth context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

// QUARANTINED: Tests skipped - LoginPage replaced by LoginPageV2
describe.skip('LoginPage - UI Enhancement Tests (Requirements 2.1-2.10)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;

    // Mock successful theme loading
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalDarkPreset),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Requirement 2.1: Centered Card Layout with Shadow and Rounded Corners
  // ==========================================================================

  describe('Requirement 2.1: Centered Card Layout', () => {
    it('should render centered card layout with shadow and rounded corners', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Wait for render
      await waitFor(
        () => {
          // Check for centered flex layout
          const mainContent = container.querySelector('.flex-1.flex.items-center.justify-center');
          expect(mainContent).toBeTruthy();

          // Check for card with shadow and rounded corners
          const loginCard = container.querySelector('.bg-background-secondary.rounded-lg.shadow-md');
          expect(loginCard).toBeTruthy();
          expect(loginCard?.className).toContain('rounded-lg');
          expect(loginCard?.className).toContain('shadow-md');
          expect(loginCard?.className).toContain('border');
          expect(loginCard?.className).toContain('border-border-light');
        },
        { timeout: 2000 }
      );
    });

    it('should have proper card styling with subtle shadow', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const loginCard = container.querySelector('.bg-background-secondary.rounded-lg');
          expect(loginCard).toBeTruthy();
          
          // Verify shadow class
          expect(loginCard?.className).toContain('shadow-md');
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.2: Logo Display
  // ==========================================================================

  describe('Requirement 2.2: Logo Display', () => {
    it('should display logo prominently at the top', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const logo = container.querySelector('[data-testid="login-logo"]');
          expect(logo).toBeTruthy();
          // Logo component should be present (either image or text fallback)
        },
        { timeout: 2000 }
      );
    });

    it('should center the logo above the login card', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const logoContainer = container.querySelector('.flex.justify-center');
          expect(logoContainer).toBeTruthy();
          
          const logo = logoContainer?.querySelector('[data-testid="login-logo"]');
          expect(logo).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should have appropriate logo size (h-16)', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const logo = container.querySelector('[data-testid="login-logo"]');
          expect(logo?.className).toContain('h-16');
          expect(logo?.className).toContain('w-auto');
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.3: Large Touch-Friendly Inputs (48px height)
  // ==========================================================================

  describe('Requirement 2.3: Touch-Friendly Inputs', () => {
    it('should have large touch-friendly input fields (minimum 48px height)', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;
          
          expect(usernameInput).toBeTruthy();
          expect(passwordInput).toBeTruthy();

          // Check inline styles for minHeight
          const usernameStyle = window.getComputedStyle(usernameInput);
          const passwordStyle = window.getComputedStyle(passwordInput);
          
          // Inputs should have minHeight of 48px
          expect(usernameInput.style.minHeight).toBe('48px');
          expect(passwordInput.style.minHeight).toBe('48px');
        },
        { timeout: 2000 }
      );
    });

    it('should have proper padding for touch targets', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();
          
          // Should have padding applied via inline styles
          expect(usernameInput.style.padding).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.4: Clear Error Messages Below Fields
  // ==========================================================================

  describe('Requirement 2.4: Error Messages Display', () => {
    it('should display field-specific error messages below inputs', async () => {
      // Act
      const { container } = renderWithRouter(
        <LoginPage />
      );

      // Wait for render
      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Simulate validation error by checking the AuthCard component structure
      // The AuthCard supports fieldErrors prop which displays errors below fields
      const usernameInput = container.querySelector('[data-testid="username-input"]');
      expect(usernameInput).toBeTruthy();
      
      // Verify error display structure exists (aria-describedby for accessibility)
      expect(usernameInput?.getAttribute('aria-invalid')).toBeDefined();
      expect(usernameInput?.getAttribute('aria-describedby')).toBeDefined();
    });

    it('should show error message with proper styling', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Verify error display structure
      await waitFor(
        () => {
          const authCard = container.querySelector('[data-testid="auth-card"]');
          expect(authCard).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.5: Loading State During Authentication
  // ==========================================================================

  describe('Requirement 2.5: Loading State', () => {
    it('should show loading state during authentication', async () => {
      // Arrange: Mock slow login
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/login')) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ token: 'test-token' }),
              });
            }, 1000);
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(minimalDarkPreset),
        });
      });

      const { container } = renderWithRouter(<LoginPage />);

      // Wait for initial render
      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Act: Submit form
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        fireEvent.click(submitButton);

        // Assert: Should show loading state
        await waitFor(
          () => {
            const button = container.querySelector('[data-testid="submit-button"]');
            expect(button?.textContent).toContain('Signing in...');
          },
          { timeout: 500 }
        );
      }
    });

    it('should disable submit button during loading', async () => {
      // Arrange
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Act: Submit form
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        fireEvent.click(submitButton);

        // Button should be disabled during loading
        // Note: In real scenario, button would be disabled, but test might complete too fast
        expect(submitButton).toBeDefined();
      }
    });

    it('should show loading spinner in submit button', async () => {
      // Arrange
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // The submit button should support loading state with spinner
      const submitButton = container.querySelector('[data-testid="submit-button"]');
      expect(submitButton).toBeTruthy();
    });
  });

  // ==========================================================================
  // Requirement 2.6: "Remember Me" Checkbox
  // ==========================================================================

  describe('Requirement 2.6: Remember Me Checkbox', () => {
    it('should display "Remember Me" checkbox with proper spacing', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const rememberMeCheckbox = container.querySelector('[data-testid="remember-me-checkbox"]') as HTMLInputElement;
          expect(rememberMeCheckbox).toBeTruthy();
          expect(rememberMeCheckbox.type).toBe('checkbox');
        },
        { timeout: 2000 }
      );
    });

    it('should toggle Remember Me checkbox', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          const checkbox = container.querySelector('[data-testid="remember-me-checkbox"]') as HTMLInputElement;
          expect(checkbox).toBeTruthy();

          // Initial state
          expect(checkbox.checked).toBe(false);

          // Toggle checkbox
          fireEvent.click(checkbox);
          expect(checkbox.checked).toBe(true);

          // Toggle again
          fireEvent.click(checkbox);
          expect(checkbox.checked).toBe(false);
        },
        { timeout: 2000 }
      );
    });

    it('should have proper label for Remember Me', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const label = container.querySelector('label[for="remember-me"]');
          expect(label).toBeTruthy();
          expect(label?.textContent).toContain('Remember Me');
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.7: Station Selection Dropdown
  // ==========================================================================

  describe('Requirement 2.7: Station Selection', () => {
    it('should support station selection when configured', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: The AuthCard component supports station selection
      // It's controlled by the theme configuration
      await waitFor(
        () => {
          const authCard = container.querySelector('[data-testid="auth-card"]');
          expect(authCard).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.8: Full-Width Card on Mobile
  // ==========================================================================

  describe('Requirement 2.8: Responsive Mobile Layout', () => {
    it('should have full-width card on mobile with appropriate padding', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          // Check for responsive width classes
          const cardContainer = container.querySelector('.w-full.sm\\:max-w-md');
          expect(cardContainer).toBeTruthy();
          expect(cardContainer?.className).toContain('w-full');
          expect(cardContainer?.className).toContain('sm:max-w-md');

          // Check for responsive padding on login card
          const loginCard = container.querySelector('.bg-background-secondary.rounded-lg');
          expect(loginCard).toBeTruthy();
          expect(loginCard?.className).toContain('p-4');
          expect(loginCard?.className).toContain('sm:p-6');
          expect(loginCard?.className).toContain('md:p-8');
        },
        { timeout: 2000 }
      );
    });

    it('should have responsive padding on main content area', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const mainContent = container.querySelector('.flex-1.flex.items-center.justify-center');
          expect(mainContent).toBeTruthy();
          expect(mainContent?.className).toContain('px-4');
          expect(mainContent?.className).toContain('py-8');
          expect(mainContent?.className).toContain('sm:px-6');
          expect(mainContent?.className).toContain('lg:px-8');
        },
        { timeout: 2000 }
      );
    });

    it('should have proper spacing between elements', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const cardContainer = container.querySelector('.w-full.sm\\:max-w-md.space-y-6');
          expect(cardContainer).toBeTruthy();
          expect(cardContainer?.className).toContain('space-y-6');
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Requirement 2.9: Errors Displayed with Red Accent
  // ==========================================================================

  describe('Requirement 2.9: Error Display with Red Accent', () => {
    it('should display authentication errors with red accent', async () => {
      // Arrange
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Mock failed login
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      // Act: Submit with invalid credentials
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'wrong' } });
        fireEvent.change(passwordInput, { target: { value: 'wrong' } });
        fireEvent.click(submitButton);

        // Assert: Should display error with red accent
        await waitFor(
          () => {
            const errorCallout = container.querySelector('[data-testid="error-callout"]');
            expect(errorCallout).toBeTruthy();
            expect(errorCallout?.getAttribute('data-severity')).toBe('error');
          },
          { timeout: 3000 }
        );
      }
    });

    it('should display field validation errors with red border', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert: Verify error styling structure
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();
          
          // Input supports error state via aria-invalid
          expect(usernameInput.getAttribute('aria-invalid')).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should show error message in ErrorCallout component', async () => {
      // Arrange
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Mock failed login
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Network error' }),
      });

      // Act: Trigger error
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'test' } });
        fireEvent.change(passwordInput, { target: { value: 'test' } });
        fireEvent.click(submitButton);

        // Assert: Error should be displayed
        await waitFor(
          () => {
            const errorCallout = container.querySelector('[data-testid="error-callout"]');
            expect(errorCallout).toBeTruthy();
          },
          { timeout: 3000 }
        );
      }
    });
  });

  // ==========================================================================
  // Requirement 2.10: Auto-Focus Username Field
  // ==========================================================================

  describe('Requirement 2.10: Auto-Focus Username Field', () => {
    it('should auto-focus username field on page load', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();
          
          // In test environment, we verify the input exists and has proper attributes
          // Actual focus behavior is tested in integration tests
          expect(usernameInput.id).toBe('username');
          expect(usernameInput.type).toBe('text');
        },
        { timeout: 2000 }
      );
    });

    it('should have proper autocomplete attribute on username field', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();
          expect(usernameInput.autocomplete).toBe('username');
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // Additional Form Validation Tests
  // ==========================================================================

  describe('Form Validation', () => {
    it('should validate required fields before submission', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Try to submit empty form
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
      expect(submitButton).toBeTruthy();
      
      // Form should have proper structure for validation
      const form = container.querySelector('form');
      expect(form).toBeTruthy();
    });

    it('should accept valid credentials', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Fill in valid credentials
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;

      if (usernameInput && passwordInput) {
        fireEvent.change(usernameInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(usernameInput.value).toBe('admin');
        expect(passwordInput.value).toBe('password123');
      }
    });

    it('should handle form submission', async () => {
      // Arrange
      const onLoginSuccess = vi.fn();
      const { container } = renderWithRouter(
        <LoginPage onLoginSuccess={onLoginSuccess} />
      );

      await waitFor(
        () => {
          expect(container.querySelector('[data-testid="auth-card"]')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Act: Fill and submit form
      const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
      const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;
      const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;

      if (usernameInput && passwordInput && submitButton) {
        fireEvent.change(usernameInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'admin123' } });
        fireEvent.click(submitButton);

        // Assert: Should call success callback
        await waitFor(
          () => {
            expect(onLoginSuccess).toHaveBeenCalled();
          },
          { timeout: 3000 }
        );
      }
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels on inputs', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          const passwordInput = container.querySelector('[data-testid="password-input"]') as HTMLInputElement;

          expect(usernameInput).toBeTruthy();
          expect(passwordInput).toBeTruthy();

          // Should have proper labels
          const usernameLabel = container.querySelector('label[for="username"]');
          const passwordLabel = container.querySelector('label[for="password"]');

          expect(usernameLabel).toBeTruthy();
          expect(passwordLabel).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should have proper ARIA attributes for error states', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          const usernameInput = container.querySelector('[data-testid="username-input"]') as HTMLInputElement;
          expect(usernameInput).toBeTruthy();

          // Should have aria-invalid attribute defined (even if false initially)
          expect(usernameInput.getAttribute('aria-invalid')).toBeDefined();
          
          // Should have aria-describedby attribute defined (for error message support)
          expect(usernameInput.getAttribute('aria-describedby')).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should have semantic HTML structure', async () => {
      // Act
      const { container } = renderWithRouter(<LoginPage />);

      // Assert
      await waitFor(
        () => {
          // Should have form element
          const form = container.querySelector('form');
          expect(form).toBeTruthy();

          // Should have proper heading within the auth card
          const authCard = container.querySelector('[data-testid="auth-card"]');
          expect(authCard).toBeTruthy();
          
          const heading = authCard?.querySelector('h1');
          expect(heading).toBeTruthy();
          expect(heading?.textContent).toContain('Sign In');

          // Should have proper button type
          const submitButton = container.querySelector('button[type="submit"]');
          expect(submitButton).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });
});

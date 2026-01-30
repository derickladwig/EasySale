/**
 * Focus Indicator Component
 *
 * Provides visible focus indicators for keyboard navigation.
 * Ensures focus states are clearly visible for accessibility.
 *
 * Validates Requirements 10.1, 10.2
 */

// Default focus indicator tokens (used when outside LoginThemeProvider)
// Uses CSS variables so the focus color follows the theme's primary color
const defaultTokens = {
  colors: {
    border: {
      focus: 'var(--color-primary-500, #14b8a6)', // Uses theme primary, falls back to teal
    },
  },
  radius: {
    button: '0.375rem',
  },
};

// ============================================================================
// Focus Indicator Styles
// ============================================================================

export function FocusIndicatorStyles() {
  // Use default tokens - this component should work anywhere in the app
  const tokens = defaultTokens;

  return (
    <style>{`
      /* Global focus indicator styles */
      *:focus-visible {
        outline: 2px solid ${tokens.colors.border.focus};
        outline-offset: 2px;
        border-radius: ${tokens.radius.button};
      }

      /* Button focus styles */
      button:focus-visible {
        outline: 2px solid ${tokens.colors.border.focus};
        outline-offset: 2px;
      }

      /* Input focus styles */
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid ${tokens.colors.border.focus};
        outline-offset: 0;
        border-color: ${tokens.colors.border.focus};
        box-shadow: 0 0 0 3px ${tokens.colors.border.focus}33;
      }

      /* Link focus styles */
      a:focus-visible {
        outline: 2px solid ${tokens.colors.border.focus};
        outline-offset: 2px;
        border-radius: ${tokens.radius.button};
      }

      /* Remove default focus outline for mouse users */
      *:focus:not(:focus-visible) {
        outline: none;
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        *:focus-visible {
          outline-width: 3px;
          outline-offset: 3px;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *:focus-visible {
          transition: none;
        }
      }
    `}</style>
  );
}

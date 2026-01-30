/**
 * Keyboard Navigation Hook
 *
 * Provides keyboard navigation support for the login interface.
 * Ensures all interactive elements are keyboard accessible with visible focus indicators.
 *
 * Validates Requirements 10.1, 10.2
 */

import { useEffect, useCallback, RefObject } from 'react';

// ============================================================================
// Types
// ============================================================================

interface KeyboardNavigationOptions {
  /**
   * Container element to scope keyboard navigation
   */
  containerRef: RefObject<HTMLElement>;

  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean;

  /**
   * Callback when focus moves to a new element
   */
  onFocusChange?: (element: HTMLElement) => void;

  /**
   * Whether to trap focus within the container
   */
  trapFocus?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useKeyboardNavigation({
  containerRef,
  enabled = true,
  onFocusChange,
  trapFocus = false,
}: KeyboardNavigationOptions) {
  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) {
      return [];
    }

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));

    // Filter out hidden elements
    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  }, [containerRef]);

  /**
   * Handle Tab key navigation
   */
  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !trapFocus) {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift + Tab: Move to previous element
      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: Move to next element
      else {
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, trapFocus, getFocusableElements]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      switch (event.key) {
        case 'Tab':
          handleTabKey(event);
          break;
        case 'Escape':
          // Allow escape key to blur current element
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          break;
      }
    },
    [enabled, handleTabKey]
  );

  /**
   * Handle focus changes
   */
  const handleFocusIn = useCallback(
    (event: FocusEvent) => {
      if (!enabled || !onFocusChange) {
        return;
      }

      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target)) {
        onFocusChange(target);
      }
    },
    [enabled, onFocusChange, containerRef]
  );

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    container.addEventListener('keydown', handleKeyDown as EventListener);
    container.addEventListener('focusin', handleFocusIn as EventListener);

    return () => {
      container.removeEventListener('keydown', handleKeyDown as EventListener);
      container.removeEventListener('focusin', handleFocusIn as EventListener);
    };
  }, [enabled, containerRef, handleKeyDown, handleFocusIn]);

  /**
   * Focus the first focusable element
   */
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  /**
   * Focus the last focusable element
   */
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { KeyboardNavigationOptions };

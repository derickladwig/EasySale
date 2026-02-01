import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/classNames';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Modal title */
  title?: string;

  /** Modal content */
  children: React.ReactNode;

  /** Modal footer content */
  footer?: React.ReactNode;

  /** Modal size */
  size?: ModalSize;

  /** Whether to show close button */
  showCloseButton?: boolean;

  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;

  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;

  /** Additional CSS classes for modal content */
  className?: string;

  /** Additional CSS classes for modal backdrop */
  backdropClassName?: string;
}

// Size styles for modal content
const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * Modal Component
 *
 * A modal dialog component with semi-transparent backdrop, centered positioning,
 * and smooth slide-in animation. Supports multiple sizes and accessibility features.
 *
 * Requirements:
 * - 10.1: Semi-transparent backdrop (rgba(0,0,0,0.5))
 * - 10.2: Centered positioning (vertically and horizontally)
 * - 10.3: Smooth slide-in animation (300ms)
 * - 10.4: Focus trap (trap focus within modal)
 * - 10.5: Backdrop click to close
 * - 10.6: Escape key to close
 * - 10.7: Multiple sizes (sm, md, lg, xl, full)
 * - 10.8: Full-screen on mobile
 * - 10.9: Smooth fade in/out animations
 * - 10.10: Mobile optimization
 *
 * @example
 * // Basic modal
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 *
 * @example
 * // Modal with footer
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Item"
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
 *       <Button variant="primary" onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 *
 * @example
 * // Large modal
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Details"
 *   size="lg"
 * >
 *   <div>Large content area</div>
 * </Modal>
 *
 * @example
 * // Full-screen modal on mobile (Requirement 10.8)
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Mobile View"
 *   size="full"
 * >
 *   <div>Full-screen on mobile</div>
 * </Modal>
 */
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      size = 'md',
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      className,
      backdropClassName,
    },
    ref
  ) => {
    // Refs for focus management (Requirement 10.4)
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    // State for managing exit animations (Requirement 10.9)
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    // Merge forwarded ref with internal ref
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(modalRef.current);
        } else {
          ref.current = modalRef.current;
        }
      }
    }, [ref]);

    // Handle opening and closing with animations (Requirement 10.9)
    useEffect(() => {
      if (isOpen) {
        // Opening: render immediately and reset closing state
        setShouldRender(true);
        setIsClosing(false);
      } else if (shouldRender) {
        // Closing: trigger exit animation
        setIsClosing(true);
        
        // Wait for animation to complete before unmounting (300ms)
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
        }, 300); // Match animation duration

        return () => clearTimeout(timer);
      }
    }, [isOpen, shouldRender]);

    // Handle Escape key press (Requirement 10.6)
    useEffect(() => {
      if (!shouldRender || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [shouldRender, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (shouldRender) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [shouldRender]);

    // Focus trap implementation (Requirement 10.4)
    useEffect(() => {
      if (!shouldRender || isClosing) return;

      // Store the element that had focus before modal opened
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Get all focusable elements within the modal
      const getFocusableElements = (): HTMLElement[] => {
        if (!modalRef.current) return [];

        const focusableSelectors = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ');

        return Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        );
      };

      // Focus the first focusable element (preferably in the body, not the close button)
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Use setTimeout to ensure the modal is fully rendered before focusing
        setTimeout(() => {
          // Try to find the first focusable element that's not the close button
          const closeButton = modalRef.current?.querySelector('[aria-label="Close modal"]');
          const firstNonCloseElement = focusableElements.find(el => el !== closeButton);
          
          // Focus the first non-close element if available, otherwise focus the first element
          const elementToFocus = firstNonCloseElement || focusableElements[0];
          elementToFocus.focus();
        }, 0);
      }

      // Handle Tab key to trap focus within modal
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // If Shift+Tab on first element, focus last element
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // If Tab on last element, focus first element
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);

      // Restore focus when modal closes
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        if (previousActiveElementRef.current) {
          previousActiveElementRef.current.focus();
        }
      };
    }, [shouldRender, isClosing]);

    // Don't render if not open and not closing
    if (!shouldRender) return null;

    // Handle backdrop click (Requirement 10.5)
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <>
        {/* Backdrop - Requirement 10.1: Semi-transparent backdrop (50% opacity black) */}
        <div
          className={cn(
            'fixed inset-0 z-modal-backdrop',
            'bg-black/50', // 50% opacity black
            // Smooth fade in/out animations (Requirement 10.9)
            isClosing ? 'animate-fade-out' : 'animate-fade-in',
            backdropClassName
          )}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Modal Container - Requirement 10.2: Centered positioning */}
        <div
          className={cn(
            'fixed inset-0 z-modal',
            'flex items-center justify-center', // Centered vertically and horizontally
            'p-4', // Padding for mobile
            'overflow-y-auto' // Allow scrolling if content is too tall
          )}
          onClick={handleBackdropClick}
        >
          {/* Modal Content - Requirement 10.3: Smooth slide-in animation (300ms) */}
          <div
            ref={modalRef}
            className={cn(
              'relative w-full',
              sizeStyles[size],
              'bg-background-secondary',
              'rounded-lg shadow-xl',
              'border border-border-light',
              // Smooth slide-in/out animations (Requirement 10.9)
              isClosing ? 'animate-slide-out-to-bottom' : 'animate-slide-in-from-bottom',
              // Full-screen on mobile for better usability (Requirement 10.8, 10.10)
              'sm:max-h-[90vh]',
              'max-sm:min-h-screen max-sm:rounded-none',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking modal content
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-border-light">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-lg sm:text-xl font-semibold text-text-primary"
                  >
                    {title}
                  </h2>
                )}

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-center',
                      'w-8 h-8 rounded-lg',
                      'text-text-secondary hover:text-text-primary',
                      'hover:bg-background-tertiary',
                      'transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-secondary',
                      !title && 'ml-auto' // Right-align if no title
                    )}
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-4 sm:px-6 py-4 overflow-y-auto max-h-[60vh] sm:max-h-[70vh]">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border-light bg-background-primary/50">
                {footer}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';

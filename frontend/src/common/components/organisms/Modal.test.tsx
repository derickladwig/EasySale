import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          footer={<button>Save</button>}
        >
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should render close button by default', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should not render close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Styling - Requirement 10.1: Semi-transparent backdrop', () => {
    it('should render backdrop with semi-transparent background', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Find backdrop element (first fixed element with bg-black/50)
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/50');
    });
  });

  describe('Styling - Requirement 10.2: Centered positioning', () => {
    it('should center modal content vertically and horizontally', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Find modal container (element with flex items-center justify-center)
      const modalContainer = container.querySelector('.flex.items-center.justify-center');
      expect(modalContainer).toBeInTheDocument();
      expect(modalContainer).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('Styling - Requirement 10.3: Smooth slide-in animation', () => {
    it('should apply slide-in animation to modal content', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Find modal content (element with animate-slide-in-from-bottom)
      const modalContent = container.querySelector('.animate-slide-in-from-bottom');
      expect(modalContent).toBeInTheDocument();
      expect(modalContent).toHaveClass('animate-slide-in-from-bottom');
    });
  });

  describe('Sizes', () => {
    it('should apply sm size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-sm');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply md size class (default)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply lg size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply xl size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply full size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} size="full">
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.max-w-full');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked and closeOnBackdropClick is true', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={true}>
          <p>Modal content</p>
        </Modal>
      );

      // Click the backdrop (the outer container with flex)
      const backdrop = container.querySelector('.flex.items-center.justify-center');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when backdrop is clicked and closeOnBackdropClick is false', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={false}>
          <p>Modal content</p>
        </Modal>
      );

      // Click the backdrop
      const backdrop = container.querySelector('.flex.items-center.justify-center');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });

    it('should not call onClose when modal content is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const content = screen.getByText('Modal content');
      fireEvent.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed and closeOnEscape is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={true}>
          <p>Modal content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape key is pressed and closeOnEscape is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>
          <p>Modal content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should prevent body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', async () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Wait for animation to complete and modal to unmount
      await waitFor(
        () => {
          expect(document.body.style.overflow).toBe('');
        },
        { timeout: 500 }
      );
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const dialog = container.querySelector('[aria-modal="true"]');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-labelledby when title is provided', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(screen.getByText('Test Modal')).toHaveAttribute('id', 'modal-title');
    });

    it('should have aria-label on close button', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className to modal content', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} className="custom-modal">
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('.custom-modal');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply custom backdropClassName to backdrop', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} backdropClassName="custom-backdrop">
          <p>Modal content</p>
        </Modal>
      );

      const backdrop = container.querySelector('.custom-backdrop');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior - Requirements 10.8, 10.9, 10.10', () => {
    it('should apply full-screen classes on mobile (Requirement 10.8)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Find modal content
      const modalContent = container.querySelector('[role="dialog"]');
      expect(modalContent).toHaveClass('max-sm:min-h-screen');
      expect(modalContent).toHaveClass('max-sm:rounded-none');
    });

    it('should apply fade-in animation to backdrop when opening (Requirement 10.9)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toHaveClass('animate-fade-in');
      expect(backdrop).not.toHaveClass('animate-fade-out');
    });

    it('should apply slide-in animation to modal content when opening (Requirement 10.9)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('[role="dialog"]');
      expect(modalContent).toHaveClass('animate-slide-in-from-bottom');
      expect(modalContent).not.toHaveClass('animate-slide-out-to-bottom');
    });

    it('should apply fade-out animation to backdrop when closing (Requirement 10.9)', async () => {
      const { container, rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Modal is open
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // During closing animation, backdrop should have fade-out class
      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        expect(backdrop).toHaveClass('animate-fade-out');
        expect(backdrop).not.toHaveClass('animate-fade-in');
      }

      // Wait for animation to complete (300ms)
      await waitFor(
        () => {
          expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should apply slide-out animation to modal content when closing (Requirement 10.9)', async () => {
      const { container, rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Modal is open
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // During closing animation, modal content should have slide-out class
      const modalContent = container.querySelector('[role="dialog"]');
      if (modalContent) {
        expect(modalContent).toHaveClass('animate-slide-out-to-bottom');
        expect(modalContent).not.toHaveClass('animate-slide-in-from-bottom');
      }

      // Wait for animation to complete (300ms)
      await waitFor(
        () => {
          expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should delay unmounting until animation completes (Requirement 10.9)', async () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Modal is open
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      // Modal should still be in DOM during animation
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      // Wait for animation to complete (300ms)
      await waitFor(
        () => {
          expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should have responsive padding on mobile and desktop (Requirement 10.10)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Check header padding (the div with border-b class)
      const header = container.querySelector('.border-b.border-border-light');
      expect(header).toHaveClass('px-4', 'sm:px-6');

      // Check body padding (the div inside modal content with overflow-y-auto, but not the outer container)
      const modalContent = container.querySelector('[role="dialog"]');
      const body = modalContent?.querySelector('.overflow-y-auto');
      expect(body).toHaveClass('px-4', 'sm:px-6');
    });

    it('should have responsive title font size (Requirement 10.10)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const title = screen.getByText('Test Modal');
      expect(title).toHaveClass('text-lg', 'sm:text-xl');
    });

    it('should have responsive max-height (Requirement 10.10)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );

      const modalContent = container.querySelector('[role="dialog"]');
      expect(modalContent).toHaveClass('sm:max-h-[90vh]');
    });
  });

  describe('Focus Trap - Requirement 10.4', () => {
    it('should focus first focusable element when modal opens', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      const firstButton = screen.getByText('First Button');
      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });
    });

    it('should trap focus within modal when tabbing forward', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      const closeButton = screen.getByLabelText('Close modal');

      // First button should be focused initially (we skip close button on initial focus)
      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });

      // The actual DOM order is: Close Button, First Button, Second Button
      // Tab from Second Button (last element) should cycle back to Close Button (first element)
      
      // Manually focus the last element (Second Button)
      secondButton.focus();
      expect(secondButton).toHaveFocus();

      // Tab from last element should cycle back to first (Close Button)
      fireEvent.keyDown(document, { key: 'Tab' });
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
    });

    it('should trap focus within modal when tabbing backward', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      const closeButton = screen.getByLabelText('Close modal');

      // First button should be focused initially (we skip close button on initial focus)
      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });

      // The actual DOM order is: Close Button, First Button, Second Button
      // So the first element in the focus trap is Close Button
      // And the last element is Second Button
      // Shift+Tab from First Button should NOT cycle because First Button is not the first element
      // We need to test from the actual first element (Close Button)
      
      // Let's manually focus the close button first
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      // Now Shift+Tab from close button (first element) should cycle to last (Second Button)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      await waitFor(() => {
        expect(secondButton).toHaveFocus();
      });
    });

    it('should restore focus to previous element when modal closes', async () => {
      // Create a button outside the modal
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Open Modal';
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      expect(triggerButton).toHaveFocus();

      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button>Modal Button</button>
        </Modal>
      );

      // Modal button should be focused
      const modalButton = screen.getByText('Modal Button');
      await waitFor(() => {
        expect(modalButton).toHaveFocus();
      });

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <button>Modal Button</button>
        </Modal>
      );

      // Focus should be restored to trigger button
      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      });

      // Cleanup
      document.body.removeChild(triggerButton);
    });

    it('should handle modal with no focusable elements', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          <p>Just text content</p>
        </Modal>
      );

      // Should not throw error
      expect(screen.getByText('Just text content')).toBeInTheDocument();
    });

    it('should not focus disabled elements', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <button disabled>Disabled Button</button>
          <button>Enabled Button</button>
        </Modal>
      );

      // Should focus the enabled button, not the disabled one
      const enabledButton = screen.getByText('Enabled Button');
      await waitFor(() => {
        expect(enabledButton).toHaveFocus();
      });
    });

    it('should include inputs, textareas, and selects in focus trap', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <input type="text" placeholder="Text input" />
          <textarea placeholder="Textarea" />
          <select>
            <option>Option 1</option>
          </select>
          <button>Button</button>
        </Modal>
      );

      // First focusable element (input) should be focused
      const input = screen.getByPlaceholderText('Text input');
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('should include links in focus trap', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <a href="#test">Link</a>
          <button>Button</button>
        </Modal>
      );

      // First focusable element (link) should be focused
      const link = screen.getByText('Link');
      await waitFor(() => {
        expect(link).toHaveFocus();
      });
    });

    it('should include elements with tabindex in focus trap', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div tabIndex={0}>Focusable Div</div>
          <button>Button</button>
        </Modal>
      );

      // First focusable element (div with tabindex) should be focused
      const div = screen.getByText('Focusable Div');
      await waitFor(() => {
        expect(div).toHaveFocus();
      });
    });

    it('should exclude elements with tabindex="-1" from focus trap', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div tabIndex={-1}>Non-focusable Div</div>
          <button>Button</button>
        </Modal>
      );

      // Should focus the button, not the div with tabindex="-1"
      const button = screen.getByText('Button');
      await waitFor(() => {
        expect(button).toHaveFocus();
      });
    });
  });
});

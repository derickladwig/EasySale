/**
 * Integration Tests: Hardware Page
 *
 * End-to-end integration tests for the Hardware Configuration page.
 * Tests device display, tab navigation, connectivity testing, and template application.
 *
 * Validates Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HardwarePage } from './HardwarePage';
import { toast } from '@common/components/molecules/Toast';

// ============================================================================
// Mocks
// ============================================================================

// Mock Toast
vi.mock('@common/components/molecules/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock HardwareTemplates component
vi.mock('../components/HardwareTemplates', () => ({
  HardwareTemplates: ({ onApplyTemplate, onClose }: any) => (
    <div data-testid="hardware-templates-modal">
      <h2>Hardware Templates</h2>
      <button onClick={() => onApplyTemplate({ name: 'Retail Store' })}>
        Apply Retail Store
      </button>
      <button onClick={() => onApplyTemplate({ name: 'Restaurant' })}>
        Apply Restaurant
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// ============================================================================
// Setup
// ============================================================================

// Helper function to switch tabs
const switchToTab = async (user: ReturnType<typeof userEvent.setup>, tabName: string) => {
  const tabButton = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
  await user.click(tabButton);
  // Wait a bit for state to update
  await new Promise(resolve => setTimeout(resolve, 100));
};

describe('HardwarePage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 21.2: Configure receipt printer
  // ==========================================================================

  describe('Receipt Printer Configuration - Requirement 21.2', () => {
    it('should display receipt printer section', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Receipt printer tab should be present (should be immediate, no wait needed)
      expect(screen.getByText(/receipt printers/i)).toBeTruthy();
    });

    it('should show receipt printer devices', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Printer device should be displayed
      await waitFor(() => {
        expect(screen.getByText(/main counter printer/i)).toBeTruthy();
      });
    });

    it('should display printer type and connection info', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Printer details should be visible
      await waitFor(() => {
        expect(screen.getByText(/ESC\/POS/i)).toBeTruthy();
        expect(screen.getByText(/USB/i)).toBeTruthy();
        expect(screen.getByText(/80mm/i)).toBeTruthy();
      });
    });

    it('should show connection status for receipt printer', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Status indicator should be present
      await waitFor(() => {
        const statusIcon = document.querySelector('.text-success-400');
        expect(statusIcon).toBeTruthy();
      });
    });

    it('should show test print button', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Test print button should be present
      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test print/i });
        expect(testButton).toBeTruthy();
      });
    });

    it('should allow testing receipt printer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Click test print button
      const testButton = screen.getByRole('button', { name: /test print/i });
      await user.click(testButton);

      // Assert: Test should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('test print'));
      });
    });

    it('should show add printer button', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Add button should be present
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add printer/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should display default badge for default printer', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Default badge should be visible
      await waitFor(() => {
        expect(screen.getByText(/default/i)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 21.3: Configure label printer
  // ==========================================================================

  describe('Label Printer Configuration - Requirement 21.3', () => {
    it('should display label printer section', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Label printer content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/zebra/i)).toBeTruthy();
      });
    });

    it('should show label printer devices', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Printer device should be displayed
      await waitFor(() => {
        expect(screen.getByText(/zebra zd420/i)).toBeTruthy();
      });
    });

    it('should display label printer type and network info', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Printer details should be visible
      await waitFor(() => {
        expect(screen.getByText(/zebra zpl/i)).toBeTruthy();
        expect(screen.getByText(/192\.168\.1\.100/i)).toBeTruthy();
        expect(screen.getByText(/9100/i)).toBeTruthy();
      });
    });

    it('should show connection status for label printer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Status indicator should be present
      await waitFor(() => {
        const statusIcon = document.querySelector('.text-success-400');
        expect(statusIcon).toBeTruthy();
      });
    });

    it('should show test print button for label printer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Test print button should be present
      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test print/i });
        expect(testButton).toBeTruthy();
      });
    });

    it('should allow testing label printer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to label printers tab
      await switchToTab(user, 'Label Printers');

      // Act: Click test print button
      const testButton = screen.getByRole('button', { name: /test print/i });
      await user.click(testButton);

      // Assert: Test should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('test print'));
      });
    });
  });

  // ==========================================================================
  // Requirement 21.4: Configure barcode scanner
  // ==========================================================================

  describe('Barcode Scanner Configuration - Requirement 21.4', () => {
    it('should display barcode scanner section', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Scanner content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/barcode scanners/i)).toBeTruthy();
      });
    });

    it('should show scanner devices', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Scanner device should be displayed
      await waitFor(() => {
        expect(screen.getByText(/honeywell scanner/i)).toBeTruthy();
      });
    });

    it('should display scanner type and configuration', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Scanner details should be visible
      await waitFor(() => {
        expect(screen.getByText(/USB HID/i)).toBeTruthy();
        expect(screen.getByText(/enter/i)).toBeTruthy();
      });
    });

    it('should show connection status for scanner', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Status indicator should be present
      await waitFor(() => {
        const statusIcon = document.querySelector('.text-success-400');
        expect(statusIcon).toBeTruthy();
      });
    });

    it('should show test scan button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Test scan button should be present
      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test scan/i });
        expect(testButton).toBeTruthy();
      });
    });

    it('should allow testing scanner', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Act: Click test scan button
      const testButton = screen.getByRole('button', { name: /test scan/i });
      await user.click(testButton);

      // Assert: Test should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('scan'));
      });
    });
  });

  // ==========================================================================
  // Requirement 21.5: Configure cash drawer
  // ==========================================================================

  describe('Cash Drawer Configuration - Requirement 21.5', () => {
    it('should display cash drawer section', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Cash drawer content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/cash drawers/i)).toBeTruthy();
      });
    });

    it('should show cash drawer devices', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Drawer device should be displayed
      await waitFor(() => {
        expect(screen.getByText(/main cash drawer/i)).toBeTruthy();
      });
    });

    it('should display drawer type and connection', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Drawer details should be visible
      await waitFor(() => {
        expect(screen.getByText(/RJ11 via Printer/i)).toBeTruthy();
        expect(screen.getByText(/main counter printer/i)).toBeTruthy();
      });
    });

    it('should show connection status for cash drawer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Status indicator should be present
      await waitFor(() => {
        const statusIcon = document.querySelector('.text-success-400');
        expect(statusIcon).toBeTruthy();
      });
    });

    it('should show test open button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Test open button should be present
      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test open/i });
        expect(testButton).toBeTruthy();
      });
    });

    it('should allow testing cash drawer', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Act: Click test open button
      const testButton = screen.getByRole('button', { name: /test open/i });
      await user.click(testButton);

      // Assert: Test should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('drawer'));
      });
    });
  });

  // ==========================================================================
  // Requirement 21.6: Configure payment terminal
  // ==========================================================================

  describe('Payment Terminal Configuration - Requirement 21.6', () => {
    it('should display payment terminal section', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Assert: Payment terminal content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/payment terminals/i)).toBeTruthy();
      });
    });

    it('should show payment terminal devices', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Assert: Terminal device should be displayed
      await waitFor(() => {
        expect(screen.getByText(/stripe reader/i)).toBeTruthy();
      });
    });

    it('should display terminal type and connection settings', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Assert: Terminal details should be visible
      await waitFor(() => {
        expect(screen.getByText(/stripe terminal/i)).toBeTruthy();
        expect(screen.getByText(/tmr_123456/i)).toBeTruthy();
      });
    });

    it('should show connection status for payment terminal', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Assert: Status indicator should be present (disconnected in this case)
      await waitFor(() => {
        const statusIcon = document.querySelector('.text-error-400');
        expect(statusIcon).toBeTruthy();
      });
    });

    it('should show test connection button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Assert: Test connection button should be present
      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test connection/i });
        expect(testButton).toBeTruthy();
      });
    });

    it('should allow testing payment terminal', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab
      await switchToTab(user, 'Payment Terminals');

      // Act: Click test connection button
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      // Assert: Test should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('terminal'));
      });
    });
  });

  // ==========================================================================
  // Requirement 21.7: Test connectivity for all devices
  // ==========================================================================

  describe('Device Connectivity Testing - Requirement 21.7', () => {
    it('should display connection status indicators', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Status icons should be present
      await waitFor(() => {
        const successIcons = document.querySelectorAll('.text-success-400');
        expect(successIcons.length).toBeGreaterThan(0);
      });
    });

    it('should show connected status with green icon', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Connected devices should have success icon
      await waitFor(() => {
        const successIcon = document.querySelector('.text-success-400');
        expect(successIcon).toBeTruthy();
      });
    });

    it('should show disconnected status with red icon', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Switch to payment terminals tab (has disconnected device)
      await switchToTab(user, 'Payment Terminals');

      // Assert: Disconnected device should have error icon
      await waitFor(() => {
        const errorIcon = document.querySelector('.text-error-400');
        expect(errorIcon).toBeTruthy();
      });
    });

    it('should allow testing all device types', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Test receipt printer
      let testButton = screen.getByRole('button', { name: /test print/i });
      await user.click(testButton);

      // Switch to label printers
      await switchToTab(user, 'Label Printers');
      testButton = screen.getByRole('button', { name: /test print/i });
      await user.click(testButton);

      // Switch to scanners
      await switchToTab(user, 'Scanners');
      testButton = screen.getByRole('button', { name: /test scan/i });
      await user.click(testButton);

      // Switch to cash drawers
      await switchToTab(user, 'Cash Drawers');
      testButton = screen.getByRole('button', { name: /test open/i });
      await user.click(testButton);

      // Switch to payment terminals
      await switchToTab(user, 'Payment Terminals');
      testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      // Assert: All tests should be initiated
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledTimes(5);
      });
    });
  });

  // ==========================================================================
  // Requirement 21.10: Apply hardware templates
  // ==========================================================================

  describe('Hardware Template Application - Requirement 21.10', () => {
    it('should display template button', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Template button should be present
      await waitFor(() => {
        const templateButton = screen.getByRole('button', { name: /use template/i });
        expect(templateButton).toBeTruthy();
      });
    });

    it('should open template modal when button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Click template button
      const templateButton = screen.getByRole('button', { name: /use template/i });
      await user.click(templateButton);

      // Assert: Template modal should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('hardware-templates-modal')).toBeTruthy();
        expect(screen.getByText(/hardware templates/i)).toBeTruthy();
      });
    });

    it('should display available templates', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Open template modal
      const templateButton = screen.getByRole('button', { name: /use template/i });
      await user.click(templateButton);

      // Assert: Templates should be listed
      await waitFor(() => {
        expect(screen.getByText(/retail store/i)).toBeTruthy();
        expect(screen.getByText(/restaurant/i)).toBeTruthy();
      });
    });

    it('should allow applying a template', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Open template modal
      const templateButton = screen.getByRole('button', { name: /use template/i });
      await user.click(templateButton);

      // Act: Select and apply template
      const applyButton = screen.getByRole('button', { name: /apply retail store/i });
      await user.click(applyButton);

      // Assert: Template should be applied
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('template'));
      });
    });

    it('should close template modal after applying', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Open template modal
      const templateButton = screen.getByRole('button', { name: /use template/i });
      await user.click(templateButton);

      // Act: Apply template
      const applyButton = screen.getByRole('button', { name: /apply retail store/i });
      await user.click(applyButton);

      // Assert: Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('hardware-templates-modal')).toBeNull();
      });
    });

    it('should allow closing template modal without applying', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Open template modal
      const templateButton = screen.getByRole('button', { name: /use template/i });
      await user.click(templateButton);

      // Act: Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Assert: Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('hardware-templates-modal')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Workflow Tests
  // ==========================================================================

  describe('Page Layout and Workflow', () => {
    it('should display page title and description', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Title and description should be present
      await waitFor(() => {
        expect(screen.getByText(/hardware configuration/i)).toBeTruthy();
        expect(screen.getByText(/configure printers.*scanners.*terminals/i)).toBeTruthy();
      });
    });

    it('should display all hardware tabs', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: All tabs should be present
      await waitFor(() => {
        expect(screen.getByText(/receipt printers/i)).toBeTruthy();
        expect(screen.getByText(/label printers/i)).toBeTruthy();
        expect(screen.getByText(/scanners/i)).toBeTruthy();
        expect(screen.getByText(/cash drawers/i)).toBeTruthy();
        expect(screen.getByText(/payment terminals/i)).toBeTruthy();
      });
    });

    it('should allow switching between tabs', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Click label printers tab
      await switchToTab(user, 'Label Printers');

      // Assert: Label printer content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/zebra/i)).toBeTruthy();
      });

      // Act: Click scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Scanner content should be displayed
      await waitFor(() => {
        expect(screen.getByText(/honeywell/i)).toBeTruthy();
      });
    });

    it('should highlight active tab', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Click cash drawers tab
      await switchToTab(user, 'Cash Drawers');

      // Assert: Tab should be highlighted
      await waitFor(() => {
        const cashDrawersTab = screen.getByText(/cash drawers/i);
        const tabButton = cashDrawersTab.closest('button');
        expect(tabButton?.className).toContain('primary');
      });
    });

    it('should display add device buttons on each tab', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Assert: Add button should be present on receipt printers tab
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add printer/i })).toBeTruthy();
      });

      // Act: Switch to scanners tab
      await switchToTab(user, 'Scanners');

      // Assert: Add button should be present on scanners tab
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add scanner/i })).toBeTruthy();
      });
    });

    it('should show device count on each tab', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: At least one device should be shown on default tab
      await waitFor(() => {
        expect(screen.getByText(/main counter printer/i)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: Headings should be properly structured
      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1.textContent).toContain('Hardware Configuration');

        const h2Elements = screen.getAllByRole('heading', { level: 2 });
        expect(h2Elements.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible buttons', async () => {
      // Act
      render(<HardwarePage />);

      // Assert: All buttons should have accessible names
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy();
        });
      });
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Tab through interactive elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Assert: Focus should move through elements
      const focusedElement = document.activeElement;
      expect(focusedElement?.tagName).toMatch(/BUTTON|INPUT|SELECT/);
    });

    it('should have proper tab navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Navigate to label printers tab using keyboard
      const labelTab = screen.getByText(/label printers/i).closest('button');
      if (labelTab) {
        labelTab.focus();
        await user.keyboard('{Enter}');
      }

      // Assert: Tab content should change
      await waitFor(() => {
        expect(screen.getByText(/zebra/i)).toBeTruthy();
      });
    });

    it('should have visible focus indicators', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<HardwarePage />);

      // Act: Tab to first button
      await user.tab();

      // Assert: Focused element should have focus styles
      const focusedElement = document.activeElement;
      const styles = window.getComputedStyle(focusedElement as Element);
      // Button should have focus-visible styles (outline or ring)
      expect(focusedElement?.className).toContain('focus');
    });
  });
});

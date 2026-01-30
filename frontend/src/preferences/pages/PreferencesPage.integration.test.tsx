/**
 * Integration Tests: Preferences Page
 *
 * End-to-end integration tests for the Preferences page.
 * Tests theme selection, density selection, landing page configuration, and keyboard shortcuts.
 *
 * Validates Requirements: 7.1 (User Preferences)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreferencesPage } from './PreferencesPage';
import { AuthProvider } from '@common/contexts/AuthContext';
import { ToastProvider } from '@common/contexts/ToastContext';
import { BrowserRouter } from 'react-router-dom';

// ============================================================================
// Test Wrapper
// ============================================================================

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// ============================================================================
// Mocks
// ============================================================================

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// ============================================================================
// Setup
// ============================================================================

describe('PreferencesPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockConfirm.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 7.1: User Preferences - Theme Selection
  // ==========================================================================

  describe('Theme Selection - Requirement 7.1', () => {
    it('should display theme options', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeTruthy();
        expect(screen.getByText('Dark')).toBeTruthy();
        expect(screen.getByText('System')).toBeTruthy();
      });
    });

    it('should show theme descriptions', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Always use light theme')).toBeTruthy();
        expect(screen.getByText('Always use dark theme')).toBeTruthy();
        expect(screen.getByText('Follow system preference')).toBeTruthy();
      });
    });

    it('should allow selecting light theme', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const lightButton = screen.getByText('Light').closest('button');
      expect(lightButton).toBeTruthy();
      
      await user.click(lightButton!);

      await waitFor(() => {
        expect(lightButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting dark theme', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const darkButton = screen.getByText('Dark').closest('button');
      expect(darkButton).toBeTruthy();
      
      await user.click(darkButton!);

      await waitFor(() => {
        expect(darkButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting system theme', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const systemButton = screen.getByText('System').closest('button');
      expect(systemButton).toBeTruthy();
      
      await user.click(systemButton!);

      await waitFor(() => {
        expect(systemButton?.className).toContain('border-primary-500');
      });
    });

    it('should show unsaved changes indicator when theme is changed', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });

    it('should display theme icons', async () => {
      const { container } = render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const themeSection = screen.getByText('Theme').closest('div');
        const icons = themeSection?.querySelectorAll('svg');
        expect(icons?.length).toBeGreaterThan(0); // At least some icons present
      });
    });
  });

  // ==========================================================================
  // Requirement 7.1: User Preferences - UI Density
  // ==========================================================================

  describe('UI Density Selection - Requirement 7.1', () => {
    it('should display density options', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Compact')).toBeTruthy();
        expect(screen.getByText('Comfortable')).toBeTruthy();
        expect(screen.getByText('Spacious')).toBeTruthy();
      });
    });

    it('should show density descriptions', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('More content, less spacing')).toBeTruthy();
        expect(screen.getByText('Balanced spacing')).toBeTruthy();
        expect(screen.getByText('More spacing, easier to read')).toBeTruthy();
      });
    });

    it('should allow selecting compact density', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const compactButton = screen.getByText('Compact').closest('button');
      expect(compactButton).toBeTruthy();
      
      await user.click(compactButton!);

      await waitFor(() => {
        expect(compactButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting comfortable density', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const comfortableButton = screen.getByText('Comfortable').closest('button');
      expect(comfortableButton).toBeTruthy();
      
      await user.click(comfortableButton!);

      await waitFor(() => {
        expect(comfortableButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting spacious density', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const spaciousButton = screen.getByText('Spacious').closest('button');
      expect(spaciousButton).toBeTruthy();
      
      await user.click(spaciousButton!);

      await waitFor(() => {
        expect(spaciousButton?.className).toContain('border-primary-500');
      });
    });

    it('should show unsaved changes indicator when density is changed', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const compactButton = screen.getByText('Compact').closest('button');
      await user.click(compactButton!);

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });

    it('should display density icons', async () => {
      const { container } = render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const densitySection = screen.getByText('UI Density').closest('div');
        const icons = densitySection?.querySelectorAll('svg');
        expect(icons?.length).toBeGreaterThan(0); // At least some icons present
      });
    });
  });

  // ==========================================================================
  // Requirement 7.1: User Preferences - Default Landing Page
  // ==========================================================================

  describe('Default Landing Page - Requirement 7.1', () => {
    it('should display landing page dropdown', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeTruthy();
      });
    });

    it('should show all landing page options', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        const options = Array.from(select.options).map(opt => opt.text);
        
        expect(options).toContain('Home');
        expect(options).toContain('Sell');
        expect(options).toContain('Lookup');
        expect(options).toContain('Inventory');
        expect(options).toContain('Customers');
        expect(options).toContain('Reporting');
        expect(options).toContain('Admin');
      });
    });

    it('should allow selecting a landing page', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      await user.selectOptions(select, '/sell');

      await waitFor(() => {
        expect(select.value).toBe('/sell');
      });
    });

    it('should show unsaved changes indicator when landing page is changed', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '/inventory');

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });

    it('should display landing page description', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/choose which page to show when you first log in/i)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 7.1: User Preferences - Keyboard Shortcuts
  // ==========================================================================

  describe('Keyboard Shortcuts - Requirement 7.1', () => {
    it('should display keyboard shortcuts toggle', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Enable keyboard shortcuts')).toBeTruthy();
      });
    });

    it('should show keyboard shortcuts description', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/use keyboard shortcuts for faster navigation and actions/i)).toBeTruthy();
      });
    });

    it('should allow enabling keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox', { name: /enable keyboard shortcuts/i });
      
      // If already checked, uncheck first
      if ((checkbox as HTMLInputElement).checked) {
        await user.click(checkbox);
      }
      
      await user.click(checkbox);

      await waitFor(() => {
        expect((checkbox as HTMLInputElement).checked).toBe(true);
      });
    });

    it('should allow disabling keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox', { name: /enable keyboard shortcuts/i });
      
      // If not checked, check first
      if (!(checkbox as HTMLInputElement).checked) {
        await user.click(checkbox);
      }
      
      await user.click(checkbox);

      await waitFor(() => {
        expect((checkbox as HTMLInputElement).checked).toBe(false);
      });
    });

    it('should show common shortcuts when enabled', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox', { name: /enable keyboard shortcuts/i });
      
      // Ensure shortcuts are enabled
      if (!(checkbox as HTMLInputElement).checked) {
        await user.click(checkbox);
      }

      await waitFor(() => {
        expect(screen.getByText('Common Shortcuts')).toBeTruthy();
        expect(screen.getByText('Go to Sell')).toBeTruthy();
        expect(screen.getByText('Go to Lookup')).toBeTruthy();
        expect(screen.getByText('Go to Inventory')).toBeTruthy();
        expect(screen.getByText('Search')).toBeTruthy();
      });
    });

    it('should show unsaved changes indicator when shortcuts are toggled', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const checkbox = screen.getByRole('checkbox', { name: /enable keyboard shortcuts/i });
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Save and Cancel Actions
  // ==========================================================================

  describe('Save and Cancel Actions', () => {
    it('should enable save button when changes are made', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should disable save button when no changes are made', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('should enable cancel button when changes are made', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).not.toBeDisabled();
      });
    });

    it('should revert changes when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      // Make a change
      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).toBeNull();
      });
    });

    it('should save changes when save is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      // Make a change
      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Reset to Defaults
  // ==========================================================================

  describe('Reset to Defaults', () => {
    it('should display reset button', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeTruthy();
      });
    });

    it('should show reset description', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Reset to Defaults')).toBeTruthy();
        expect(screen.getByText(/restore all preferences to their default values/i)).toBeTruthy();
      });
    });

    it('should show confirmation dialog when reset is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
      });
    });

    it('should not reset if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false);
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      // Make a change
      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      // Try to reset and cancel
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Changes should still be there
      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeTruthy();
        expect(screen.getByText(/customize your EasySale experience/i)).toBeTruthy();
      });
    });

    it('should display all preference sections', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Theme')).toBeTruthy();
        expect(screen.getByText('UI Density')).toBeTruthy();
        expect(screen.getByText('Default Landing Page')).toBeTruthy();
        expect(screen.getByText('Keyboard Shortcuts')).toBeTruthy();
      });
    });

    it('should use collapsible sections', async () => {
      const { container } = render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // CollapsibleSection components should be present
        const sections = container.querySelectorAll('[class*="space-y-4"]');
        expect(sections.length).toBeGreaterThan(0);
      });
    });

    it('should have sticky footer with save/cancel buttons', async () => {
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(saveButton).toBeTruthy();
        expect(cancelButton).toBeTruthy();
      });
    });

    it('should be scrollable for long content', async () => {
      const { container } = render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const scrollableContainer = container.querySelector('[class*="overflow-auto"]');
        expect(scrollableContainer).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Complete Workflows
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow changing multiple preferences and saving', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      // Change theme
      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      // Change density
      const compactButton = screen.getByText('Compact').closest('button');
      await user.click(compactButton!);

      // Change landing page
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '/sell');

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).toBeNull();
      });
    });

    it('should allow making changes, cancelling, and making new changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <PreferencesPage />
        </TestWrapper>
      );

      // Make first change
      const lightButton = screen.getByText('Light').closest('button');
      await user.click(lightButton!);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Make new change
      const compactButton = screen.getByText('Compact').closest('button');
      await user.click(compactButton!);

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeTruthy();
      });
    });
  });
});

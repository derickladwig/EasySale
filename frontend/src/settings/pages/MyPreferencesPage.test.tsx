/**
 * Unit Tests: MyPreferencesPage Component
 *
 * Tests the settings page with tabbed interface, collapsible sections,
 * sticky footer, toggle switches, and responsive behavior.
 *
 * Validates: Requirements 4.1-4.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyPreferencesPage } from './MyPreferencesPage';
import { AuthContext } from '@common/contexts/AuthContext';
import { ToastProvider } from '@common/contexts/ToastContext';
import { BrowserRouter } from 'react-router-dom';

// Mock user data
const mockUser = {
  id: '1',
  username: 'testuser',
  display_name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'admin'],
};

// Mock AuthContext
const mockAuthContext = {
  user: mockUser,
  token: 'mock-token',
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
};

// Helper to render component with providers
const renderMyPreferencesPage = () => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <ToastProvider>
          <MyPreferencesPage />
        </ToastProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('MyPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Navigation (Requirement 4.1)', () => {
    it('should render tabbed interface with all tabs', () => {
      renderMyPreferencesPage();

      expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should show Profile tab as active by default', () => {
      renderMyPreferencesPage();

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      expect(profileTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Security tab when clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      expect(securityTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should switch to Appearance tab when clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
    });

    it('should switch to Notifications tab when clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      expect(notificationsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    it('should display tab icons', () => {
      const { container } = renderMyPreferencesPage();

      const tabs = container.querySelectorAll('[role="tab"]');
      tabs.forEach((tab) => {
        const icon = tab.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const profileTab = screen.getByRole('tab', { name: /profile/i });
      profileTab.focus();

      // Press ArrowRight to move to next tab
      await user.keyboard('{ArrowRight}');

      const securityTab = screen.getByRole('tab', { name: /security/i });
      expect(securityTab).toHaveFocus();
    });

    it('should maintain tab state when switching between tabs', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Go to Security tab and enter password
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword');

      // Switch to Profile tab
      const profileTab = screen.getByRole('tab', { name: /profile/i });
      await user.click(profileTab);

      // Switch back to Security tab
      await user.click(securityTab);

      // Password should still be there
      expect(currentPasswordInput).toHaveValue('oldpassword');
    });
  });

  describe('Collapsible Sections (Requirement 4.2)', () => {
    it('should render collapsible sections in Profile tab', () => {
      renderMyPreferencesPage();

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('should render collapsible sections in Security tab', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should render collapsible sections in Appearance tab', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
    });

    it('should render collapsible sections in Notifications tab', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    it('should open sections by default', () => {
      renderMyPreferencesPage();

      const section = screen.getByText('Personal Information').closest('button');
      expect(section).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle section when clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const sectionButton = screen.getByText('Personal Information').closest('button');
      expect(sectionButton).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      await user.click(sectionButton!);
      expect(sectionButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await user.click(sectionButton!);
      expect(sectionButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should display section icons', () => {
      renderMyPreferencesPage();

      const sectionHeader = screen.getByText('Personal Information').closest('button');
      const icon = sectionHeader?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Form Validation (Requirement 4.3, 4.7)', () => {
    it('should display validation error for mismatched passwords', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      // Fill in password fields with mismatched passwords
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'differentpassword');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should display validation error for short password', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      // Fill in password fields with short password
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'short');
      await user.type(confirmPasswordInput, 'short');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show error toast (look for the toast specifically, not the helper text)
      await waitFor(
        () => {
          const toastMessages = screen.getAllByText(/password must be at least 8 characters/i);
          // Should have both helper text and toast message
          expect(toastMessages.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });

    it('should display helper text for password requirements', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should display helper text for email field', () => {
      renderMyPreferencesPage();

      expect(
        screen.getByText(/this email will be used for notifications and account recovery/i)
      ).toBeInTheDocument();
    });
  });

  describe('Sticky Footer with Save/Cancel (Requirement 4.4)', () => {
    it('should render sticky footer with save and cancel buttons', () => {
      renderMyPreferencesPage();

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should disable save button when no changes', () => {
      renderMyPreferencesPage();

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable cancel button when no changes', () => {
      renderMyPreferencesPage();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should enable save button when changes are made', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should enable cancel button when changes are made', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeEnabled();
    });

    it('should show loading state on save button', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Button should show loading state (disabled during save)
      expect(saveButton).toBeDisabled();
    });

    it('should reset form when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
      const originalValue = displayNameInput.value;

      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'New Name');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(displayNameInput.value).toBe(originalValue);
    });

    it('should show success toast after saving', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Unsaved Changes Indicator (Requirement 4.5)', () => {
    it('should not show unsaved changes indicator initially', () => {
      renderMyPreferencesPage();

      expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
    });

    it('should show unsaved changes indicator when form is modified', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });

    it('should show pulsing dot with unsaved changes indicator', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const indicator = screen.getByText(/you have unsaved changes/i);
      const dot = indicator.querySelector('.animate-pulse');
      expect(dot).toBeInTheDocument();
    });

    it('should hide unsaved changes indicator after saving', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
      });
    });

    it('should hide unsaved changes indicator after canceling', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.type(displayNameInput, ' Updated');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
    });
  });

  describe('Toggle Switches (Requirement 4.6)', () => {
    it('should render toggle switches in Notifications tab', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/desktop notifications/i)).toBeInTheDocument();
    });

    it('should toggle email notifications switch', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      const emailToggle = screen.getByLabelText(/email notifications/i);
      const initialState = (emailToggle as HTMLInputElement).checked;

      await user.click(emailToggle);

      expect((emailToggle as HTMLInputElement).checked).toBe(!initialState);
    });

    it('should toggle desktop notifications switch', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      const desktopToggle = screen.getByLabelText(/desktop notifications/i);
      const initialState = (desktopToggle as HTMLInputElement).checked;

      await user.click(desktopToggle);

      expect((desktopToggle as HTMLInputElement).checked).toBe(!initialState);
    });

    it('should show unsaved changes when toggle is changed', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      const emailToggle = screen.getByLabelText(/email notifications/i);
      await user.click(emailToggle);

      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });

    it('should display toggle descriptions', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      expect(screen.getByText(/receive notifications via email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/show desktop notifications for important events/i)
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior (Requirement 4.10)', () => {
    it('should render tabs in horizontal layout', () => {
      const { container } = renderMyPreferencesPage();

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('flex');
    });

    it('should support horizontal scrolling for tabs', () => {
      const { container } = renderMyPreferencesPage();

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('overflow-x-auto');
    });

    it('should have proper responsive padding', () => {
      const { container } = renderMyPreferencesPage();

      const contentArea = container.querySelector('.p-6');
      expect(contentArea).toBeInTheDocument();
    });

    it('should center content with max-width', () => {
      const { container } = renderMyPreferencesPage();

      const contentWrapper = container.querySelector('.max-w-4xl');
      expect(contentWrapper).toBeInTheDocument();
      expect(contentWrapper).toHaveClass('mx-auto');
    });

    it('should have responsive flex layout for footer', () => {
      const { container } = renderMyPreferencesPage();

      const footer = container.querySelector('.border-t.border-border-light');
      expect(footer).toBeInTheDocument();
      
      const footerContent = footer?.querySelector('.flex');
      expect(footerContent).toBeInTheDocument();
    });
  });

  describe('Theme Selection (Appearance Tab)', () => {
    it('should render theme options', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      expect(screen.getByText(/^light$/i)).toBeInTheDocument();
      expect(screen.getByText(/^dark$/i)).toBeInTheDocument();
      expect(screen.getByText(/^auto$/i)).toBeInTheDocument();
    });

    it('should highlight selected theme', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      const darkButton = screen.getByText(/^dark$/i).closest('button');
      expect(darkButton).toHaveClass('border-primary-500');
    });

    it('should change theme when option is clicked', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      const lightButton = screen.getByText(/^light$/i).closest('button');
      await user.click(lightButton!);

      expect(lightButton).toHaveClass('border-primary-500');
    });

    it('should show theme descriptions', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      expect(screen.getByText('Always light')).toBeInTheDocument();
      expect(screen.getByText('Always dark')).toBeInTheDocument();
      expect(screen.getByText('System default')).toBeInTheDocument();
    });
  });

  describe('Complete Workflows', () => {
    it('should allow updating profile information', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should allow changing password', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      // Fill in password fields
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
      });
    });

    it('should allow changing appearance settings', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Appearance tab
      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      await user.click(appearanceTab);

      // Select light theme
      const lightButton = screen.getByText(/^light$/i).closest('button');
      await user.click(lightButton!);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/appearance preferences saved/i)).toBeInTheDocument();
      });
    });

    it('should allow changing notification settings', async () => {
      const user = userEvent.setup();
      renderMyPreferencesPage();

      // Navigate to Notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      // Toggle email notifications
      const emailToggle = screen.getByLabelText(/email notifications/i);
      await user.click(emailToggle);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/notification preferences saved/i)).toBeInTheDocument();
      });
    });
  });
});
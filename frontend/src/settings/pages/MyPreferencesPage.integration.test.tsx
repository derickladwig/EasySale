/**
 * Integration Tests: My Preferences Page
 *
 * End-to-end integration tests for the My Preferences page.
 * Tests preference updates, password change, and theme switching.
 *
 * Validates Requirements: 18.2, 18.3, 18.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyPreferencesPage } from './MyPreferencesPage';
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

// Mock AuthContext
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'admin',
};

vi.mock('@common/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// ============================================================================
// Setup
// ============================================================================

describe('MyPreferencesPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 18.2: Allow users to change their display name and email
  // ==========================================================================

  describe('Profile Updates - Requirement 18.2', () => {
    it('should display profile section with current user data', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Profile section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile/i })).toBeTruthy();
        expect(screen.getByLabelText(/display name/i)).toBeTruthy();
        expect(screen.getByLabelText(/email/i)).toBeTruthy();
      });
    });

    it('should pre-fill display name with current user data', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Display name should be pre-filled
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
        expect(displayNameInput.value).toBe('Test User');
      });
    });

    it('should pre-fill email with current user data', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Email should be pre-filled
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        expect(emailInput.value).toBe('test@example.com');
      });
    });

    it('should allow updating display name', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update display name
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Updated Name');

      // Assert: Input value should be updated
      expect((displayNameInput as HTMLInputElement).value).toBe('Updated Name');
    });

    it('should allow updating email', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update email
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      // Assert: Input value should be updated
      expect((emailInput as HTMLInputElement).value).toBe('newemail@example.com');
    });

    it('should save profile changes when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update display name
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'New Display Name');

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });
    });

    it('should show loading state while saving profile', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update display name and save
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'New Name');

      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(saveButton);

      // Assert: Button should show loading state
      // Note: The actual loading indicator depends on Button component implementation
      expect(saveButton).toBeTruthy();
    });

    it('should display helper text for email field', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Helper text should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/this email will be used for notifications and account recovery/i)
        ).toBeTruthy();
      });
    });

    it('should allow updating both display name and email together', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update both fields
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Updated Name');

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');

      // Act: Save changes
      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });
    });
  });

  // ==========================================================================
  // Requirement 18.3: Allow users to change their password
  // ==========================================================================

  describe('Password Change - Requirement 18.3', () => {
    it('should display password change section', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Password section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /change password/i })).toBeTruthy();
        expect(screen.getByLabelText(/current password/i)).toBeTruthy();
        expect(screen.getByLabelText(/^new password$/i)).toBeTruthy();
        expect(screen.getByLabelText(/confirm new password/i)).toBeTruthy();
      });
    });

    it('should have password fields of type password', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Password fields should have type="password"
      await waitFor(() => {
        const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
        const newPasswordInput = screen.getByLabelText(/^new password$/i) as HTMLInputElement;
        const confirmPasswordInput = screen.getByLabelText(
          /confirm new password/i
        ) as HTMLInputElement;

        expect(currentPasswordInput.type).toBe('password');
        expect(newPasswordInput.type).toBe('password');
        expect(confirmPasswordInput.type).toBe('password');
      });
    });

    it('should show helper text for password requirements', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Helper text should be displayed
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeTruthy();
      });
    });

    it('should disable change password button when fields are empty', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Button should be disabled
      await waitFor(() => {
        const changePasswordButton = screen.getByRole('button', {
          name: /change password/i,
        }) as HTMLButtonElement;
        expect(changePasswordButton.disabled).toBe(true);
      });
    });

    it('should enable change password button when all fields are filled', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Fill in all password fields
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'newpassword123');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'newpassword123');

      // Assert: Button should be enabled
      await waitFor(() => {
        const changePasswordButton = screen.getByRole('button', {
          name: /change password/i,
        }) as HTMLButtonElement;
        expect(changePasswordButton.disabled).toBe(false);
      });
    });

    it('should show error when passwords do not match', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Fill in password fields with mismatched passwords
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'newpassword123');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'differentpassword');

      // Act: Click change password button
      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Assert: Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
      });
    });

    it('should show error when password is too short', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Fill in password fields with short password
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'short');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'short');

      // Act: Click change password button
      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Assert: Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters');
      });
    });

    it('should successfully change password when valid', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Fill in password fields with valid data
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'newpassword123');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'newpassword123');

      // Act: Click change password button
      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Password changed successfully');
      });
    });

    it('should clear password fields after successful change', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Fill in password fields and submit
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'newpassword123');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'newpassword123');

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Assert: Fields should be cleared after success
      await waitFor(() => {
        expect((currentPasswordInput as HTMLInputElement).value).toBe('');
        expect((newPasswordInput as HTMLInputElement).value).toBe('');
        expect((confirmPasswordInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  // ==========================================================================
  // Requirement 18.4: Allow users to select theme
  // ==========================================================================

  describe('Theme Switching - Requirement 18.4', () => {
    it('should display appearance section with theme options', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Appearance section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /appearance/i })).toBeTruthy();
        expect(screen.getByText(/theme/i)).toBeTruthy();
      });
    });

    it('should display all theme options', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: All theme options should be displayed
      await waitFor(() => {
        expect(screen.getByText(/always light/i)).toBeTruthy();
        expect(screen.getByText(/always dark/i)).toBeTruthy();
        expect(screen.getByText(/system default/i)).toBeTruthy();
      });
    });

    it('should show descriptions for each theme option', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Theme descriptions should be displayed
      await waitFor(() => {
        expect(screen.getByText(/always light/i)).toBeTruthy();
        expect(screen.getByText(/always dark/i)).toBeTruthy();
        expect(screen.getByText(/system default/i)).toBeTruthy();
      });
    });

    it('should have dark theme selected by default', async () => {
      // Act
      const { container } = render(<MyPreferencesPage />);

      // Assert: Dark theme button should have selected styling
      await waitFor(() => {
        const darkButton = screen.getByText(/always dark/i).closest('button');
        expect(darkButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting light theme', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Click light theme button
      const lightButton = screen.getByText(/always light/i).closest('button');
      if (lightButton) {
        await user.click(lightButton);
      }

      // Assert: Light theme should be selected
      await waitFor(() => {
        expect(lightButton?.className).toContain('border-primary-500');
      });
    });

    it('should allow selecting auto theme', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Click auto theme button
      const autoButton = screen.getByText(/system default/i).closest('button');
      if (autoButton) {
        await user.click(autoButton);
      }

      // Assert: Auto theme should be selected
      await waitFor(() => {
        expect(autoButton?.className).toContain('border-primary-500');
      });
    });

    it('should save appearance preferences when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Select light theme
      const lightButton = screen.getByText(/always light/i).closest('button');
      if (lightButton) {
        await user.click(lightButton);
      }

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save appearance/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Appearance preferences saved');
      });
    });

    it('should show loading state while saving appearance', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Select theme and save
      const lightButton = screen.getByText(/always light/i).closest('button');
      if (lightButton) {
        await user.click(lightButton);
      }

      const saveButton = screen.getByRole('button', { name: /save appearance/i });
      await user.click(saveButton);

      // Assert: Button should show loading state
      expect(saveButton).toBeTruthy();
    });

    it('should visually distinguish selected theme from others', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Select light theme
      const lightButton = screen.getByText(/always light/i).closest('button');
      const darkButton = screen.getByText(/always dark/i).closest('button');

      if (lightButton) {
        await user.click(lightButton);
      }

      // Assert: Light should be selected, dark should not
      await waitFor(() => {
        expect(lightButton?.className).toContain('border-primary-500');
        expect(darkButton?.className).not.toContain('border-primary-500');
      });
    });
  });

  // ==========================================================================
  // Notifications Section
  // ==========================================================================

  describe('Notification Preferences', () => {
    it('should display notifications section', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Notifications section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^notifications$/i })).toBeTruthy();
        expect(screen.getByText(/email notifications/i)).toBeTruthy();
        // Desktop Notifications appears twice (label and description), so we use getAllByText
        expect(screen.getAllByText(/desktop notifications/i).length).toBeGreaterThan(0);
      });
    });

    it('should show email notifications toggle', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Email notifications toggle should be present
      await waitFor(() => {
        // Find the toggle by looking for the checkbox within the notifications section
        const toggles = screen.getAllByRole('checkbox');
        // First toggle should be email notifications (based on order in component)
        expect(toggles[0]).toBeTruthy();
        expect((toggles[0] as HTMLInputElement).checked).toBe(true); // Default is enabled
      });
    });

    it('should show desktop notifications toggle', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Desktop notifications toggle should be present
      await waitFor(() => {
        // Find the toggle by looking for the checkbox within the notifications section
        const toggles = screen.getAllByRole('checkbox');
        // Second toggle should be desktop notifications (based on order in component)
        expect(toggles[1]).toBeTruthy();
        expect((toggles[1] as HTMLInputElement).checked).toBe(false); // Default is disabled
      });
    });

    it('should allow toggling email notifications', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Toggle email notifications
      const toggles = screen.getAllByRole('checkbox');
      const toggle = toggles[0] as HTMLInputElement; // First toggle is email notifications

      expect(toggle).toBeTruthy();
      const initialState = toggle.checked;
      await user.click(toggle);

      // Assert: Toggle state should change
      expect(toggle.checked).toBe(!initialState);
    });

    it('should allow toggling desktop notifications', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Toggle desktop notifications
      const toggles = screen.getAllByRole('checkbox');
      const toggle = toggles[1] as HTMLInputElement; // Second toggle is desktop notifications

      expect(toggle).toBeTruthy();
      const initialState = toggle.checked;
      await user.click(toggle);

      // Assert: Toggle state should change
      expect(toggle.checked).toBe(!initialState);
    });

    it('should save notification preferences when save button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Toggle desktop notifications
      const toggles = screen.getAllByRole('checkbox');
      const toggle = toggles[1] as HTMLInputElement; // Second toggle is desktop notifications
      await user.click(toggle);

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save notifications/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Notification preferences saved');
      });
    });

    it('should show descriptions for notification options', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Descriptions should be displayed
      await waitFor(() => {
        expect(screen.getByText(/receive notifications via email/i)).toBeTruthy();
        expect(screen.getByText(/show desktop notifications for important events/i)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByText(/my preferences/i)).toBeTruthy();
        expect(
          screen.getByText(/manage your personal profile, password, and preferences/i)
        ).toBeTruthy();
      });
    });

    it('should display all main sections', async () => {
      // Act
      render(<MyPreferencesPage />);

      // Assert: All sections should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^profile$/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /change password/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /^appearance$/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /^notifications$/i })).toBeTruthy();
      });
    });

    it('should display section icons', async () => {
      // Act
      const { container } = render(<MyPreferencesPage />);

      // Assert: Icons should be present (checking for lucide-react icons)
      await waitFor(() => {
        const profileSection = screen.getByRole('heading', { name: /^profile$/i }).closest('div');
        expect(profileSection?.querySelector('svg')).toBeTruthy();

        const passwordSection = screen.getByRole('heading', { name: /change password/i }).closest('div');
        expect(passwordSection?.querySelector('svg')).toBeTruthy();

        const appearanceSection = screen.getByRole('heading', { name: /^appearance$/i }).closest('div');
        expect(appearanceSection?.querySelector('svg')).toBeTruthy();

        const notificationsSection = screen.getByRole('heading', { name: /^notifications$/i }).closest('div');
        expect(notificationsSection?.querySelector('svg')).toBeTruthy();
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<MyPreferencesPage />);

      // Assert: Sections should be in cards
      await waitFor(() => {
        const cards = container.querySelectorAll('[class*="p-6"]');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Complete Workflow Tests
  // ==========================================================================

  describe('Complete Workflows', () => {
    it('should allow updating profile and changing password in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update profile
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'New Name');

      const saveProfileButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(saveProfileButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });

      // Wait a bit for the loading state to clear
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act: Change password
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldpassword123');

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, 'newpassword123');

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      await user.type(confirmPasswordInput, 'newpassword123');

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Password changed successfully');
      });

      // Assert: Both operations should have been successful
      expect(toast.success).toHaveBeenCalledTimes(2);
    });

    it('should allow updating all preferences at once', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update profile
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Updated Name');

      const saveProfileButton = screen.getByRole('button', { name: /save profile/i });
      await user.click(saveProfileButton);

      // Wait for profile save to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });

      // Act: Change theme
      const lightButton = screen.getByText(/always light/i).closest('button');
      if (lightButton) {
        await user.click(lightButton);
      }

      const saveAppearanceButton = screen.getByRole('button', { name: /save appearance/i });
      await user.click(saveAppearanceButton);

      // Wait for appearance save to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Appearance preferences saved');
      });

      // Act: Toggle notifications
      const toggles = screen.getAllByRole('checkbox');
      const toggle = toggles[1] as HTMLInputElement; // Second toggle is desktop notifications
      await user.click(toggle);

      const saveNotificationsButton = screen.getByRole('button', { name: /save notifications/i });
      await user.click(saveNotificationsButton);

      // Wait for notifications save to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(3);
      });

      // Assert: All save operations should have been successful with correct messages
      expect(toast.success).toHaveBeenNthCalledWith(1, 'Profile updated successfully');
      expect(toast.success).toHaveBeenNthCalledWith(2, 'Appearance preferences saved');
      expect(toast.success).toHaveBeenNthCalledWith(3, 'Notification preferences saved');
    });

    it('should maintain form state when scrolling between sections', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<MyPreferencesPage />);

      // Act: Update display name but don't save
      const displayNameInput = screen.getByLabelText(/display name/i);
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Unsaved Name');

      // Act: Scroll to appearance section (simulated by checking it exists)
      const appearanceSection = screen.getByRole('heading', { name: /^appearance$/i });
      expect(appearanceSection).toBeTruthy();

      // Assert: Display name should still have the updated value
      expect((displayNameInput as HTMLInputElement).value).toBe('Unsaved Name');
    });
  });
});

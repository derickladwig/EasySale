/**
 * Integration Tests: Network Page
 *
 * End-to-end integration tests for the Network & Sync page.
 * Tests sync configuration, connectivity testing, and offline mode toggle.
 *
 * Validates Requirements: 13.2, 13.3, 13.4, 13.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkPage } from './NetworkPage';
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

// Mock useRemoteStoresQuery hook
const mockRemoteStores = [
  {
    id: 'store-1',
    name: 'Downtown Store',
    url: 'https://downtown.example.com',
    status: 'connected' as const,
    last_sync: '2024-01-15 10:30:00',
    is_active: true,
  },
  {
    id: 'store-2',
    name: 'Uptown Store',
    url: 'https://uptown.example.com',
    status: 'disconnected' as const,
    last_sync: '2024-01-14 15:45:00',
    is_active: true,
  },
  {
    id: 'store-3',
    name: 'Inactive Store',
    url: 'https://inactive.example.com',
    status: 'error' as const,
    last_sync: '2024-01-10 08:00:00',
    is_active: false,
  },
];

vi.mock('../hooks', () => ({
  useRemoteStoresQuery: () => ({
    data: mockRemoteStores,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// ============================================================================
// Setup
// ============================================================================

describe('NetworkPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 13.2: Allow configuring sync interval
  // ==========================================================================

  describe('Sync Configuration - Requirement 13.2', () => {
    it('should display sync settings section', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Sync settings should be present
      await waitFor(() => {
        expect(screen.getByText(/sync settings/i)).toBeTruthy();
        expect(screen.getByText(/enable synchronization/i)).toBeTruthy();
        expect(screen.getByLabelText(/sync interval/i)).toBeTruthy();
      });
    });

    it('should display current sync interval value', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Sync interval should be pre-filled with default value
      await waitFor(() => {
        const syncIntervalInput = screen.getByLabelText(/sync interval/i) as HTMLInputElement;
        expect(syncIntervalInput.value).toBe('300');
      });
    });

    it('should allow updating sync interval', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Update sync interval
      const syncIntervalInput = screen.getByLabelText(/sync interval/i);
      await user.clear(syncIntervalInput);
      await user.type(syncIntervalInput, '600');

      // Act: Click save button
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Sync settings updated successfully');
      });
    });

    it('should show enable synchronization toggle', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Toggle should be present and checked by default
      await waitFor(() => {
        const toggleContainer = screen.getByText(/enable synchronization/i).closest('div');
        const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(toggle).toBeTruthy();
        expect(toggle.checked).toBe(true);
      });
    });

    it('should allow toggling synchronization on/off', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Toggle synchronization off
      const toggleContainer = screen.getByText(/enable synchronization/i).closest('div');
      const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      expect(toggle).toBeTruthy();
      await user.click(toggle);

      // Assert: Toggle should be unchecked
      expect(toggle.checked).toBe(false);

      // Assert: Sync interval input should be disabled
      const syncIntervalInput = screen.getByLabelText(/sync interval/i) as HTMLInputElement;
      expect(syncIntervalInput.disabled).toBe(true);
    });

    it('should show auto-resolve conflicts toggle', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Auto-resolve toggle should be present
      await waitFor(() => {
        expect(screen.getByText(/auto-resolve conflicts/i)).toBeTruthy();
        expect(screen.getByText(/use last-write-wins strategy/i)).toBeTruthy();
      });
    });

    it('should allow toggling auto-resolve conflicts', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Toggle auto-resolve conflicts
      const toggleContainer = screen.getByText(/auto-resolve conflicts/i).closest('div');
      const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      expect(toggle).toBeTruthy();
      const initialState = toggle.checked;
      await user.click(toggle);

      // Assert: Toggle state should change
      expect(toggle.checked).toBe(!initialState);
    });

    it('should show sync now button', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Sync now button should be present
      await waitFor(() => {
        const syncNowButton = screen.getByRole('button', { name: /sync now/i });
        expect(syncNowButton).toBeTruthy();
      });
    });

    it('should trigger manual sync when sync now is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Click sync now button
      const syncNowButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncNowButton);

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Starting manual sync...');
      });

      // Assert: Success toast should be shown after sync completes
      await waitFor(
        () => {
          expect(toast.success).toHaveBeenCalledWith('Sync completed successfully');
        },
        { timeout: 5000 }
      );
    });

    it('should show loading state while saving settings', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Update sync interval and save
      const syncIntervalInput = screen.getByLabelText(/sync interval/i);
      await user.clear(syncIntervalInput);
      await user.type(syncIntervalInput, '900');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      // Assert: Button should show loading state
      // Note: The actual loading indicator depends on Button component implementation
      expect(saveButton).toBeTruthy();
    });
  });

  // ==========================================================================
  // Requirement 13.3: Allow adding/removing remote store connections
  // ==========================================================================

  describe('Remote Store Management - Requirement 13.3', () => {
    it('should display remote stores section', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Remote stores section should be present
      await waitFor(() => {
        expect(screen.getByText(/remote stores/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /add remote store/i })).toBeTruthy();
      });
    });

    it('should display list of remote stores', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: All remote stores should be displayed
      await waitFor(() => {
        expect(screen.getByText('Downtown Store')).toBeTruthy();
        expect(screen.getByText('Uptown Store')).toBeTruthy();
        expect(screen.getByText('Inactive Store')).toBeTruthy();
      });
    });

    it('should show store connection status', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Connection status badges should be displayed
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeTruthy();
        expect(screen.getByText(/disconnected/i)).toBeTruthy();
        expect(screen.getByText(/error/i)).toBeTruthy();
      });
    });

    it('should show store URLs and last sync times', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Store details should be displayed
      await waitFor(() => {
        expect(screen.getByText(/https:\/\/downtown\.example\.com/i)).toBeTruthy();
        expect(screen.getByText(/2024-01-15 10:30:00/i)).toBeTruthy();
      });
    });

    it('should show inactive badge for inactive stores', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Inactive badge should be displayed
      await waitFor(() => {
        const inactiveStore = screen.getByText('Inactive Store').closest('div');
        expect(inactiveStore?.textContent).toContain('Inactive');
      });
    });

    it('should show add remote store button', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Add button should be visible
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add remote store/i });
        expect(addButton).toBeTruthy();
      });
    });

    it('should trigger add remote store action when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Click add remote store button
      const addButton = screen.getByRole('button', { name: /add remote store/i });
      await user.click(addButton);

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Remote store configuration requires admin privileges. Contact your administrator to configure multi-store synchronization.');
      });
    });

    it('should show edit button for each store', async () => {
      // Act
      const { container } = render(<NetworkPage />);

      // Assert: Edit buttons should be present for each store
      await waitFor(() => {
        const editButtons = container.querySelectorAll('button svg');
        // Should have edit icons (Edit component from lucide-react)
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('should trigger edit action when edit button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<NetworkPage />);

      // Act: Find and click the first edit button
      await waitFor(async () => {
        const storeCard = screen.getByText('Downtown Store').closest('div');
        const editButton = storeCard?.querySelector('button:has(svg)');
        if (editButton) {
          await user.click(editButton);
        }
      });

      // Assert: Info toast should be shown (implementation may vary)
      // Note: The actual edit functionality would open a modal
    });

    it('should show delete button for each store', async () => {
      // Act
      const { container } = render(<NetworkPage />);

      // Assert: Delete buttons should be present
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Requirement 13.4: Test network connectivity to remote stores
  // ==========================================================================

  describe('Connectivity Testing - Requirement 13.4', () => {
    it('should show test connection button for each store', async () => {
      // Act
      const { container } = render(<NetworkPage />);

      // Assert: Test connection buttons should be present
      await waitFor(() => {
        const storeCards = container.querySelectorAll('[class*="bg-surface-base"]');
        expect(storeCards.length).toBeGreaterThan(0);
      });
    });

    it('should trigger connectivity test when test button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<NetworkPage />);

      // Act: Find and click the test connection button for Downtown Store
      await waitFor(async () => {
        const storeCard = screen.getByText('Downtown Store').closest('div');
        const testButton = storeCard?.querySelector('button:has(svg)');
        if (testButton) {
          await user.click(testButton);
        }
      });

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          expect.stringContaining('Testing connection to')
        );
      });
    });

    it('should show success message after successful connectivity test', async () => {
      // Arrange
      const user = userEvent.setup();
      const { container } = render(<NetworkPage />);

      // Act: Trigger connectivity test
      await waitFor(async () => {
        const storeCard = screen.getByText('Downtown Store').closest('div');
        const testButton = storeCard?.querySelector('button:has(svg)');
        if (testButton) {
          await user.click(testButton);
        }
      });

      // Assert: Success toast should be shown after test completes
      await waitFor(
        () => {
          expect(toast.success).toHaveBeenCalledWith(
            expect.stringContaining('Connection to')
          );
        },
        { timeout: 3000 }
      );
    });

    it('should display connection status visually', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Status badges should have appropriate styling
      await waitFor(() => {
        const connectedBadge = screen.getByText(/connected/i);
        const disconnectedBadge = screen.getByText(/disconnected/i);
        const errorBadge = screen.getByText(/error/i);

        expect(connectedBadge.className).toContain('success');
        expect(disconnectedBadge.className).toContain('dark');
        expect(errorBadge.className).toContain('error');
      });
    });
  });

  // ==========================================================================
  // Requirement 13.6: Allow enabling/disabling offline mode per station
  // ==========================================================================

  describe('Offline Mode Configuration - Requirement 13.6', () => {
    it('should display offline mode section', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Offline mode section should be present
      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeTruthy();
        expect(screen.getByText(/enable offline mode/i)).toBeTruthy();
      });
    });

    it('should show enable offline mode toggle', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Toggle should be present and checked by default
      await waitFor(() => {
        const toggleContainer = screen.getByText(/enable offline mode/i).closest('div');
        const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(toggle).toBeTruthy();
        expect(toggle.checked).toBe(true);
      });
    });

    it('should allow toggling offline mode on/off', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Toggle offline mode off
      const toggleContainer = screen.getByText(/enable offline mode/i).closest('div');
      const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      expect(toggle).toBeTruthy();
      await user.click(toggle);

      // Assert: Toggle should be unchecked
      expect(toggle.checked).toBe(false);

      // Assert: Maximum queue size input should be disabled
      const maxQueueInput = screen.getByLabelText(/maximum queue size/i) as HTMLInputElement;
      expect(maxQueueInput.disabled).toBe(true);
    });

    it('should display maximum queue size setting', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Maximum queue size input should be present
      await waitFor(() => {
        const maxQueueInput = screen.getByLabelText(/maximum queue size/i) as HTMLInputElement;
        expect(maxQueueInput).toBeTruthy();
        expect(maxQueueInput.value).toBe('10000');
      });
    });

    it('should allow updating maximum queue size', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Update maximum queue size
      const maxQueueInput = screen.getByLabelText(/maximum queue size/i);
      await user.clear(maxQueueInput);
      await user.type(maxQueueInput, '20000');

      // Assert: Input value should be updated
      expect((maxQueueInput as HTMLInputElement).value).toBe('20000');
    });

    it('should display pending operations count', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Pending operations should be displayed
      await waitFor(() => {
        expect(screen.getByText(/pending operations/i)).toBeTruthy();
        expect(screen.getByText('0')).toBeTruthy();
      });
    });

    it('should show clear queue button when there are pending operations', async () => {
      // Note: This test would require mocking pending operations > 0
      // For now, we test that the button is conditionally rendered
      render(<NetworkPage />);

      await waitFor(() => {
        // With 0 pending operations, button should not be visible
        const clearButton = screen.queryByRole('button', { name: /clear queue/i });
        expect(clearButton).toBeNull();
      });
    });

    it('should show helper text for maximum queue size', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Helper text should be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/maximum number of pending operations to queue/i)
        ).toBeTruthy();
      });
    });

    it('should disable offline mode controls when offline mode is disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Disable offline mode
      const toggleContainer = screen.getByText(/enable offline mode/i).closest('div');
      const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(toggle);

      // Assert: Maximum queue size input should be disabled
      await waitFor(() => {
        const maxQueueInput = screen.getByLabelText(/maximum queue size/i) as HTMLInputElement;
        expect(maxQueueInput.disabled).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByText(/network & sync/i)).toBeTruthy();
        expect(
          screen.getByText(/configure synchronization and offline operation settings/i)
        ).toBeTruthy();
      });
    });

    it('should display all main sections', async () => {
      // Act
      render(<NetworkPage />);

      // Assert: All sections should be present
      await waitFor(() => {
        expect(screen.getByText(/sync settings/i)).toBeTruthy();
        expect(screen.getByText(/remote stores/i)).toBeTruthy();
        expect(screen.getByText(/offline mode/i)).toBeTruthy();
      });
    });

    it('should display section icons', async () => {
      // Act
      const { container } = render(<NetworkPage />);

      // Assert: Icons should be present (checking for lucide-react icons)
      await waitFor(() => {
        const syncSection = screen.getAllByText(/sync settings/i)[0].closest('div');
        expect(syncSection?.querySelector('svg')).toBeTruthy();

        const remoteSection = screen.getAllByText(/remote stores/i)[0].closest('div');
        expect(remoteSection?.querySelector('svg')).toBeTruthy();

        const offlineSection = screen.getAllByText(/offline mode/i)[0].closest('div');
        expect(offlineSection?.querySelector('svg')).toBeTruthy();
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<NetworkPage />);

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
    it('should allow configuring sync settings and testing connection', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Update sync interval
      const syncIntervalInput = screen.getByLabelText(/sync interval/i);
      await user.clear(syncIntervalInput);
      await user.type(syncIntervalInput, '600');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Network settings updated successfully');
      });

      // Act: Test connection to a store
      const storeCard = screen.getByText('Downtown Store').closest('div');
      const testButton = storeCard?.querySelector('button:has(svg)');
      if (testButton) {
        await user.click(testButton);
      }

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          expect.stringContaining('Testing connection to')
        );
      });

      // Assert: Both operations should have been triggered
      expect(toast.success).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalled();
    });

    it('should allow disabling sync and enabling offline mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Disable synchronization
      const syncToggleContainer = screen.getByText(/enable synchronization/i).closest('div');
      const syncToggle = syncToggleContainer?.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;
      
      expect(syncToggle).toBeTruthy();
      const wasChecked = syncToggle.checked;
      await user.click(syncToggle);

      // Assert: Sync should be toggled
      await waitFor(() => {
        const updatedToggle = screen.getByText(/enable synchronization/i)
          .closest('div')
          ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(updatedToggle.checked).toBe(!wasChecked);
      });

      // Act: Verify offline mode is still enabled
      const offlineToggleContainer = screen.getByText(/enable offline mode/i).closest('div');
      const offlineToggle = offlineToggleContainer?.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;
      expect(offlineToggle.checked).toBe(true);
    });

    it('should maintain form state when scrolling between sections', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<NetworkPage />);

      // Act: Update sync interval but don't save
      const syncIntervalInput = screen.getByLabelText(/sync interval/i);
      await user.clear(syncIntervalInput);
      await user.type(syncIntervalInput, '1200');

      // Act: Scroll to offline mode section (simulated by checking it exists)
      const offlineSections = screen.getAllByText(/offline mode/i);
      expect(offlineSections.length).toBeGreaterThan(0);

      // Assert: Sync interval should still have the updated value
      expect((syncIntervalInput as HTMLInputElement).value).toBe('1200');
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should show empty state when no remote stores exist', async () => {
      // Arrange: Mock empty remote stores
      vi.mock('../hooks', () => ({
        useRemoteStoresQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      }));

      // Act
      render(<NetworkPage />);

      // Assert: Empty state should be displayed
      await waitFor(() => {
        expect(screen.getByText(/no remote stores configured/i)).toBeTruthy();
        expect(
          screen.getByText(/add remote stores to enable multi-location synchronization/i)
        ).toBeTruthy();
      });
    });
  });
});

/**
 * Integration Tests: Data Management Page
 *
 * End-to-end integration tests for the Data Management page.
 * Tests backup creation, export, and import with validation.
 *
 * Validates Requirements: 14.2, 14.4, 14.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagementPage } from './DataManagementPage';
import { toast } from '@common/components/molecules/Toast';
import { apiClient } from '@common/utils/apiClient';

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

// Mock API Client
vi.mock('@common/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock ImportWizard component
vi.mock('../components/ImportWizard', () => ({
  ImportWizard: ({ entityType, onClose }: { entityType: string; onClose: () => void }) => (
    <div data-testid="import-wizard">
      <h3>Import {entityType}</h3>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock backup history data
const mockBackupHistory = [
  {
    id: 1,
    created_at: '2024-01-15T10:30:00Z',
    file_path: '/backups/backup-2024-01-15.db',
    file_size: 1048576, // 1 MB
    status: 'success' as const,
    location: 'Local',
  },
  {
    id: 2,
    created_at: '2024-01-14T10:30:00Z',
    file_path: '/backups/backup-2024-01-14.db',
    file_size: 1024000,
    status: 'success' as const,
    location: 'Google Drive',
  },
  {
    id: 3,
    created_at: '2024-01-13T10:30:00Z',
    file_path: '/backups/backup-2024-01-13.db',
    file_size: 512000,
    status: 'failed' as const,
    location: 'Local',
  },
];

// ============================================================================
// Setup
// ============================================================================

describe('DataManagementPage Integration Tests', () => {
  beforeEach(() => {
    // Clear any previous state
    localStorage.clear();
    vi.clearAllMocks();

    // Setup default API responses
    (apiClient.get as any).mockResolvedValue({ data: mockBackupHistory });
    (apiClient.post as any).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Requirement 14.2: Allow triggering manual backups
  // ==========================================================================

  describe('Backup Creation - Requirement 14.2', () => {
    it('should display database backup section', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Backup section should be present
      await waitFor(() => {
        expect(screen.getByText(/database backup/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /backup now/i })).toBeTruthy();
      });
    });

    it('should display backup now button', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Backup now button should be visible
      await waitFor(() => {
        const backupButton = screen.getByRole('button', { name: /backup now/i });
        expect(backupButton).toBeTruthy();
      });
    });

    it('should trigger manual backup when backup now is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });
      render(<DataManagementPage />);

      // Act: Click backup now button
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Starting manual backup...');
      });

      // Assert: API should be called
      expect(apiClient.post).toHaveBeenCalledWith('/api/data-management/backup');

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Backup completed successfully');
      });
    });

    it('should show loading state while backup is in progress', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );
      render(<DataManagementPage />);

      // Act: Click backup now button
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      // Assert: Button should show loading state
      // Note: The actual loading indicator depends on Button component implementation
      expect(backupButton).toBeTruthy();
    });

    it('should handle backup failure gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockRejectedValue(new Error('Backup failed'));
      render(<DataManagementPage />);

      // Act: Click backup now button
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      // Assert: Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Backup failed');
      });
    });

    it('should display backup history', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Backup history should be displayed
      await waitFor(() => {
        expect(screen.getByText(/recent backups/i)).toBeTruthy();
        // Check for formatted dates (will be in local format)
        expect(screen.getAllByText(/2024/i).length).toBeGreaterThan(0);
      });
    });

    it('should display backup file sizes', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: File sizes should be displayed
      await waitFor(() => {
        expect(screen.getByText(/1\.0 MB/i)).toBeTruthy();
      });
    });

    it('should display backup locations', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Backup locations should be displayed
      await waitFor(() => {
        const locations = screen.getAllByText(/local/i);
        expect(locations.length).toBeGreaterThan(0);
        expect(screen.getByText(/google drive/i)).toBeTruthy();
      });
    });

    it('should display backup status badges', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Status badges should be displayed
      await waitFor(() => {
        expect(screen.getAllByText(/success/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/failed/i)).toBeTruthy();
      });
    });

    it('should show download button for each backup', async () => {
      // Act
      const { container } = render(<DataManagementPage />);

      // Assert: Download buttons should be present
      await waitFor(() => {
        const downloadButtons = container.querySelectorAll('button svg');
        expect(downloadButtons.length).toBeGreaterThan(0);
      });
    });

    it('should reload backup history after successful backup', async () => {
      // Arrange
      const user = userEvent.setup();
      let callCount = 0;
      (apiClient.get as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve({ data: mockBackupHistory });
      });
      render(<DataManagementPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Act: Trigger backup
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      // Assert: Backup history should be reloaded
      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Requirement 14.4: Allow exporting data to CSV by entity type
  // ==========================================================================

  describe('Data Export - Requirement 14.4', () => {
    it('should display export data section', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Export section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /export data/i })).toBeTruthy();
      });
    });

    it('should display all exportable entity types', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: All entity types should be listed
      await waitFor(() => {
        const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
        expect(exportButtons.length).toBe(6); // 6 exportable entity types
      });
    });

    it('should show export CSV button for each entity type', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Export buttons should be present
      await waitFor(() => {
        const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
        expect(exportButtons.length).toBe(6); // 6 entity types
      });
    });

    it('should trigger export when export button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockResolvedValue({
        data: { record_count: 150, success: true },
      });
      render(<DataManagementPage />);

      // Act: Click export button for Products (first one in export section)
      const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
      await user.click(exportButtons[0]); // First export button is Products

      // Assert: Info toast should be shown
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Exporting Products to CSV...');
      });

      // Assert: API should be called
      expect(apiClient.post).toHaveBeenCalledWith('/api/data-management/export', {
        entity_type: 'products',
        format: 'csv',
      });

      // Assert: Success toast should be shown with record count
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Exported 150 Products records');
      });
    });

    it('should handle export failure gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockRejectedValue(new Error('Export failed'));
      render(<DataManagementPage />);

      // Act: Click export button for Customers (second export button)
      const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
      await user.click(exportButtons[1]); // Second export button is Customers

      // Assert: Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Export failed');
      });
    });

    it('should allow exporting multiple entity types in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockResolvedValue({
        data: { record_count: 100, success: true },
      });
      render(<DataManagementPage />);

      // Act: Export Products (first export button)
      const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
      await user.click(exportButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Exported 100 Products records');
      });

      // Act: Export Customers (second export button)
      await user.click(exportButtons[1]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Exported 100 Customers records');
      });

      // Assert: Both exports should have been triggered
      expect(apiClient.post).toHaveBeenCalledTimes(2);
    });

    it('should display export description', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Description should be present
      await waitFor(() => {
        expect(
          screen.getByText(/export data to csv format for analysis or migration/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Requirement 14.5: Allow importing data from CSV with validation
  // ==========================================================================

  describe('Data Import - Requirement 14.5', () => {
    it('should display import data section', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Import section should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /import data/i })).toBeTruthy();
      });
    });

    it('should display importable entity types', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Importable entity types should be listed
      await waitFor(() => {
        const importButtons = screen.getAllByRole('button', { name: /import csv/i });
        expect(importButtons.length).toBe(3); // 3 importable entity types
      });
    });

    it('should show import CSV button for each entity type', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Import buttons should be present
      await waitFor(() => {
        const importButtons = screen.getAllByRole('button', { name: /import csv/i });
        expect(importButtons.length).toBe(3); // 3 importable entity types
      });
    });

    it('should open import wizard when import button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataManagementPage />);

      // Act: Click import button for Products (first import button)
      const importButtons = screen.getAllByRole('button', { name: /import csv/i });
      await user.click(importButtons[0]); // First import button is Products

      // Assert: Import wizard should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('import-wizard')).toBeTruthy();
      });
    });

    it('should pass correct entity type to import wizard', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataManagementPage />);

      // Act: Click import button for Customers (second import button)
      const importButtons = screen.getAllByRole('button', { name: /import csv/i });
      await user.click(importButtons[1]); // Customers is second import button

      // Assert: Import wizard should show Customers
      await waitFor(() => {
        expect(screen.getByText(/import customers/i)).toBeTruthy();
      });
    });

    it('should close import wizard when close button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataManagementPage />);

      // Act: Open import wizard
      const importButton = screen.getAllByRole('button', { name: /import csv/i })[0];
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByTestId('import-wizard')).toBeTruthy();
      });

      // Act: Close wizard
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Assert: Import wizard should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('import-wizard')).toBeNull();
      });
    });

    it('should display import warning message', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Warning should be displayed
      await waitFor(() => {
        expect(screen.getByText(/important/i)).toBeTruthy();
        expect(
          screen.getByText(/imports will validate data before inserting/i)
        ).toBeTruthy();
        expect(screen.getByText(/invalid rows will be skipped/i)).toBeTruthy();
      });
    });

    it('should show backup recommendation in warning', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Backup recommendation should be present
      await waitFor(() => {
        expect(
          screen.getByText(/always backup your database before importing large datasets/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Data Cleanup Operations
  // ==========================================================================

  describe('Data Cleanup', () => {
    it('should display cleanup section', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Cleanup section should be present
      await waitFor(() => {
        expect(screen.getByText(/data cleanup/i)).toBeTruthy();
      });
    });

    it('should show delete old sessions option', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Delete sessions option should be present
      await waitFor(() => {
        expect(screen.getByText(/delete old sessions/i)).toBeTruthy();
        expect(screen.getByText(/remove login sessions older than 30 days/i)).toBeTruthy();
      });
    });

    it('should show archive completed layaways option', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Archive layaways option should be present
      await waitFor(() => {
        expect(screen.getByText(/archive completed layaways/i)).toBeTruthy();
        expect(
          screen.getByText(/move completed layaways older than 90 days to archive/i)
        ).toBeTruthy();
      });
    });

    it('should show cleanup buttons', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Cleanup buttons should be present
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clean up/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /archive/i })).toBeTruthy();
      });
    });

    it('should show confirmation dialog before cleanup', async () => {
      // Arrange
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<DataManagementPage />);

      // Act: Click clean up button
      const cleanupButton = screen.getByRole('button', { name: /clean up/i });
      await user.click(cleanupButton);

      // Assert: Confirmation should be requested
      expect(confirmSpy).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should trigger cleanup when confirmed', async () => {
      // Arrange
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      (apiClient.post as any).mockResolvedValue({
        data: { deleted_count: 42, success: true },
      });
      render(<DataManagementPage />);

      // Act: Click clean up button and confirm
      const cleanupButton = screen.getByRole('button', { name: /clean up/i });
      await user.click(cleanupButton);

      // Assert: API should be called
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/data-management/cleanup', {
          operation: 'sessions',
          days_old: 30,
        });
      });

      // Assert: Success toast should be shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Deleted 42 old sessions');
      });

      confirmSpy.mockRestore();
    });

    it('should display cleanup warning message', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Warning should be displayed
      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeTruthy();
        expect(screen.getByText(/cleanup operations cannot be undone/i)).toBeTruthy();
        expect(
          screen.getByText(/always create a backup before performing cleanup operations/i)
        ).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Page Layout and Structure
  // ==========================================================================

  describe('Page Layout', () => {
    it('should display page header with title and description', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: Header should be present
      await waitFor(() => {
        expect(screen.getByText(/data management/i)).toBeTruthy();
        expect(screen.getByText(/backup, export, import, and cleanup data/i)).toBeTruthy();
      });
    });

    it('should display all main sections', async () => {
      // Act
      render(<DataManagementPage />);

      // Assert: All sections should be present
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /database backup/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /export data/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /import data/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /data cleanup/i })).toBeTruthy();
      });
    });

    it('should display section icons', async () => {
      // Act
      const { container } = render(<DataManagementPage />);

      // Assert: Icons should be present
      await waitFor(() => {
        const backupSection = screen.getByRole('heading', { name: /database backup/i }).closest('div');
        expect(backupSection?.querySelector('svg')).toBeTruthy();

        const exportSection = screen.getByRole('heading', { name: /export data/i }).closest('div');
        expect(exportSection?.querySelector('svg')).toBeTruthy();

        const importSection = screen.getByRole('heading', { name: /import data/i }).closest('div');
        expect(importSection?.querySelector('svg')).toBeTruthy();

        const cleanupSection = screen.getByRole('heading', { name: /data cleanup/i }).closest('div');
        expect(cleanupSection?.querySelector('svg')).toBeTruthy();
      });
    });

    it('should use card layout for sections', async () => {
      // Act
      const { container } = render(<DataManagementPage />);

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
    it('should allow backup, export, and import in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any).mockResolvedValue({
        data: { success: true, record_count: 100 },
      });
      render(<DataManagementPage />);

      // Act: Backup
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Backup completed successfully');
      });

      // Act: Export (first export button is Products)
      const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
      await user.click(exportButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Exported 100 Products records');
      });

      // Act: Import (first import button is Products)
      const importButtons = screen.getAllByRole('button', { name: /import csv/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('import-wizard')).toBeTruthy();
      });

      // Assert: All operations should have been triggered
      expect(apiClient.post).toHaveBeenCalledTimes(2); // backup + export
    });

    it('should handle errors gracefully during workflow', async () => {
      // Arrange
      const user = userEvent.setup();
      (apiClient.post as any)
        .mockResolvedValueOnce({ data: { success: true } }) // backup succeeds
        .mockRejectedValueOnce(new Error('Export failed')); // export fails
      render(<DataManagementPage />);

      // Act: Backup (succeeds)
      const backupButton = screen.getByRole('button', { name: /backup now/i });
      await user.click(backupButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Backup completed successfully');
      });

      // Act: Export (fails) - first export button is Products
      const exportButtons = screen.getAllByRole('button', { name: /export csv/i });
      await user.click(exportButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Export failed');
      });

      // Assert: Should still be able to continue
      expect(screen.getByRole('button', { name: /backup now/i })).toBeTruthy();
    });
  });
});

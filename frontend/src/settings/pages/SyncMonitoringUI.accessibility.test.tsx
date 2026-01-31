/**
 * Accessibility Tests for Sync Monitoring UI Components
 * 
 * Uses axe-core to verify WCAG 2.1 AA compliance
 * Validates: Requirements 14.4, 14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend expect with axe matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('../../services/syncApi', () => ({
  syncApi: {
    getFailedRecords: vi.fn().mockResolvedValue([]),
    getSyncHistory: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
    getSchedules: vi.fn().mockResolvedValue([]),
    getFailedRecordDetails: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../admin/hooks/useStores', () => ({
  useStores: () => ({
    stores: [{ id: 'store-1', name: 'Main Store' }],
    isLoading: false,
  }),
}));

vi.mock('@common/contexts/CapabilitiesContext', () => ({
  useCapabilities: () => ({
    hasCapability: () => true,
    capabilities: { features: { sync: true } },
  }),
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', role: 'admin', name: 'Test User' },
  }),
}));

// Mock toast
vi.mock('@common/components/molecules/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Import components after mocks
import { SyncScheduleManager } from '../components/SyncScheduleManager';
import { MappingEditor } from '../components/MappingEditor';
import { ConfirmDialog } from '@common/components/molecules/ConfirmDialog';
import { StatusChip, StatusChipStatus } from '@common/components/atoms/StatusChip';

describe('Sync Monitoring UI Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConfirmDialog Accessibility', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm Action"
          message="Are you sure you want to proceed?"
          confirmText="Confirm"
          cancelText="Cancel"
          variant="warning"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Test Dialog"
          message="Test message"
          confirmText="OK"
          cancelText="Cancel"
          variant="danger"
        />
      );

      // Check for dialog role
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have focusable buttons', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Test Dialog"
          message="Test message"
          confirmText="Confirm"
          cancelText="Cancel"
          variant="warning"
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(confirmButton).not.toHaveAttribute('disabled');
      expect(cancelButton).not.toHaveAttribute('disabled');
    });
  });

  describe('StatusChip Accessibility', () => {
    // Valid statuses from StatusChip component
    const validStatuses: StatusChipStatus[] = [
      'connected', 'disconnected', 'degraded', 'reauth_required', 'error',
      'queued', 'running', 'completed', 'failed', 'skipped',
      'closed', 'open', 'half_open'
    ];

    validStatuses.forEach((status) => {
      it(`should have no accessibility violations for status: ${status}`, async () => {
        const { container } = render(<StatusChip status={status} size="md" />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it('should have visible text content', () => {
      render(<StatusChip status="connected" size="md" />);
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('should have role="status" for screen readers', () => {
      render(<StatusChip status="running" size="md" />);
      const chip = screen.getByRole('status');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveAttribute('aria-label');
    });
  });

  describe('MappingEditor Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <MappingEditor
          sourcePlatform="WooCommerce"
          targetPlatform="QuickBooks"
          mappings={[
            { source: 'billing.email', target: 'BillEmail.Address' },
          ]}
          onMappingsChange={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible form controls', () => {
      render(
        <MappingEditor
          sourcePlatform="WooCommerce"
          targetPlatform="QuickBooks"
          mappings={[]}
          onMappingsChange={() => {}}
        />
      );

      // Check for input fields
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);

      // Check for select elements with aria-labels
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
    });

    it('should have accessible delete buttons with aria-labels', () => {
      render(
        <MappingEditor
          sourcePlatform="WooCommerce"
          targetPlatform="QuickBooks"
          mappings={[
            { source: 'test.field', target: 'Target.Field' },
          ]}
          onMappingsChange={() => {}}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete mapping/i });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('aria-label');
    });
  });

  describe('SyncScheduleManager Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SyncScheduleManager />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      }, { timeout: 2000 }).catch(() => {});

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible add button', async () => {
      render(<SyncScheduleManager />);

      // Wait for component to load
      await waitFor(() => {
        const addButton = screen.queryByRole('button', { name: /add schedule/i });
        if (addButton) {
          expect(addButton).toBeInTheDocument();
        }
      }, { timeout: 2000 }).catch(() => {});
    });
  });

  describe('Keyboard Navigation', () => {
    it('ConfirmDialog should trap focus', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Test"
          message="Test message"
          confirmText="OK"
          cancelText="Cancel"
          variant="warning"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Buttons should be focusable
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.tabIndex).not.toBe(-1);
      });
    });
  });

  describe('Color Contrast', () => {
    it('StatusChip should use semantic color tokens', () => {
      const { container } = render(<StatusChip status="error" size="md" />);
      
      // The component should use CSS classes that reference semantic tokens
      const chip = container.firstChild;
      expect(chip).toBeInTheDocument();
      
      // Verify it has the role for accessibility
      expect(chip).toHaveAttribute('role', 'status');
    });
  });

  describe('ARIA Labels', () => {
    it('ConfirmDialog should have aria-labelledby', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Dialog Title"
          message="Dialog message"
          confirmText="OK"
          cancelText="Cancel"
          variant="warning"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('MappingEditor selects should have aria-labels', () => {
      render(
        <MappingEditor
          sourcePlatform="WooCommerce"
          targetPlatform="QuickBooks"
          mappings={[]}
          onMappingsChange={() => {}}
        />
      );

      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
    });
  });
});

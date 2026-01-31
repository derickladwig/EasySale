/**
 * Property-Based Test: StatusChip Visual Indicators
 * 
 * Feature: sync-monitoring-ui
 * Property 2: Sync Status Visual Indicators
 * 
 * **Validates: Requirements 2.3, 2.4**
 * 
 * For any sync run status (queued/running/completed/failed/skipped), the StatusChip
 * component SHALL display the correct icon and semantic color token: running shows
 * spinning indicator with primary color, completed shows checkmark with success color,
 * failed shows X with error color.
 * 
 * Framework: fast-check
 * Minimum iterations: 100
 */

import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusChip, type StatusChipStatus } from './StatusChip';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate arbitrary connector statuses
 */
const connectorStatus = fc.constantFrom<StatusChipStatus>(
  'connected',
  'disconnected',
  'degraded',
  'reauth_required',
  'error'
);

/**
 * Generate arbitrary sync run statuses
 */
const syncRunStatus = fc.constantFrom<StatusChipStatus>(
  'queued',
  'running',
  'completed',
  'failed',
  'skipped'
);

/**
 * Generate arbitrary circuit breaker states
 */
const circuitBreakerState = fc.constantFrom<StatusChipStatus>(
  'closed',
  'open',
  'half_open'
);

/**
 * Generate any valid status
 */
const anyStatus = fc.oneof(connectorStatus, syncRunStatus, circuitBreakerState);

/**
 * Generate arbitrary size
 */
const chipSize = fc.constantFrom<'sm' | 'md'>('sm', 'md');

// ============================================================================
// Expected Color Mappings
// ============================================================================

/**
 * Expected background color classes for each status
 */
const expectedBgColors: Record<StatusChipStatus, string> = {
  // Success states - green
  connected: 'bg-success-500/20',
  completed: 'bg-success-500/20',
  closed: 'bg-success-500/20',
  // Error states - red
  error: 'bg-error-500/20',
  failed: 'bg-error-500/20',
  open: 'bg-error-500/20',
  // Warning states - yellow/orange
  degraded: 'bg-warning-500/20',
  reauth_required: 'bg-warning-500/20',
  half_open: 'bg-warning-500/20',
  // Primary states - blue
  running: 'bg-primary-500/20',
  // Muted states - gray
  disconnected: 'bg-surface-elevated',
  queued: 'bg-surface-elevated',
  skipped: 'bg-surface-elevated',
};

/**
 * Expected text color classes for each status
 */
const expectedTextColors: Record<StatusChipStatus, string> = {
  // Success states - green
  connected: 'text-success-400',
  completed: 'text-success-400',
  closed: 'text-success-400',
  // Error states - red
  error: 'text-error-400',
  failed: 'text-error-400',
  open: 'text-error-400',
  // Warning states - yellow/orange
  degraded: 'text-warning-400',
  reauth_required: 'text-warning-400',
  half_open: 'text-warning-400',
  // Primary states - blue
  running: 'text-primary-400',
  // Muted states - gray
  disconnected: 'text-text-tertiary',
  queued: 'text-text-tertiary',
  skipped: 'text-text-tertiary',
};

/**
 * Expected labels for each status
 */
const expectedLabels: Record<StatusChipStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  degraded: 'Degraded',
  reauth_required: 'Re-auth Required',
  error: 'Error',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
  closed: 'Healthy',
  open: 'Circuit Open',
  half_open: 'Recovering',
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Property 2: Sync Status Visual Indicators', () => {
  // Clean up after each test to prevent DOM pollution
  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Core Property: Correct color tokens for each status
  // ==========================================================================

  describe('Core Property: Status maps to correct semantic color tokens', () => {
    it('should render with correct background color class for any status', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip).not.toBeNull();
          expect(chip?.className).toContain(expectedBgColors[status]);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should render with correct text color class for any status', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip).not.toBeNull();
          expect(chip?.className).toContain(expectedTextColors[status]);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Running status shows spinning indicator
  // ==========================================================================

  describe('Property: Running status shows spinning indicator', () => {
    it('should show animate-spin class only for running status', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} showIcon />);
          const svg = container.querySelector('svg');
          
          if (status === 'running') {
            // Running should have animate-spin
            expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('animate-spin');
          } else {
            // Other statuses should NOT have animate-spin
            const className = svg?.className.baseVal || svg?.getAttribute('class') || '';
            expect(className).not.toContain('animate-spin');
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Correct labels for each status
  // ==========================================================================

  describe('Property: Correct labels for each status', () => {
    it('should display correct label text for any status', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          render(<StatusChip status={status} showLabel />);
          
          // Check that the expected label is in the document
          expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should use custom label when provided', () => {
      fc.assert(
        fc.property(anyStatus, fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), (status, customLabel) => {
          cleanup(); // Clean up before each iteration
          render(<StatusChip status={status} label={customLabel} showLabel />);
          
          // Custom label should be displayed
          expect(screen.getByText(customLabel)).toBeInTheDocument();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Size variants work correctly
  // ==========================================================================

  describe('Property: Size variants apply correct classes', () => {
    it('should apply correct size classes', () => {
      fc.assert(
        fc.property(anyStatus, chipSize, (status, size) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} size={size} />);
          const chip = container.querySelector('span[role="status"]');
          
          if (size === 'sm') {
            expect(chip?.className).toContain('text-xs');
            expect(chip?.className).toContain('px-2');
          } else {
            expect(chip?.className).toContain('text-sm');
            expect(chip?.className).toContain('px-2.5');
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Icon visibility control
  // ==========================================================================

  describe('Property: Icon visibility is controllable', () => {
    it('should show icon when showIcon is true', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} showIcon />);
          const svg = container.querySelector('svg');
          
          expect(svg).not.toBeNull();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should hide icon when showIcon is false', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} showIcon={false} />);
          const svg = container.querySelector('svg');
          
          expect(svg).toBeNull();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Label visibility control
  // ==========================================================================

  describe('Property: Label visibility is controllable', () => {
    it('should show label when showLabel is true', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          render(<StatusChip status={status} showLabel />);
          
          expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should hide label when showLabel is false', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          render(<StatusChip status={status} showLabel={false} />);
          
          // Label should not be visible (but aria-label should still exist)
          expect(screen.queryByText(expectedLabels[status])).toBeNull();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Accessibility
  // ==========================================================================

  describe('Property: Accessibility attributes are correct', () => {
    it('should have role="status" for all statuses', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip).not.toBeNull();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should have aria-label with status text', () => {
      fc.assert(
        fc.property(anyStatus, (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip?.getAttribute('aria-label')).toBe(expectedLabels[status]);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property: Status category groupings
  // ==========================================================================

  describe('Property: Status categories have consistent colors', () => {
    it('should use success colors for positive statuses', () => {
      const successStatuses: StatusChipStatus[] = ['connected', 'completed', 'closed'];
      
      fc.assert(
        fc.property(fc.constantFrom(...successStatuses), (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip?.className).toContain('bg-success-500/20');
          expect(chip?.className).toContain('text-success-400');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should use error colors for negative statuses', () => {
      const errorStatuses: StatusChipStatus[] = ['error', 'failed', 'open'];
      
      fc.assert(
        fc.property(fc.constantFrom(...errorStatuses), (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip?.className).toContain('bg-error-500/20');
          expect(chip?.className).toContain('text-error-400');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should use warning colors for caution statuses', () => {
      const warningStatuses: StatusChipStatus[] = ['degraded', 'reauth_required', 'half_open'];
      
      fc.assert(
        fc.property(fc.constantFrom(...warningStatuses), (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip?.className).toContain('bg-warning-500/20');
          expect(chip?.className).toContain('text-warning-400');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should use muted colors for neutral statuses', () => {
      const mutedStatuses: StatusChipStatus[] = ['disconnected', 'queued', 'skipped'];
      
      fc.assert(
        fc.property(fc.constantFrom(...mutedStatuses), (status) => {
          cleanup(); // Clean up before each iteration
          const { container } = render(<StatusChip status={status} />);
          const chip = container.querySelector('span[role="status"]');
          
          expect(chip?.className).toContain('bg-surface-elevated');
          expect(chip?.className).toContain('text-text-tertiary');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});

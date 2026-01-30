/**
 * @deprecated QUARANTINED - 2026-01-26
 * 
 * Tests for the quarantined SettingsPage component.
 * These tests are preserved for historical reference only.
 * 
 * DO NOT RUN THESE TESTS - they test deprecated functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// Mock the toast context
vi.mock('../../../common/contexts/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe.skip('SettingsPage (DEPRECATED)', () => {
  it('should render without crashing', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Personal Preferences')).toBeTruthy();
  });

  it('should display settings layout with sidebar', () => {
    render(<SettingsPage />);
    expect(screen.getByPlaceholderText('Search settings...')).toBeTruthy();
  });

  it('should display personal settings by default', () => {
    render(<SettingsPage />);
    // Personal settings should be visible
    expect(screen.getByText('Personal Preferences')).toBeTruthy();
  });
});

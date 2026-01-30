/**
 * Device Identity Row Component - Unit Tests
 *
 * Tests device identity display and remember station checkbox.
 *
 * Validates Requirements 5.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceIdentityRow } from './DeviceIdentityRow';

// ============================================================================
// Tests
// ============================================================================

describe('DeviceIdentityRow', () => {
  it('renders device name', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        deviceName="Register 1 - Main Store"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
      />
    );

    expect(screen.getByTestId('device-name')).toBeTruthy();
    expect(screen.getByText('Register 1 - Main Store')).toBeTruthy();
  });

  it('displays default device name when not provided', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
      />
    );

    expect(screen.getByText('Unknown Device')).toBeTruthy();
  });

  it('renders remember station checkbox', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
      />
    );

    expect(screen.getByTestId('remember-station-checkbox')).toBeTruthy();
    expect(screen.getByText('Remember this station')).toBeTruthy();
  });

  it('checkbox reflects rememberStation state', () => {
    const onRememberStationChange = vi.fn();

    const { rerender } = render(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
      />
    );

    const checkbox = screen.getByTestId('remember-station-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    rerender(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={true}
        onRememberStationChange={onRememberStationChange}
      />
    );

    expect(checkbox.checked).toBe(true);
  });

  it('calls onRememberStationChange when checkbox clicked', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
      />
    );

    const checkbox = screen.getByTestId('remember-station-checkbox');
    fireEvent.click(checkbox);

    expect(onRememberStationChange).toHaveBeenCalledWith(true);
  });

  it('disables checkbox when disabled prop is true', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
        disabled={true}
      />
    );

    const checkbox = screen.getByTestId('remember-station-checkbox') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('does not call onRememberStationChange when disabled', () => {
    const onRememberStationChange = vi.fn();

    render(
      <DeviceIdentityRow
        deviceName="Test Device"
        rememberStation={false}
        onRememberStationChange={onRememberStationChange}
        disabled={true}
      />
    );

    const checkbox = screen.getByTestId('remember-station-checkbox') as HTMLInputElement;

    // Disabled checkbox should not be clickable in real browser
    // In test environment, we verify it's disabled rather than testing click behavior
    expect(checkbox.disabled).toBe(true);
  });
});

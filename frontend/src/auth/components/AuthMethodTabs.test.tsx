/**
 * Auth Method Tabs Component - Unit Tests
 *
 * Tests authentication method tab switching.
 *
 * Validates Requirements 5.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthMethodTabs } from './AuthMethodTabs';
import type { AuthMethod } from '../theme/types';

// ============================================================================
// Tests
// ============================================================================

describe('AuthMethodTabs', () => {
  it('renders all configured methods as tabs', () => {
    const methods: AuthMethod[] = ['password', 'pin', 'badge'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="password" onMethodChange={onMethodChange} />
    );

    expect(screen.getByTestId('auth-method-tab-password')).toBeTruthy();
    expect(screen.getByTestId('auth-method-tab-pin')).toBeTruthy();
    expect(screen.getByTestId('auth-method-tab-badge')).toBeTruthy();
  });

  it('marks current method as active', () => {
    const methods: AuthMethod[] = ['password', 'pin'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="pin" onMethodChange={onMethodChange} />
    );

    const pinTab = screen.getByTestId('auth-method-tab-pin');
    expect(pinTab.getAttribute('aria-selected')).toBe('true');
    expect(pinTab.className).toContain('auth-method-tabs__tab--active');
  });

  it('calls onMethodChange when tab clicked', () => {
    const methods: AuthMethod[] = ['password', 'pin'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="password" onMethodChange={onMethodChange} />
    );

    const pinTab = screen.getByTestId('auth-method-tab-pin');
    fireEvent.click(pinTab);

    expect(onMethodChange).toHaveBeenCalledWith('pin');
  });

  it('does not render when only one method available', () => {
    const methods: AuthMethod[] = ['password'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="password" onMethodChange={onMethodChange} />
    );

    expect(screen.queryByTestId('auth-method-tabs')).toBeFalsy();
  });

  it('disables tabs when disabled prop is true', () => {
    const methods: AuthMethod[] = ['password', 'pin'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs
        methods={methods}
        currentMethod="password"
        onMethodChange={onMethodChange}
        disabled={true}
      />
    );

    const passwordTab = screen.getByTestId('auth-method-tab-password') as HTMLButtonElement;
    const pinTab = screen.getByTestId('auth-method-tab-pin') as HTMLButtonElement;

    expect(passwordTab.disabled).toBe(true);
    expect(pinTab.disabled).toBe(true);
  });

  it('displays correct labels for each method', () => {
    const methods: AuthMethod[] = ['password', 'pin', 'badge'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="password" onMethodChange={onMethodChange} />
    );

    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByText('PIN')).toBeTruthy();
    expect(screen.getByText('Badge')).toBeTruthy();
  });

  it('has proper ARIA attributes for accessibility', () => {
    const methods: AuthMethod[] = ['password', 'pin'];
    const onMethodChange = vi.fn();

    render(
      <AuthMethodTabs methods={methods} currentMethod="password" onMethodChange={onMethodChange} />
    );

    const tablist = screen.getByTestId('auth-method-tabs');
    expect(tablist.getAttribute('role')).toBe('tablist');
    expect(tablist.getAttribute('aria-label')).toBe('Authentication methods');

    const passwordTab = screen.getByTestId('auth-method-tab-password');
    expect(passwordTab.getAttribute('role')).toBe('tab');
    expect(passwordTab.getAttribute('aria-controls')).toBe('auth-panel-password');
  });
});

/**
 * Demo Accounts Accordion Component - Unit Tests
 *
 * Tests demo accounts display and selection.
 *
 * Validates Requirements 5.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoAccountsAccordion, type DemoAccount } from './DemoAccountsAccordion';

// ============================================================================
// Test Data
// ============================================================================

const mockAccounts: DemoAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'Administrator',
    description: 'Full system access',
  },
  {
    username: 'cashier',
    password: 'cashier123',
    role: 'Cashier',
    description: 'Point of sale access',
  },
  {
    username: 'manager',
    password: 'manager123',
    role: 'Manager',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('DemoAccountsAccordion', () => {
  it('renders toggle button', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    expect(screen.getByTestId('demo-accounts-toggle')).toBeTruthy();
    expect(screen.getByText('Demo Accounts')).toBeTruthy();
  });

  it('does not render when no accounts provided', () => {
    render(<DemoAccountsAccordion accounts={[]} />);

    expect(screen.queryByTestId('demo-accounts-accordion')).toBeFalsy();
  });

  it('starts collapsed by default', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    expect(screen.queryByTestId('demo-accounts-list')).toBeFalsy();
  });

  it('expands when toggle clicked', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    expect(screen.getByTestId('demo-accounts-list')).toBeTruthy();
  });

  it('collapses when toggle clicked again', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');

    // Expand
    fireEvent.click(toggle);
    expect(screen.getByTestId('demo-accounts-list')).toBeTruthy();

    // Collapse
    fireEvent.click(toggle);
    expect(screen.queryByTestId('demo-accounts-list')).toBeFalsy();
  });

  it('displays all demo accounts when expanded', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    expect(screen.getByText('admin')).toBeTruthy();
    expect(screen.getByText('cashier')).toBeTruthy();
    expect(screen.getByText('manager')).toBeTruthy();
  });

  it('displays account roles', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    expect(screen.getByText('Administrator')).toBeTruthy();
    expect(screen.getByText('Cashier')).toBeTruthy();
    expect(screen.getByText('Manager')).toBeTruthy();
  });

  it('displays account passwords', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    expect(screen.getByText('Password: admin123')).toBeTruthy();
    expect(screen.getByText('Password: cashier123')).toBeTruthy();
    expect(screen.getByText('Password: manager123')).toBeTruthy();
  });

  it('displays account descriptions when provided', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    expect(screen.getByText('Full system access')).toBeTruthy();
    expect(screen.getByText('Point of sale access')).toBeTruthy();
  });

  it('calls onAccountSelect when account clicked', () => {
    const onAccountSelect = vi.fn();

    render(<DemoAccountsAccordion accounts={mockAccounts} onAccountSelect={onAccountSelect} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    const accountButton = screen.getByTestId('demo-account-0');
    fireEvent.click(accountButton);

    expect(onAccountSelect).toHaveBeenCalledWith(mockAccounts[0]);
  });

  it('disables toggle when disabled prop is true', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} disabled={true} />);

    const toggle = screen.getByTestId('demo-accounts-toggle') as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
  });

  it('disables account buttons when disabled prop is true', () => {
    const { rerender } = render(<DemoAccountsAccordion accounts={mockAccounts} />);

    // First expand the accordion while enabled
    const toggle = screen.getByTestId('demo-accounts-toggle');
    fireEvent.click(toggle);

    // Then disable it
    rerender(<DemoAccountsAccordion accounts={mockAccounts} disabled={true} />);

    const accountButton = screen.getByTestId('demo-account-0') as HTMLButtonElement;
    expect(accountButton.disabled).toBe(true);
  });

  it('has proper ARIA attributes', () => {
    render(<DemoAccountsAccordion accounts={mockAccounts} />);

    const toggle = screen.getByTestId('demo-accounts-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('demo-accounts-list');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

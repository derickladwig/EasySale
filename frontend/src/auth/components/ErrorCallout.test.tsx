/**
 * Error Callout Component - Unit Tests
 *
 * Tests error callout rendering with different configurations.
 *
 * Validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorCallout } from './ErrorCallout';
import { LoginThemeProvider } from '../theme/LoginThemeProvider';
import type { LoginThemeConfig } from '../theme/types';
import minimalDarkPreset from '../theme/presets/minimalDark.json';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockConfig = (): LoginThemeConfig => minimalDarkPreset as LoginThemeConfig;

// ============================================================================
// Tests
// ============================================================================

describe('ErrorCallout', () => {
  it('renders with error message', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Something went wrong" />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('error-callout')).toBeTruthy();
    expect(screen.getByTestId('error-message').textContent).toBe('Something went wrong');
  });

  it('displays error details when provided', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Connection failed" details="Error code: ECONNREFUSED" />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('error-details')).toBeTruthy();
    expect(screen.getByTestId('error-details').textContent).toBe('Error code: ECONNREFUSED');
  });

  it('does not display details when not provided', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error occurred" />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('error-details')).toBeFalsy();
  });

  it('applies error severity correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" severity="error" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-severity')).toBe('error');
  });

  it('applies warning severity correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Warning" severity="warning" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-severity')).toBe('warning');
  });

  it('applies info severity correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Info" severity="info" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-severity')).toBe('info');
  });

  it('defaults to error severity when not specified', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Default" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-severity')).toBe('error');
  });

  it('applies inline presentation correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Inline error" presentation="inline" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-presentation')).toBe('inline');
  });

  it('applies callout presentation correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Callout error" presentation="callout" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-presentation')).toBe('callout');
  });

  it('defaults to inline presentation when not specified', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Default presentation" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('data-presentation')).toBe('inline');
  });

  it('displays retry button when showRetry is true', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showRetry={true} />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('retry-button')).toBeTruthy();
    expect(screen.getByTestId('retry-button').textContent).toBe('Retry');
  });

  it('does not display retry button when showRetry is false', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showRetry={false} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('retry-button')).toBeFalsy();
  });

  it('displays diagnostics button when showDiagnostics is true', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showDiagnostics={true} />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('diagnostics-button')).toBeTruthy();
    expect(screen.getByTestId('diagnostics-button').textContent).toBe('Diagnostics');
  });

  it('does not display diagnostics button when showDiagnostics is false', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showDiagnostics={false} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('diagnostics-button')).toBeFalsy();
  });

  it('displays both action buttons when both are enabled', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showRetry={true} showDiagnostics={true} />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('retry-button')).toBeTruthy();
    expect(screen.getByTestId('diagnostics-button')).toBeTruthy();
    expect(screen.getByTestId('error-actions')).toBeTruthy();
  });

  it('does not display action container when no actions are enabled', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showRetry={false} showDiagnostics={false} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('error-actions')).toBeFalsy();
  });

  it('calls onRetry when retry button is clicked', () => {
    const config = createMockConfig();
    const onRetry = vi.fn();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showRetry={true} onRetry={onRetry} />
      </LoginThemeProvider>
    );

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDiagnostics when diagnostics button is clicked', () => {
    const config = createMockConfig();
    const onDiagnostics = vi.fn();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" showDiagnostics={true} onDiagnostics={onDiagnostics} />
      </LoginThemeProvider>
    );

    const diagnosticsButton = screen.getByTestId('diagnostics-button');
    fireEvent.click(diagnosticsButton);

    expect(onDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('displays offline indicator when isOffline is true', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" isOffline={true} />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByTestId('offline-indicator').textContent).toContain('Offline');
  });

  it('does not display offline indicator when isOffline is false', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" isOffline={false} />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('offline-indicator')).toBeFalsy();
  });

  it('displays correct icon for error severity', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" severity="error" />
      </LoginThemeProvider>
    );

    const icon = screen.getByTestId('error-icon');
    expect(icon.textContent).toBe('✕');
  });

  it('displays correct icon for warning severity', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Warning" severity="warning" />
      </LoginThemeProvider>
    );

    const icon = screen.getByTestId('error-icon');
    expect(icon.textContent).toBe('⚠');
  });

  it('displays correct icon for info severity', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Info" severity="info" />
      </LoginThemeProvider>
    );

    const icon = screen.getByTestId('error-icon');
    expect(icon.textContent).toBe('ℹ');
  });

  it('has proper ARIA attributes for accessibility', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <ErrorCallout message="Error" />
      </LoginThemeProvider>
    );

    const callout = screen.getByTestId('error-callout');
    expect(callout.getAttribute('role')).toBe('alert');
    expect(callout.getAttribute('aria-live')).toBe('polite');
  });
});

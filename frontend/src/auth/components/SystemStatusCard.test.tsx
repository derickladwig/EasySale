/**
 * System Status Card Component - Unit Tests
 *
 * Tests system status card rendering with different configurations.
 *
 * Validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemStatusCard, formatTimestamp } from './SystemStatusCard';
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

describe('SystemStatusCard', () => {
  it('renders with all required information', () => {
    const config = createMockConfig();
    const lastSync = new Date('2024-01-15T10:00:00Z');

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          lastSyncTime={lastSync}
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('system-status-card')).toBeTruthy();
    expect(screen.getByTestId('database-status')).toBeTruthy();
    expect(screen.getByTestId('sync-status')).toBeTruthy();
    expect(screen.getByTestId('last-sync-time')).toBeTruthy();
    expect(screen.getByTestId('store-name')).toBeTruthy();
    expect(screen.getByTestId('station-id')).toBeTruthy();
  });

  it('displays database status correctly', () => {
    const config = createMockConfig();

    const { rerender } = render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('database-status').textContent).toBe('Connected');

    rerender(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="disconnected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('database-status').textContent).toBe('Disconnected');
  });

  it('displays sync status correctly', () => {
    const config = createMockConfig();

    const { rerender } = render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('sync-status').textContent).toBe('Online');

    rerender(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="syncing"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('sync-status').textContent).toBe('Syncing...');

    rerender(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="offline"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('sync-status').textContent).toBe('Offline');
  });

  it('displays offline message when sync status is offline', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="offline"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('offline-message')).toBeTruthy();
    expect(screen.getByTestId('offline-message').textContent).toBe('Operating in offline mode');
  });

  it('does not display offline message when sync status is online', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.queryByTestId('offline-message')).toBeFalsy();
  });

  it('formats last sync time correctly', () => {
    const config = createMockConfig();
    const lastSync = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          lastSyncTime={lastSync}
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    const lastSyncText = screen.getByTestId('last-sync-time').textContent;
    expect(lastSyncText).toContain('minute');
  });

  it('displays "Never" when last sync time is null', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          lastSyncTime={null}
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('last-sync-time').textContent).toBe('Never');
  });

  it('displays store name and station ID', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          storeName="Downtown Store"
          stationId="POS-03"
        />
      </LoginThemeProvider>
    );

    expect(screen.getByTestId('store-name').textContent).toBe('Downtown Store');
    expect(screen.getByTestId('station-id').textContent).toBe('POS-03');
  });

  it('applies systemForward variant correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          variant="systemForward"
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    const card = screen.getByTestId('system-status-card');
    expect(card.getAttribute('data-variant')).toBe('systemForward');
  });

  it('applies locationForward variant correctly', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          variant="locationForward"
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    const card = screen.getByTestId('system-status-card');
    expect(card.getAttribute('data-variant')).toBe('locationForward');
  });

  it('defaults to systemForward variant when not specified', () => {
    const config = createMockConfig();

    render(
      <LoginThemeProvider initialConfig={config}>
        <SystemStatusCard
          databaseStatus="connected"
          syncStatus="online"
          storeName="Main Store"
          stationId="Register 1"
        />
      </LoginThemeProvider>
    );

    const card = screen.getByTestId('system-status-card');
    expect(card.getAttribute('data-variant')).toBe('systemForward');
  });
});

describe('formatTimestamp', () => {
  it('returns "Never" for null', () => {
    expect(formatTimestamp(null)).toBe('Never');
  });

  it('returns "Never" for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('Never');
  });

  it('returns "Just now" for recent timestamps', () => {
    const now = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    expect(formatTimestamp(now)).toBe('Just now');
  });

  it('returns minutes for timestamps within an hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimestamp(fiveMinutesAgo)).toBe('5 minutes ago');

    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    expect(formatTimestamp(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('returns hours for timestamps within a day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatTimestamp(twoHoursAgo)).toBe('2 hours ago');

    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(formatTimestamp(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns days for timestamps within a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatTimestamp(threeDaysAgo)).toBe('3 days ago');

    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(formatTimestamp(oneDayAgo)).toBe('1 day ago');
  });

  it('returns formatted date for timestamps older than a week', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const formatted = formatTimestamp(tenDaysAgo);
    // Should return a date string (format varies by locale)
    expect(formatted).toBeTruthy();
    expect(formatted).not.toBe('Never');
    expect(formatted).not.toContain('ago');
  });
});

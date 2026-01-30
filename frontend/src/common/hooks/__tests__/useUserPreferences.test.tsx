/**
 * Unit Tests for useUserPreferences Hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserPreferences } from '../useUserPreferences';
import { AuthProvider } from '../../contexts/AuthContext';
import type { ReactNode } from 'react';

// Mock the auth context
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth } from '../../contexts/AuthContext';

describe('useUserPreferences Hook', () => {
  const mockUser = {
    id: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin',
    permissions: [],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return default preferences when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    expect(result.current.preferences.theme).toBe('system');
    expect(result.current.preferences.density).toBe('comfortable');
    expect(result.current.isLoading).toBe(false);
  });

  it('should load preferences for authenticated user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    // Pre-populate localStorage with preferences
    const storageKey = `userPrefs_${mockUser.id}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        theme: 'dark',
        density: 'compact',
        defaultLandingPage: '/sell',
      })
    );

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences.theme).toBe('dark');
    expect(result.current.preferences.density).toBe('compact');
    expect(result.current.preferences.defaultLandingPage).toBe('/sell');
  });

  it('should update preferences', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    expect(result.current.preferences.theme).toBe('dark');

    // Verify it was saved to localStorage
    const storageKey = `userPrefs_${mockUser.id}`;
    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.theme).toBe('dark');
  });

  it('should update single preference field', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updatePreference('density', 'compact');
    });

    expect(result.current.preferences.density).toBe('compact');
    expect(result.current.preferences.theme).toBe('system'); // Unchanged
  });

  it('should reset to defaults', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set custom preferences
    act(() => {
      result.current.updatePreferences({
        theme: 'dark',
        density: 'compact',
      });
    });

    expect(result.current.preferences.theme).toBe('dark');

    // Reset
    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.preferences.theme).toBe('system');
    expect(result.current.preferences.density).toBe('comfortable');
  });

  it('should set theme using convenience method', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.preferences.theme).toBe('dark');
  });

  it('should set density using convenience method', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setDensity('compact');
    });

    expect(result.current.preferences.density).toBe('compact');
  });

  it('should set default landing page using convenience method', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setDefaultLandingPage('/inventory');
    });

    expect(result.current.preferences.defaultLandingPage).toBe('/inventory');
  });

  it('should set keyboard shortcuts using convenience method', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setKeyboardShortcuts({
        enabled: false,
        customBindings: { 'sell': 'Ctrl+S' },
      });
    });

    expect(result.current.preferences.shortcuts?.enabled).toBe(false);
    expect(result.current.preferences.shortcuts?.customBindings).toEqual({
      'sell': 'Ctrl+S',
    });
  });

  it('should not update preferences when user is not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Try to update (should be no-op)
    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    // Should still be default
    expect(result.current.preferences.theme).toBe('system');
  });

  it('should reload preferences when user changes', async () => {
    const { rerender } = renderHook(() => useUserPreferences());

    // Start with no user
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    rerender();

    // Set preferences for a user
    const storageKey = `userPrefs_${mockUser.id}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        theme: 'dark',
      })
    );

    // Now authenticate
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { result } = renderHook(() => useUserPreferences());

    await waitFor(() => {
      expect(result.current.preferences.theme).toBe('dark');
    });
  });
});

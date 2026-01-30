import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock fetch
global.fetch = vi.fn();

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('starts with no user and not authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('loads token from localStorage on mount', async () => {
      const mockToken = 'stored-token';
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      };

      localStorage.setItem('auth_token', mockToken);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('clears invalid token from localStorage', async () => {
      const mockToken = 'invalid-token';
      localStorage.setItem('auth_token', mockToken);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid token' }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('login', () => {
    it('successfully logs in and stores token', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        token: 'jwt-token',
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'cashier',
          permissions: ['access_sell'],
        },
        expires_at: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.token).toBe(mockResponse.token);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe(mockResponse.token);
    });

    it('throws error on failed login', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid username or password' }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login(mockCredentials);
        })
      ).rejects.toThrow('Invalid username or password');

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('handles network errors during login', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login(mockCredentials);
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('successfully logs out and clears token', async () => {
      const mockToken = 'jwt-token';
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      };

      localStorage.setItem('auth_token', mockToken);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Logged out successfully' }),
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('clears local state even if logout API fails', async () => {
      const mockToken = 'jwt-token';
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      };

      localStorage.setItem('auth_token', mockToken);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user with valid token', async () => {
      const mockToken = 'jwt-token';
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      };

      localStorage.setItem('auth_token', mockToken);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.getCurrentUser();
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('throws error when no token is available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.getCurrentUser();
        })
      ).rejects.toThrow('No authentication token');
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});

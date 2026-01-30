import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient, { ApiError } from '../apiClient';
import * as logger from '../logger';

// Mock the logger
vi.mock('../logger', () => ({
  logError: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const result = await apiClient.get('/api/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes auth token in request headers', async () => {
      localStorage.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await apiClient.get('/api/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('skips auth token when skipAuth is true', async () => {
      localStorage.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await apiClient.get('/api/public', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('POST requests', () => {
    it('makes successful POST request with data', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseData,
      });

      const result = await apiClient.post('/api/items', requestData);

      expect(result).toEqual(responseData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
    });

    it('makes POST request without body', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await apiClient.post('/api/action');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('makes successful PUT request', async () => {
      const updateData = { name: 'Updated Item' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updateData,
      });

      const result = await apiClient.put('/api/items/1', updateData);

      expect(result).toEqual(updateData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes successful DELETE request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      });

      const result = await apiClient.delete('/api/items/1');

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/items/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('throws ApiError for 404 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: 'http://localhost:8080/api/items/999',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Item not found',
          code: 'NOT_FOUND',
        }),
      });

      await expect(apiClient.get('/api/items/999')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/api/items/999')).rejects.toThrow('Item not found');
    });

    it('throws ApiError for 500 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8080/api/items',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Database connection failed',
          code: 'DATABASE_ERROR',
        }),
      });

      await expect(apiClient.get('/api/items')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/api/items')).rejects.toThrow('Database connection failed');
    });

    it('throws ApiError for 401 unauthorized', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://localhost:8080/api/protected',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Invalid token',
          code: 'UNAUTHORIZED',
        }),
      });

      await expect(apiClient.get('/api/protected')).rejects.toThrow(ApiError);
    });

    it('logs error when API request fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8080/api/items',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Server error',
        }),
      });

      try {
        await apiClient.get('/api/items');
      } catch {
        // Expected to throw
      }

      expect(logger.logError).toHaveBeenCalledWith(
        'API request failed',
        expect.objectContaining({
          status: 500,
          message: 'Server error',
        })
      );
    });

    it('handles network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(apiClient.get('/api/items')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/api/items')).rejects.toThrow('Network request failed');
    });

    it('handles non-JSON error responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8080/api/items',
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<html>Error page</html>',
      });

      await expect(apiClient.get('/api/items')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/api/items')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('includes error code and details in ApiError', async () => {
      const errorDetails = { field: 'email', reason: 'invalid format' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8080/api/users',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errorDetails,
        }),
      });

      try {
        await apiClient.post('/api/users', { email: 'invalid' });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.details).toEqual(errorDetails);
        }
      }
    });
  });

  describe('Response handling', () => {
    it('handles text responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Success',
      });

      const result = await apiClient.get('/api/status');

      expect(result).toBe('Success');
    });

    it('handles empty responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => null,
      });

      const result = await apiClient.delete('/api/items/1');

      expect(result).toBeNull();
    });
  });

  describe('Custom headers', () => {
    it('merges custom headers with default headers', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await apiClient.get('/api/items', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });
});

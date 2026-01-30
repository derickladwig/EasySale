import { logError } from './logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // If VITE_API_URL is explicitly set, use it
    if (import.meta.env.VITE_API_URL) {
      this.baseUrl = import.meta.env.VITE_API_URL;
    } else if (import.meta.env.PROD) {
      // In production mode (built app), use relative URLs for nginx proxy
      this.baseUrl = ''; // Relative URLs - nginx will proxy /auth/* and /api/* to backend
    } else {
      // In development, use the same hostname as the frontend but with backend port
      // This allows LAN access (e.g., 192.168.x.x:7945 -> 192.168.x.x:8923)
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      this.baseUrl = `http://${hostname}:8923`;
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      let errorDetails: unknown;

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorCode = errorData.code;
          errorDetails = errorData.details;
        } catch {
          // Failed to parse error JSON, use default message
        }
      }

      // Log error
      logError('API request failed', {
        url: response.url,
        status: response.status,
        message: errorMessage,
        code: errorCode,
      });

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    if (isJson) {
      return response.json();
    }

    return response.text() as T;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge with provided headers
    if (fetchOptions.headers) {
      Object.assign(headers, fetchOptions.headers);
    }

    // Add auth token if not skipped
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network error or other unexpected error
      const message = error instanceof Error ? error.message : 'Network error';
      logError('API request failed', {
        url,
        error: message,
      });

      throw new ApiError(message, 0, 'NETWORK_ERROR');
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { apiClient }; // Named export for convenience

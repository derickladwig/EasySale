import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { devLog } from '../utils/devLog';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  display_name?: string; // Computed or stored display name
  permissions: string[];
  store_id?: string;
  station_id?: string;
  station_policy?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Determine API base URL dynamically
// In production (behind nginx proxy), use relative URLs
// In development, use the same hostname as the frontend but with backend port
function getApiBaseUrl(): string {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production mode (built app), use relative URLs for nginx proxy
  if (import.meta.env.PROD) {
    return ''; // Relative URLs - nginx will proxy /auth/* and /api/* to backend
  }
  
  // In development, use the same hostname as the current page but with backend port
  // This works for both localhost and LAN access
  const hostname = window.location.hostname;
  const backendPort = '8923';
  
  return `http://${hostname}:${backendPort}`;
}

const API_BASE_URL = getApiBaseUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount using httpOnly cookie
  useEffect(() => {
    // Try to fetch current user - if cookie is valid, this will succeed
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Token is stored in httpOnly cookie, we don't have direct access
        // but we can indicate authenticated state
        setToken('httpOnly-cookie');
      } else {
        // Not authenticated or token expired
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      devLog.error('Failed to fetch current user:', error);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      // Token is now stored in httpOnly cookie by the server
      // We keep a reference for backward compatibility but don't store in localStorage
      setToken('httpOnly-cookie');
      setUser(data.user);
      // Note: We no longer store token in localStorage for security
    } catch (error) {
      devLog.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
      });
    } catch (error) {
      devLog.error('Logout error:', error);
    }

    setUser(null);
    setToken(null);
    // Note: Cookie is cleared by the server response
  };

  const getCurrentUser = async () => {
    await fetchCurrentUser();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

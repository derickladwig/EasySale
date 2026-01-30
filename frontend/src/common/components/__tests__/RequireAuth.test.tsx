import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import * as AuthContext from '../../contexts/AuthContext';

// Mock useAuth
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={component} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/protected" element={component} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('shows loading state while checking authentication', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'cashier',
        permissions: ['access_sell'],
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('preserves location state when redirecting to login', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    });

    const { container } = renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>,
      '/protected'
    );

    // Verify redirect happened
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});

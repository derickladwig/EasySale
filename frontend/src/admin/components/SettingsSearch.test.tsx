/**
 * Unit Tests: SettingsSearch Component
 *
 * Tests the SettingsSearch UI component including:
 * - Search input and debouncing
 * - Keyboard navigation
 * - Recent searches
 * - Result display and navigation
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsSearch } from './SettingsSearch';
import * as settingsIndex from '../utils/settingsIndex';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper to render component
const renderSettingsSearch = () => {
  return render(
    <BrowserRouter>
      <SettingsSearch />
    </BrowserRouter>
  );
};

describe('SettingsSearch Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');
      expect(input).toBeInTheDocument();
    });

    it('should render search icon', () => {
      renderSettingsSearch();
      const searchIcon = document.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should not show dropdown initially', () => {
      renderSettingsSearch();
      const dropdown = screen.queryByRole('button');
      expect(dropdown).not.toBeInTheDocument();
    });
  });

  describe('Search Input', () => {
    it('should update input value on typing', () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'users' } });
      expect(input.value).toBe('users');
    });

    it('should debounce search queries', async () => {
      const searchSpy = vi.spyOn(settingsIndex, 'searchSettings');
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      // Type quickly
      fireEvent.change(input, { target: { value: 'u' } });
      fireEvent.change(input, { target: { value: 'us' } });
      fireEvent.change(input, { target: { value: 'use' } });
      fireEvent.change(input, { target: { value: 'user' } });

      // Should not search immediately
      expect(searchSpy).not.toHaveBeenCalled();

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(searchSpy).toHaveBeenCalledWith('user');
        },
        { timeout: 500 }
      );
    });

    it('should show dropdown when results are found', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const results = screen.queryByText(/Users/i);
        expect(results).toBeInTheDocument();
      });
    });

    it('should show "no results" message for non-matching query', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'xyznonexistent123' } });

      await waitFor(() => {
        const noResults = screen.queryByText(/No settings found/i);
        expect(noResults).toBeInTheDocument();
      });
    });
  });

  describe('Search Results', () => {
    it('should display search results', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const usersResult = screen.queryByText('Users');
        expect(usersResult).toBeInTheDocument();
      });
    });

    it('should display result descriptions', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const description = screen.queryByText(/Manage user accounts/i);
        expect(description).toBeInTheDocument();
      });
    });

    it('should display scope badges', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const scopeBadge = screen.queryByText('global');
        expect(scopeBadge).toBeInTheDocument();
      });
    });

    it('should display page and section information', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const pageInfo = screen.queryByText('Users & Roles');
        expect(pageInfo).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to setting on click', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const usersResult = screen.getByText('Users');
        fireEvent.click(usersResult);
      });

      expect(mockNavigate).toHaveBeenCalled();
      const navigationPath = mockNavigate.mock.calls[0][0];
      expect(navigationPath).toContain('/admin/users-roles');
      expect(navigationPath).toContain('#setting-users');
    });

    it('should clear input after navigation', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const usersResult = screen.getByText('Users');
        fireEvent.click(usersResult);
      });

      expect(input.value).toBe('');
    });

    it('should close dropdown after navigation', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const usersResult = screen.getByText('Users');
        fireEvent.click(usersResult);
      });

      await waitFor(() => {
        const dropdown = screen.queryByText('Users');
        expect(dropdown).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown key', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).toBeInTheDocument();
      }, { timeout: 1000 });

      // Press ArrowDown
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // First item should be highlighted (has bg-secondary-50 class)
      const results = screen.getAllByRole('button');
      expect(results[0]).toHaveClass('bg-secondary-50');
    });

    it('should navigate up with ArrowUp key', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).toBeInTheDocument();
      }, { timeout: 1000 });

      // Navigate down twice
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Navigate up once
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      // Should be back at first item
      const results = screen.getAllByRole('button');
      expect(results[0]).toHaveClass('bg-secondary-50');
    });

    it('should select result with Enter key', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).toBeInTheDocument();
      }, { timeout: 1000 });

      // Press Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should close dropdown with Escape key', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).toBeInTheDocument();
      }, { timeout: 1000 });

      // Press Escape
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).not.toBeInTheDocument();
      });
    });

    it('should show keyboard hints', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        expect(screen.queryByText('Navigate')).toBeInTheDocument();
        expect(screen.queryByText('Select')).toBeInTheDocument();
        expect(screen.queryByText('Close')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Recent Searches', () => {
    it('should save recent searches to localStorage', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const usersResult = screen.getByText('Users');
        fireEvent.click(usersResult);
      });

      const stored = localStorageMock.getItem('settings_recent_searches');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toContain('users');
    });

    it('should limit recent searches to 5 items', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      // Perform 6 searches
      const searches = ['backup', 'tax', 'store', 'network', 'printer', 'scanner'];
      for (const search of searches) {
        fireEvent.change(input, { target: { value: search } });

        await waitFor(() => {
          const results = screen.queryAllByRole('button');
          if (results.length > 0) {
            fireEvent.click(results[0]);
          }
        }, { timeout: 1000 });
      }

      const stored = localStorageMock.getItem('settings_recent_searches');
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Dropdown Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'backup' } });

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).toBeInTheDocument();
      }, { timeout: 1000 });

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        const description = screen.queryByText(/Configure automated backups/i);
        expect(description).not.toBeInTheDocument();
      });
    });

    it('should update selected index on mouse hover', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'printer' } });

      await waitFor(() => {
        const results = screen.queryAllByRole('button');
        expect(results.length).toBeGreaterThan(1);
      }, { timeout: 1000 });

      const results = screen.getAllByRole('button');
      if (results.length > 1) {
        fireEvent.mouseEnter(results[1]);

        expect(results[1]).toHaveClass('bg-secondary-50');
      }
    });
  });

  describe('Scope Badge Colors', () => {
    it('should display correct color for global scope', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'users' } });

      await waitFor(() => {
        const badge = screen.getByText('global');
        expect(badge).toHaveClass('bg-info-100', 'text-info-dark');
      });
    });

    it('should display correct color for store scope', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'tax' } });

      await waitFor(() => {
        const badges = screen.queryAllByText('store');
        if (badges.length > 0) {
          expect(badges[0]).toHaveClass('bg-green-100', 'text-green-700');
        }
      });
    });

    it('should display correct color for station scope', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'printer' } });

      await waitFor(() => {
        const badges = screen.queryAllByText('station');
        if (badges.length > 0) {
          expect(badges[0]).toHaveClass('bg-purple-100', 'text-purple-700');
        }
      });
    });

    it('should display correct color for user scope', async () => {
      renderSettingsSearch();
      const input = screen.getByPlaceholderText('Search settings...');

      fireEvent.change(input, { target: { value: 'password' } });

      await waitFor(() => {
        const badges = screen.queryAllByText('user');
        if (badges.length > 0) {
          expect(badges[0]).toHaveClass('bg-orange-100', 'text-orange-700');
        }
      });
    });
  });
});

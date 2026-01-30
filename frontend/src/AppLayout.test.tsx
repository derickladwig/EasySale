import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { AuthProvider } from './common/contexts/AuthContext';
import { PermissionsProvider } from './common/contexts/PermissionsContext';
import { ConfigProvider, ThemeProvider } from './config';

// Mock API client
vi.mock('./common/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Helper to render with contexts
const renderWithContexts = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>
        <ThemeProvider storeId="test-store">
          <AuthProvider>
            <PermissionsProvider>{ui}</PermissionsProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </BrowserRouter>
  );
};

describe('AppLayout', () => {
  describe('Structure and Dark Theme', () => {
    it('renders with proper semantic HTML structure', () => {
      renderWithContexts(<AppLayout />);
      expect(document.querySelector('header')).toBeInTheDocument();
      expect(document.querySelector('aside')).toBeInTheDocument();
      expect(document.querySelector('main')).toBeInTheDocument();
      expect(document.querySelector('nav')).toBeInTheDocument();
    });

    it('applies design token classes to top bar', () => {
      renderWithContexts(<AppLayout />);
      const header = document.querySelector('header');
      // Uses design tokens instead of hardcoded colors
      expect(header).toHaveClass('bg-surface-base', 'border-border');
    });

    it('applies design token classes to sidebar', () => {
      renderWithContexts(<AppLayout />);
      const sidebar = document.querySelector('aside');
      // Uses design tokens instead of hardcoded colors
      expect(sidebar).toHaveClass('bg-surface-base', 'border-border');
    });

    it('applies design token classes to main content', () => {
      renderWithContexts(<AppLayout />);
      const main = document.querySelector('main');
      // Uses design tokens instead of hardcoded colors
      expect(main).toHaveClass('bg-background-primary');
    });
  });

  describe('Top Bar Elements', () => {
    it('renders the logo', () => {
      renderWithContexts(<AppLayout />);
      // In dev mode, appName is "EasySale (Dev)"
      expect(screen.getByText('EasySale (Dev)')).toBeInTheDocument();
    });

    it('renders sync status indicator', () => {
      renderWithContexts(<AppLayout />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('renders search bar', () => {
      renderWithContexts(<AppLayout />);
      const searchInput = screen.getByPlaceholderText(/search products/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
      renderWithContexts(<AppLayout />);
      const menuButton = screen.getByLabelText('Toggle menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('renders profile menu button', () => {
      renderWithContexts(<AppLayout />);
      // Profile menu has a button with aria-haspopup
      const profileButton = document.querySelector('[aria-haspopup="true"]');
      expect(profileButton).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders navigation container', () => {
      renderWithContexts(<AppLayout />);
      // Navigation is rendered in the sidebar
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('sidebar has proper structure', () => {
      renderWithContexts(<AppLayout />);
      const sidebar = document.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      // Should have navigation area
      const navArea = sidebar?.querySelector('nav');
      expect(navArea).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes to sidebar', () => {
      renderWithContexts(<AppLayout />);
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('fixed', 'md:static');
    });

    it('hides search bar on mobile', () => {
      renderWithContexts(<AppLayout />);
      const searchContainer = screen.getByPlaceholderText(/search products/i).closest('div');
      expect(searchContainer?.parentElement).toHaveClass('hidden', 'md:flex');
    });

    it('sidebar is hidden by default on mobile', () => {
      renderWithContexts(<AppLayout />);
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');
    });
  });

  describe('Store Information', () => {
    it('displays store information in sidebar footer', () => {
      renderWithContexts(<AppLayout />);
      // In dev mode, the store name is "Demo Store"
      expect(screen.getByText('Demo Store')).toBeInTheDocument();
      expect(screen.getByText(/Station:/)).toBeInTheDocument();
    });
  });

  describe('Sync Status', () => {
    it('displays online status with correct styling', () => {
      renderWithContexts(<AppLayout />);
      const statusElement = screen.getByText('Online').closest('div');
      expect(statusElement).toHaveClass('bg-success-500/20', 'text-success-400');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      renderWithContexts(<AppLayout />);
      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
      // Profile menu has aria-haspopup
      const profileButton = document.querySelector('[aria-haspopup="true"]');
      expect(profileButton).toBeInTheDocument();
    });

    it('sidebar collapse button is keyboard accessible', () => {
      renderWithContexts(<AppLayout />);
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      expect(collapseButton).toBeInTheDocument();
      expect(collapseButton.tagName).toBe('BUTTON');
    });
  });
});

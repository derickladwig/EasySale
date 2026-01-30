import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  const defaultUser = {
    firstName: 'John',
    username: 'john.doe',
    role: 'manager',
  };

  describe('Rendering', () => {
    it('should render the top bar', () => {
      const { container } = render(<TopBar />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('should render default logo and store name', () => {
      render(<TopBar storeName="EasySale" />);
      expect(screen.getByText('EasySale')).toBeInTheDocument();
    });

    it('should render custom store name', () => {
      render(<TopBar storeName="Custom Store" />);
      expect(screen.getByText('Custom Store')).toBeInTheDocument();
    });

    it('should render custom logo', () => {
      render(<TopBar logo={<div>Custom Logo</div>} />);
      expect(screen.getByText('Custom Logo')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu Button', () => {
    it('should render mobile menu button', () => {
      render(<TopBar onMenuClick={vi.fn()} />);
      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
    });

    it('should call onMenuClick when clicked', () => {
      const handleMenuClick = vi.fn();
      render(<TopBar onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      expect(handleMenuClick).toHaveBeenCalledTimes(1);
    });

    it('should show X icon when sidebar is open', () => {
      const { container } = render(<TopBar isSidebarOpen={true} />);
      // X icon has specific SVG structure
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Search Bar', () => {
    it('should render search bar by default', () => {
      render(<TopBar />);
      expect(
        screen.getByPlaceholderText('Search products, customers, orders...')
      ).toBeInTheDocument();
    });

    it('should not render search when showSearch is false', () => {
      render(<TopBar showSearch={false} />);
      expect(
        screen.queryByPlaceholderText('Search products, customers, orders...')
      ).not.toBeInTheDocument();
    });

    it('should use custom search placeholder', () => {
      render(<TopBar searchPlaceholder="Search items..." />);
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
    });

    it('should call onSearchChange when typing', () => {
      const handleSearchChange = vi.fn();
      render(<TopBar />);

      const searchInput = screen.getByPlaceholderText('Search products, customers, orders...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(handleSearchChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Sync Status', () => {
    it('should render online status by default', () => {
      render(<TopBar />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render syncing status', () => {
      render(<TopBar syncStatus="syncing" />);
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should render offline status', () => {
      render(<TopBar syncStatus="offline" />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should have correct styling for online status', () => {
      const { container } = render(<TopBar syncStatus="online" />);
      const statusElement = container.querySelector('.bg-success-500\\/20');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have correct styling for syncing status', () => {
      const { container } = render(<TopBar syncStatus="syncing" />);
      const statusElement = container.querySelector('.bg-primary-500\\/20');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have correct styling for offline status', () => {
      const { container } = render(<TopBar syncStatus="offline" />);
      const statusElement = container.querySelector('.bg-error-500\\/20');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('should render notification button', () => {
      render(<TopBar />);
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });

    it('should not show notification badge when count is 0', () => {
      const { container } = render(<TopBar notificationCount={0} />);
      const badge = container.querySelector('.bg-error-500');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show notification badge when count is greater than 0', () => {
      const { container } = render(<TopBar notificationCount={5} />);
      const badge = container.querySelector('.bg-error-500');
      expect(badge).toBeInTheDocument();
    });

    it('should call onNotificationsClick when clicked', () => {
      const handleNotificationsClick = vi.fn();
      render(<TopBar onNotificationsClick={handleNotificationsClick} />);

      const notificationButton = screen.getByLabelText('Notifications');
      fireEvent.click(notificationButton);

      expect(handleNotificationsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Menu', () => {
    it('should render user profile button', () => {
      render(<TopBar />);
      expect(screen.getByLabelText('User profile')).toBeInTheDocument();
    });

    it('should render logout button', () => {
      render(<TopBar />);
      expect(screen.getByLabelText('Logout')).toBeInTheDocument();
    });

    it('should display user name when provided', () => {
      render(<TopBar user={defaultUser} />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should display username when firstName is not provided', () => {
      render(<TopBar user={{ username: 'testuser', role: 'cashier' }} />);
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display user role', () => {
      render(<TopBar user={defaultUser} />);
      expect(screen.getByText('manager')).toBeInTheDocument();
    });

    it('should call onProfileClick when profile button is clicked', () => {
      const handleProfileClick = vi.fn();
      render(<TopBar onProfileClick={handleProfileClick} />);

      const profileButton = screen.getByLabelText('User profile');
      fireEvent.click(profileButton);

      expect(handleProfileClick).toHaveBeenCalledTimes(1);
    });

    it('should call onLogout when logout button is clicked', () => {
      const handleLogout = vi.fn();
      render(<TopBar onLogout={handleLogout} />);

      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);

      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Styling', () => {
    it('should have correct height', () => {
      const { container } = render(<TopBar />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('h-14');
    });

    it('should have dark theme colors', () => {
      const { container } = render(<TopBar />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('bg-surface-base');
      expect(header).toHaveClass('border-border');
    });

    it('should have high z-index', () => {
      const { container } = render(<TopBar />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('z-50');
    });

    it('should accept custom className', () => {
      const { container } = render(<TopBar className="custom-class" />);
      expect(container.querySelector('header')).toHaveClass('custom-class');
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide store name on small screens', () => {
      const { container } = render(<TopBar storeName="EasySale" />);
      const storeName = screen.getByText('EasySale');
      expect(storeName).toHaveClass('hidden');
      expect(storeName).toHaveClass('sm:block');
    });

    it('should hide search bar on mobile', () => {
      const { container } = render(<TopBar />);
      const searchContainer = container.querySelector('.md\\:flex');
      expect(searchContainer).toHaveClass('hidden');
    });

    it('should hide sync status text on small screens', () => {
      const { container } = render(<TopBar syncStatus="online" />);
      const statusText = screen.getByText('Online');
      expect(statusText).toHaveClass('hidden');
      expect(statusText).toHaveClass('md:inline');
    });

    it('should hide user info on small screens', () => {
      const { container } = render(<TopBar user={defaultUser} />);
      const userInfo = container.querySelector('.sm\\:block');
      expect(userInfo).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TopBar onMenuClick={vi.fn()} user={defaultUser} />);

      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('User profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Logout')).toBeInTheDocument();
    });

    it('should have proper button titles', () => {
      render(<TopBar onLogout={vi.fn()} />);

      const logoutButton = screen.getByLabelText('Logout');
      expect(logoutButton).toHaveAttribute('title', 'Logout');
    });
  });

  describe('Complete Scenarios', () => {
    it('should render complete top bar with all features', () => {
      const handleMenuClick = vi.fn();
      const handleSearchChange = vi.fn();
      const handleNotificationsClick = vi.fn();
      const handleProfileClick = vi.fn();
      const handleLogout = vi.fn();

      render(
        <TopBar
          isSidebarOpen={false}
          onMenuClick={handleMenuClick}
          syncStatus="syncing"
          user={defaultUser}
          onLogout={handleLogout}
          showSearch={true}
          searchPlaceholder="Search..."
          notificationCount={3}
          onNotificationsClick={handleNotificationsClick}
          onProfileClick={handleProfileClick}
          storeName="Test Store"
        />
      );

      expect(screen.getByText('Test Store')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('manager')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });

    it('should work with minimal props', () => {
      render(<TopBar storeName="EasySale" />);

      expect(screen.getByText('EasySale')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('User profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Logout')).toBeInTheDocument();
    });
  });
});

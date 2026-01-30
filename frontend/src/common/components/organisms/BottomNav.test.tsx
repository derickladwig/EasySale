import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNav, BottomNavItem } from './BottomNav';
import { Home, Search, ShoppingCart, User, Settings } from 'lucide-react';

const mockItems: BottomNavItem[] = [
  { id: 'home', label: 'Home', icon: Home, onClick: vi.fn() },
  { id: 'search', label: 'Search', icon: Search, onClick: vi.fn() },
  { id: 'cart', label: 'Cart', icon: ShoppingCart, onClick: vi.fn(), badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, onClick: vi.fn() },
];

describe('BottomNav', () => {
  describe('Rendering', () => {
    it('should render bottom navigation', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<BottomNav items={mockItems} />);
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Profile')).toBeInTheDocument();
    });

    it('should render item icons', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      // Icons are rendered as SVG elements
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render item labels', () => {
      render(<BottomNav items={mockItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Cart')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight active item', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const activeButton = screen.getByLabelText('Home');
      expect(activeButton).toHaveClass('text-primary-400');
    });

    it('should have aria-current on active item', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const activeButton = screen.getByLabelText('Home');
      expect(activeButton).toHaveAttribute('aria-current', 'page');
    });

    it('should not highlight inactive items', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const inactiveButton = screen.getByLabelText('Search');
      expect(inactiveButton).not.toHaveClass('text-primary-400');
      expect(inactiveButton).toHaveClass('text-text-secondary');
    });

    it('should handle no active item', () => {
      render(<BottomNav items={mockItems} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('aria-current');
      });
    });
  });

  describe('Item Click', () => {
    it('should call onClick when item is clicked', () => {
      const handleClick = vi.fn();
      const items: BottomNavItem[] = [
        { id: 'home', label: 'Home', icon: Home, onClick: handleClick },
      ];
      render(<BottomNav items={items} />);

      const homeButton = screen.getByLabelText('Home');
      homeButton.click();

      expect(handleClick).toHaveBeenCalled();
    });

    it('should work without onClick handler', () => {
      const items: BottomNavItem[] = [{ id: 'home', label: 'Home', icon: Home }];
      render(<BottomNav items={items} />);

      const homeButton = screen.getByLabelText('Home');
      expect(() => homeButton.click()).not.toThrow();
    });

    it('should call correct onClick for each item', () => {
      const handleHomeClick = vi.fn();
      const handleSearchClick = vi.fn();
      const items: BottomNavItem[] = [
        { id: 'home', label: 'Home', icon: Home, onClick: handleHomeClick },
        { id: 'search', label: 'Search', icon: Search, onClick: handleSearchClick },
      ];
      render(<BottomNav items={items} />);

      screen.getByLabelText('Home').click();
      expect(handleHomeClick).toHaveBeenCalled();
      expect(handleSearchClick).not.toHaveBeenCalled();

      screen.getByLabelText('Search').click();
      expect(handleSearchClick).toHaveBeenCalled();
    });
  });

  describe('Badge Support', () => {
    it('should not show badge by default', () => {
      const items: BottomNavItem[] = [{ id: 'home', label: 'Home', icon: Home }];
      const { container } = render(<BottomNav items={items} />);
      expect(container.querySelector('.bg-error-500')).not.toBeInTheDocument();
    });

    it('should show badge when count is greater than 0', () => {
      render(<BottomNav items={mockItems} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show 99+ for counts over 99', () => {
      const items: BottomNavItem[] = [
        { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: 150 },
      ];
      render(<BottomNav items={items} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not show badge when count is 0', () => {
      const items: BottomNavItem[] = [{ id: 'cart', label: 'Cart', icon: ShoppingCart, badge: 0 }];
      const { container } = render(<BottomNav items={items} />);
      expect(container.querySelector('.bg-error-500')).not.toBeInTheDocument();
    });

    it('should position badge correctly', () => {
      render(<BottomNav items={mockItems} />);
      const badge = screen.getByText('3');
      expect(badge).toHaveClass('absolute');
      expect(badge).toHaveClass('-top-1');
      expect(badge).toHaveClass('-right-1');
    });
  });

  describe('Overflow Handling', () => {
    it('should show all items when count <= maxVisibleItems', () => {
      render(<BottomNav items={mockItems} maxVisibleItems={4} />);
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Profile')).toBeInTheDocument();
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    it('should show More button when items > maxVisibleItems', () => {
      const manyItems: BottomNavItem[] = [
        ...mockItems,
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
      render(<BottomNav items={manyItems} maxVisibleItems={4} />);
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
    });

    it('should hide overflow items', () => {
      const manyItems: BottomNavItem[] = [
        ...mockItems,
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
      render(<BottomNav items={manyItems} maxVisibleItems={4} />);
      expect(screen.queryByLabelText('Settings')).not.toBeInTheDocument();
    });

    it('should show first (maxVisibleItems - 1) items when overflow', () => {
      const manyItems: BottomNavItem[] = [
        ...mockItems,
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
      render(<BottomNav items={manyItems} maxVisibleItems={4} />);
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Cart')).toBeInTheDocument();
      expect(screen.queryByLabelText('Profile')).not.toBeInTheDocument();
    });

    it('should call onMoreClick when More button is clicked', () => {
      const handleMoreClick = vi.fn();
      const manyItems: BottomNavItem[] = [
        ...mockItems,
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
      render(<BottomNav items={manyItems} maxVisibleItems={4} onMoreClick={handleMoreClick} />);

      const moreButton = screen.getByLabelText('More options');
      moreButton.click();

      expect(handleMoreClick).toHaveBeenCalled();
    });

    it('should use default maxVisibleItems of 4', () => {
      const manyItems: BottomNavItem[] = [
        ...mockItems,
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
      render(<BottomNav items={manyItems} />);
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have fixed bottom positioning', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('bottom-0');
      expect(nav).toHaveClass('left-0');
      expect(nav).toHaveClass('right-0');
    });

    it('should have dark theme colors', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('bg-background-primary');
      expect(nav).toHaveClass('border-border');
    });

    it('should have high z-index', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('z-50');
    });

    it('should be hidden on desktop', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('md:hidden');
    });

    it('should have primary color for active item', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const activeButton = screen.getByLabelText('Home');
      expect(activeButton).toHaveClass('text-primary-400');
    });

    it('should have dark color for inactive items', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const inactiveButton = screen.getByLabelText('Search');
      expect(inactiveButton).toHaveClass('text-text-secondary');
    });

    it('should accept additional className', () => {
      const { container } = render(<BottomNav items={mockItems} className="custom-class" />);
      expect(container.querySelector('nav')).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for navigation', () => {
      const { container } = render(<BottomNav items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    it('should have aria-label for each item', () => {
      render(<BottomNav items={mockItems} />);
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Profile')).toBeInTheDocument();
    });

    it('should have aria-current on active item', () => {
      render(<BottomNav items={mockItems} activeItem="home" />);
      const activeButton = screen.getByLabelText('Home');
      expect(activeButton).toHaveAttribute('aria-current', 'page');
    });

    it('should have proper button roles', () => {
      render(<BottomNav items={mockItems} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(mockItems.length);
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete bottom nav with all features', () => {
      render(
        <BottomNav
          items={mockItems}
          activeItem="cart"
          maxVisibleItems={4}
          className="custom-class"
        />
      );

      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Profile')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Badge

      const activeButton = screen.getByLabelText('Cart');
      expect(activeButton).toHaveAttribute('aria-current', 'page');
    });

    it('should handle single item', () => {
      const singleItem: BottomNavItem[] = [{ id: 'home', label: 'Home', icon: Home }];
      render(<BottomNav items={singleItem} />);
      expect(screen.getByLabelText('Home')).toBeInTheDocument();
    });

    it('should handle many items with overflow', () => {
      const manyItems: BottomNavItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `item${i + 1}`,
        label: `Item ${i + 1}`,
        icon: Home,
      }));
      render(<BottomNav items={manyItems} maxVisibleItems={5} />);

      // Should show first 4 items + More button
      expect(screen.getByLabelText('Item 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Item 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Item 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Item 4')).toBeInTheDocument();
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
      expect(screen.queryByLabelText('Item 5')).not.toBeInTheDocument();
    });

    it('should handle items with long labels', () => {
      const longLabelItems: BottomNavItem[] = [
        { id: 'item1', label: 'Very Long Label', icon: Home },
      ];
      render(<BottomNav items={longLabelItems} />);
      expect(screen.getByText('Very Long Label')).toBeInTheDocument();
    });

    it('should truncate very long labels', () => {
      const longLabelItems: BottomNavItem[] = [
        { id: 'item1', label: 'Very Long Label', icon: Home },
      ];
      render(<BottomNav items={longLabelItems} />);
      const label = screen.getByText('Very Long Label');
      expect(label).toHaveClass('truncate');
    });
  });

  describe('Icon Sizes', () => {
    it('should render icons with consistent 24px size', () => {
      const { container } = render(<BottomNav items={mockItems} />);

      // Each button should have an SVG icon with size 24
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('width', '24');
        expect(icon).toHaveAttribute('height', '24');
      });
    });
  });
});

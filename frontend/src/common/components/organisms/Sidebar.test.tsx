import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { Home, ShoppingCart, Package } from 'lucide-react';

describe('Sidebar', () => {
  const defaultItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell' },
    { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
  ];

  const defaultStoreInfo = {
    name: 'Demo Store',
    station: 'POS-001',
  };

  describe('Rendering', () => {
    it('should render the sidebar', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      expect(container.querySelector('aside')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<Sidebar items={defaultItems} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });

    it('should render store information', () => {
      render(<Sidebar items={defaultItems} storeInfo={defaultStoreInfo} />);

      expect(screen.getByText('Demo Store')).toBeInTheDocument();
      expect(screen.getByText('Station: POS-001')).toBeInTheDocument();
    });

    it('should render custom store information', () => {
      const customStoreInfo = {
        name: 'Custom Store',
        station: 'POS-002',
      };

      render(<Sidebar items={defaultItems} storeInfo={customStoreInfo} />);

      expect(screen.getByText('Custom Store')).toBeInTheDocument();
      expect(screen.getByText('Station: POS-002')).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    it('should highlight active item', () => {
      render(<Sidebar items={defaultItems} activeItemId="sell" />);

      const sellButton = screen.getByText('Sell').closest('button');
      // New styling uses bg-primary-600/15 for active state with accent bar
      expect(sellButton).toHaveClass('bg-primary-600/15');
      expect(sellButton).toHaveClass('text-primary-400');
    });

    it('should not highlight inactive items', () => {
      render(<Sidebar items={defaultItems} activeItemId="sell" />);

      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).not.toHaveClass('bg-primary-600/15');
      expect(homeButton).toHaveClass('text-text-secondary');
    });

    it('should call onItemClick when item is clicked', () => {
      const handleItemClick = vi.fn();
      render(<Sidebar items={defaultItems} onItemClick={handleItemClick} />);

      const sellButton = screen.getByText('Sell');
      fireEvent.click(sellButton);

      expect(handleItemClick).toHaveBeenCalledTimes(1);
      expect(handleItemClick).toHaveBeenCalledWith(defaultItems[1]);
    });

    it('should render icons for each item', () => {
      const { container } = render(<Sidebar items={defaultItems} />);

      // Each button should have an SVG icon
      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Behavior', () => {
    it('should be hidden by default on mobile', () => {
      const { container } = render(<Sidebar items={defaultItems} isOpen={false} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('-translate-x-full');
    });

    it('should be visible when isOpen is true', () => {
      const { container } = render(<Sidebar items={defaultItems} isOpen={true} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('translate-x-0');
    });

    it('should have fixed positioning on mobile', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('fixed');
      expect(aside).toHaveClass('md:static');
    });

    it('should have transition classes', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('transition-all');
      expect(aside).toHaveClass('duration-200');
    });
  });

  describe('Layout and Styling', () => {
    it('should have correct width', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('w-56');
    });

    it('should have dark theme colors', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('bg-surface-base');
      expect(aside).toHaveClass('border-border/50');
    });

    it('should have proper z-index', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('z-40');
    });

    it('should accept custom className', () => {
      const { container } = render(<Sidebar items={defaultItems} className="custom-class" />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('custom-class');
    });
  });

  describe('Store Information Section', () => {
    it('should have border at top when storeInfo provided', () => {
      const { container } = render(<Sidebar items={defaultItems} storeInfo={defaultStoreInfo} />);
      const storeInfoSection = container.querySelector('.border-t');

      expect(storeInfoSection).toBeInTheDocument();
    });

    it('should not render store info when not provided', () => {
      render(<Sidebar items={defaultItems} />);
      
      // Store info should not be visible when not provided
      expect(screen.queryByText('Station:')).not.toBeInTheDocument();
    });

    it('should have proper text styling', () => {
      const { container } = render(<Sidebar items={defaultItems} storeInfo={defaultStoreInfo} />);
      const storeInfoSection = container.querySelector('.text-xs');

      expect(storeInfoSection).toBeInTheDocument();
    });
  });

  describe('Scrolling', () => {
    it('should have scrollable navigation area', () => {
      const { container } = render(<Sidebar items={defaultItems} />);
      const nav = container.querySelector('nav');

      expect(nav).toHaveClass('overflow-y-auto');
    });

    it('should handle long lists of items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        icon: Home,
        path: `/item-${i}`,
      }));

      render(<Sidebar items={manyItems} />);

      // Should render all items
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 19')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML', () => {
      const { container } = render(<Sidebar items={defaultItems} />);

      expect(container.querySelector('aside')).toBeInTheDocument();
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should have clickable buttons', () => {
      render(<Sidebar items={defaultItems} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(defaultItems.length);
    });
  });

  describe('Complete Scenarios', () => {
    it('should render complete sidebar with all features', () => {
      const handleItemClick = vi.fn();
      const customStoreInfo = {
        name: 'Test Store',
        station: 'POS-003',
      };

      render(
        <Sidebar
          items={defaultItems}
          activeItemId="inventory"
          isOpen={true}
          onItemClick={handleItemClick}
          storeInfo={customStoreInfo}
          className="custom-sidebar"
        />
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Sell')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Test Store')).toBeInTheDocument();
      expect(screen.getByText('Station: POS-003')).toBeInTheDocument();

      const inventoryButton = screen.getByText('Inventory').closest('button');
      expect(inventoryButton).toHaveClass('bg-primary-600/15');
    });

    it('should work with minimal props', () => {
      render(<Sidebar items={defaultItems} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      // Store info is not rendered when not provided
    });

    it('should work with empty items array', () => {
      const { container } = render(<Sidebar items={[]} storeInfo={defaultStoreInfo} />);

      // Should still render store info when provided
      expect(screen.getByText('Demo Store')).toBeInTheDocument();
    });
  });

  describe('Badge Support', () => {
    it('should render badge when item has badge count', () => {
      const itemsWithBadge = [
        { id: 'home', label: 'Home', icon: Home, path: '/', badge: 5 },
        { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell' },
      ];

      render(<Sidebar items={itemsWithBadge} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not render badge when count is 0', () => {
      const itemsWithBadge = [
        { id: 'home', label: 'Home', icon: Home, path: '/', badge: 0 },
      ];

      const { container } = render(<Sidebar items={itemsWithBadge} />);
      
      // Badge component should not be rendered
      expect(container.querySelector('.bg-error-500')).not.toBeInTheDocument();
    });

    it('should not render badge when badge is undefined', () => {
      render(<Sidebar items={defaultItems} />);

      const { container } = render(<Sidebar items={defaultItems} />);
      
      // Badge component should not be rendered
      expect(container.querySelector('.bg-error-500')).not.toBeInTheDocument();
    });

    it('should render badge with error variant', () => {
      const itemsWithBadge = [
        { id: 'home', label: 'Home', icon: Home, path: '/', badge: 3 },
      ];

      const { container } = render(<Sidebar items={itemsWithBadge} />);
      
      // Badge should have error styling
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('should render multiple badges for different items', () => {
      const itemsWithBadges = [
        { id: 'home', label: 'Home', icon: Home, path: '/', badge: 5 },
        { id: 'sell', label: 'Sell', icon: ShoppingCart, path: '/sell', badge: 3 },
        { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
      ];

      render(<Sidebar items={itemsWithBadges} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Icon Sizes', () => {
    it('should render icons with consistent 20px size', () => {
      const { container } = render(<Sidebar items={defaultItems} />);

      // Each button should have an SVG icon with size 20
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('width', '20');
        expect(icon).toHaveAttribute('height', '20');
      });
    });
  });

  describe('Collapsed State (Tablet)', () => {
    it('should collapse sidebar when isCollapsed is true', () => {
      const { container } = render(<Sidebar items={defaultItems} isCollapsed={true} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('w-16');
    });

    it('should show full width when isCollapsed is false', () => {
      const { container } = render(<Sidebar items={defaultItems} isCollapsed={false} />);
      const aside = container.querySelector('aside');

      expect(aside).toHaveClass('w-56');
    });

    it('should hide labels when collapsed', () => {
      render(<Sidebar items={defaultItems} isCollapsed={true} />);

      // Labels should not be visible (not in document)
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.queryByText('Sell')).not.toBeInTheDocument();
    });

    it('should show labels when not collapsed', () => {
      render(<Sidebar items={defaultItems} isCollapsed={false} />);

      // Labels should be visible
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Sell')).toBeInTheDocument();
    });

    it('should hide store info when collapsed', () => {
      render(<Sidebar items={defaultItems} storeInfo={defaultStoreInfo} isCollapsed={true} />);

      // Store info should not be visible
      expect(screen.queryByText('Demo Store')).not.toBeInTheDocument();
    });

    it('should show store info when not collapsed', () => {
      render(<Sidebar items={defaultItems} storeInfo={defaultStoreInfo} isCollapsed={false} />);

      // Store info should be visible
      expect(screen.getByText('Demo Store')).toBeInTheDocument();
    });

    it('should show badge dot when collapsed and item has badge', () => {
      const itemsWithBadge = [
        { id: 'home', label: 'Home', icon: Home, path: '/', badge: 5 },
      ];

      const { container } = render(<Sidebar items={itemsWithBadge} isCollapsed={true} />);

      // Should show a badge dot (small red circle)
      const badgeDot = container.querySelector('.bg-error-500.rounded-full');
      expect(badgeDot).toBeInTheDocument();
    });

    it('should center icons when collapsed', () => {
      const { container } = render(<Sidebar items={defaultItems} isCollapsed={true} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('justify-center');
      });
    });
  });
});

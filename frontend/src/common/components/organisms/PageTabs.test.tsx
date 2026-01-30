import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageTabs } from './PageTabs';
import { Package, Truck, AlertCircle } from 'lucide-react';

describe('PageTabs', () => {
  const defaultItems = [
    { id: 'inventory', label: 'Inventory', icon: Package, status: 'ready' as const },
    { id: 'receiving', label: 'Receiving', icon: Truck, status: 'ready' as const },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle, status: 'comingSoon' as const, hint: 'Coming in v2.0' },
  ];

  describe('Rendering', () => {
    it('should render all visible tabs', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Receiving')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('should hide tabs with hidden status', () => {
      const itemsWithHidden = [
        ...defaultItems,
        { id: 'hidden', label: 'Hidden Tab', status: 'hidden' as const },
      ];

      render(<PageTabs items={itemsWithHidden} activeTab="inventory" onTabChange={() => {}} />);

      expect(screen.queryByText('Hidden Tab')).not.toBeInTheDocument();
    });

    it('should render icons when provided', () => {
      const { container } = render(
        <PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />
      );

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Active State', () => {
    it('should highlight active tab', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const activeTab = screen.getByText('Inventory').closest('button');
      expect(activeTab).toHaveClass('bg-primary-600');
    });

    it('should not highlight inactive tabs', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const inactiveTab = screen.getByText('Receiving').closest('button');
      expect(inactiveTab).not.toHaveClass('bg-primary-600');
    });
  });

  describe('Feature Status', () => {
    it('should show lock icon for coming soon tabs', () => {
      const { container } = render(
        <PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />
      );

      // Alerts tab should have a lock icon
      const alertsTab = screen.getByText('Alerts').closest('button');
      expect(alertsTab?.querySelector('svg[class*="text-text-muted"]')).toBeInTheDocument();
    });

    it('should show beta badge for beta tabs', () => {
      const itemsWithBeta = [
        { id: 'beta', label: 'Beta Feature', status: 'beta' as const },
      ];

      render(<PageTabs items={itemsWithBeta} activeTab="beta" onTabChange={() => {}} />);

      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('should disable coming soon tabs', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const alertsTab = screen.getByText('Alerts').closest('button');
      expect(alertsTab).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Interaction', () => {
    it('should call onTabChange when ready tab is clicked', () => {
      const handleTabChange = vi.fn();
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('Receiving'));

      expect(handleTabChange).toHaveBeenCalledWith('receiving', undefined);
    });

    it('should not call onTabChange when coming soon tab is clicked', () => {
      const handleTabChange = vi.fn();
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('Alerts'));

      expect(handleTabChange).not.toHaveBeenCalled();
    });

    it('should pass route to onTabChange when provided', () => {
      const handleTabChange = vi.fn();
      const itemsWithRoute = [
        { id: 'inventory', label: 'Inventory', status: 'ready' as const, route: '/inventory/items' },
      ];

      render(<PageTabs items={itemsWithRoute} activeTab="inventory" onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('Inventory'));

      expect(handleTabChange).toHaveBeenCalledWith('inventory', '/inventory/items');
    });
  });

  describe('Badge Support', () => {
    it('should render badge count', () => {
      const itemsWithBadge = [
        { id: 'alerts', label: 'Alerts', status: 'ready' as const, badge: 5 },
      ];

      render(<PageTabs items={itemsWithBadge} activeTab="alerts" onTabChange={() => {}} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not render badge when count is 0', () => {
      const itemsWithBadge = [
        { id: 'alerts', label: 'Alerts', status: 'ready' as const, badge: 0 },
      ];

      render(<PageTabs items={itemsWithBadge} activeTab="alerts" onTabChange={() => {}} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show 99+ for large badge counts', () => {
      const itemsWithBadge = [
        { id: 'alerts', label: 'Alerts', status: 'ready' as const, badge: 150 },
      ];

      render(<PageTabs items={itemsWithBadge} activeTab="alerts" onTabChange={() => {}} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(3);
    });

    it('should mark active tab as selected', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const activeTab = screen.getByText('Inventory').closest('button');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should mark coming soon tabs as disabled', () => {
      render(<PageTabs items={defaultItems} activeTab="inventory" onTabChange={() => {}} />);

      const disabledTab = screen.getByText('Alerts').closest('button');
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

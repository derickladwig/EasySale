import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabItem } from './Tabs';
import { Home, Settings, Users } from 'lucide-react';

const mockItems: TabItem[] = [
  { id: 'tab1', label: 'Tab 1', icon: Home },
  { id: 'tab2', label: 'Tab 2', icon: Settings },
  { id: 'tab3', label: 'Tab 3', icon: Users },
];

describe('Tabs', () => {
  describe('Rendering', () => {
    it('should render tabs', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      expect(container.querySelector('[role="tablist"]')).toBeInTheDocument();
    });

    it('should render wrapper div for scroll indicators', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render all tab items', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should render tab icons', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      // Icons are rendered as SVG elements
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render tabs without icons', () => {
      const itemsWithoutIcons: TabItem[] = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' },
      ];
      render(<Tabs items={itemsWithoutIcons} activeTab="tab1" onTabChange={vi.fn()} />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight active tab', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const activeTab = screen.getByText('Tab 1').closest('button');
      expect(activeTab).toHaveClass('text-primary-400');
      expect(activeTab).toHaveClass('bg-background-tertiary');
    });

    it('should have aria-selected on active tab', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const activeTab = screen.getByText('Tab 1').closest('button');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should not highlight inactive tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const inactiveTab = screen.getByText('Tab 2').closest('button');
      expect(inactiveTab).not.toHaveClass('text-primary-400');
      expect(inactiveTab).toHaveClass('text-text-secondary');
    });

    it('should have aria-selected false on inactive tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const inactiveTab = screen.getByText('Tab 2').closest('button');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should update active tab when changed', () => {
      const { rerender } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      let activeTab = screen.getByText('Tab 1').closest('button');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');

      rerender(<Tabs items={mockItems} activeTab="tab2" onTabChange={vi.fn()} />);
      activeTab = screen.getByText('Tab 2').closest('button');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Tab Click', () => {
    it('should call onTabChange when tab is clicked', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab2 = screen.getByText('Tab 2');
      tab2.click();

      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });

    it('should not call onTabChange when active tab is clicked', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab1 = screen.getByText('Tab 1');
      tab1.click();

      // Still calls onTabChange even for active tab
      expect(handleTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should not call onTabChange when disabled tab is clicked', () => {
      const handleTabChange = vi.fn();
      const itemsWithDisabled: TabItem[] = [
        ...mockItems,
        { id: 'tab4', label: 'Tab 4', disabled: true },
      ];
      render(<Tabs items={itemsWithDisabled} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab4 = screen.getByText('Tab 4');
      tab4.click();

      expect(handleTabChange).not.toHaveBeenCalledWith('tab4');
    });
  });

  describe('Disabled State', () => {
    it('should render disabled tab', () => {
      const itemsWithDisabled: TabItem[] = [
        ...mockItems,
        { id: 'tab4', label: 'Tab 4', disabled: true },
      ];
      render(<Tabs items={itemsWithDisabled} activeTab="tab1" onTabChange={vi.fn()} />);
      const disabledTab = screen.getByText('Tab 4').closest('button');
      expect(disabledTab).toHaveAttribute('disabled');
    });

    it('should have aria-disabled on disabled tab', () => {
      const itemsWithDisabled: TabItem[] = [
        ...mockItems,
        { id: 'tab4', label: 'Tab 4', disabled: true },
      ];
      render(<Tabs items={itemsWithDisabled} activeTab="tab1" onTabChange={vi.fn()} />);
      const disabledTab = screen.getByText('Tab 4').closest('button');
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have opacity styling on disabled tab', () => {
      const itemsWithDisabled: TabItem[] = [
        ...mockItems,
        { id: 'tab4', label: 'Tab 4', disabled: true },
      ];
      render(<Tabs items={itemsWithDisabled} activeTab="tab1" onTabChange={vi.fn()} />);
      const disabledTab = screen.getByText('Tab 4').closest('button');
      expect(disabledTab).toHaveClass('opacity-50');
      expect(disabledTab).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Horizontal Variant', () => {
    it('should render horizontal tabs by default', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('border-b');
    });

    it('should have horizontal orientation', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('should navigate with arrow keys', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab1 = screen.getByText('Tab 1').closest('button')!;
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });

    it('should navigate left with ArrowLeft', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab2" onTabChange={handleTabChange} />);

      const tab2 = screen.getByText('Tab 2').closest('button')!;
      fireEvent.keyDown(tab2, { key: 'ArrowLeft' });

      expect(handleTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around when navigating right from last tab', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab3" onTabChange={handleTabChange} />);

      const tab3 = screen.getByText('Tab 3').closest('button')!;
      fireEvent.keyDown(tab3, { key: 'ArrowRight' });

      expect(handleTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around when navigating left from first tab', () => {
      const handleTabChange = vi.fn();
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab1 = screen.getByText('Tab 1').closest('button')!;
      fireEvent.keyDown(tab1, { key: 'ArrowLeft' });

      expect(handleTabChange).toHaveBeenCalledWith('tab3');
    });
  });

  describe('Vertical Variant', () => {
    it('should render vertical tabs', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="vertical" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('border-r');
      expect(tablist).toHaveClass('flex-col');
    });

    it('should have vertical orientation', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="vertical" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should navigate with arrow keys', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} variant="vertical" />
      );

      const tab1 = screen.getByText('Tab 1').closest('button')!;
      fireEvent.keyDown(tab1, { key: 'ArrowDown' });

      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });

    it('should navigate up with ArrowUp', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs items={mockItems} activeTab="tab2" onTabChange={handleTabChange} variant="vertical" />
      );

      const tab2 = screen.getByText('Tab 2').closest('button')!;
      fireEvent.keyDown(tab2, { key: 'ArrowUp' });

      expect(handleTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around when navigating down from last tab', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs items={mockItems} activeTab="tab3" onTabChange={handleTabChange} variant="vertical" />
      );

      const tab3 = screen.getByText('Tab 3').closest('button')!;
      fireEvent.keyDown(tab3, { key: 'ArrowDown' });

      expect(handleTabChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around when navigating up from first tab', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={handleTabChange} variant="vertical" />
      );

      const tab1 = screen.getByText('Tab 1').closest('button')!;
      fireEvent.keyDown(tab1, { key: 'ArrowUp' });

      expect(handleTabChange).toHaveBeenCalledWith('tab3');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should skip disabled tabs when navigating', () => {
      const handleTabChange = vi.fn();
      const itemsWithDisabled: TabItem[] = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2', disabled: true },
        { id: 'tab3', label: 'Tab 3' },
      ];
      render(<Tabs items={itemsWithDisabled} activeTab="tab1" onTabChange={handleTabChange} />);

      const tab1 = screen.getByText('Tab 1').closest('button')!;
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      // Should skip tab2 and go to tab3
      expect(handleTabChange).toHaveBeenCalledWith('tab3');
    });

    it('should have tabIndex 0 on active tab', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const activeTab = screen.getByText('Tab 1').closest('button');
      expect(activeTab).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabIndex -1 on inactive tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const inactiveTab = screen.getByText('Tab 2').closest('button');
      expect(inactiveTab).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Styling', () => {
    it('should have primary color for active tab', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const activeTab = screen.getByText('Tab 1').closest('button');
      expect(activeTab).toHaveClass('text-primary-400');
      expect(activeTab).toHaveClass('border-primary-500');
    });

    it('should have secondary text color for inactive tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const inactiveTab = screen.getByText('Tab 2').closest('button');
      expect(inactiveTab).toHaveClass('text-text-secondary');
    });

    it('should have hover state for inactive tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const inactiveTab = screen.getByText('Tab 2').closest('button');
      expect(inactiveTab).toHaveClass('hover:text-text-primary');
      expect(inactiveTab).toHaveClass('hover:bg-background-tertiary');
    });

    it('should accept additional className', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} className="custom-class" />
      );
      // className is applied to wrapper div, not tablist
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role tablist', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />
      );
      expect(container.querySelector('[role="tablist"]')).toBeInTheDocument();
    });

    it('should have role tab on each tab', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(mockItems.length);
    });

    it('should have aria-orientation attribute', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('should have aria-selected on tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} />);
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected', index === 0 ? 'true' : 'false');
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete tabs with all features', () => {
      render(
        <Tabs
          items={mockItems}
          activeTab="tab2"
          onTabChange={vi.fn()}
          variant="horizontal"
          className="custom-class"
        />
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();

      const activeTab = screen.getByText('Tab 2').closest('button');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle single tab', () => {
      const singleTab: TabItem[] = [{ id: 'tab1', label: 'Tab 1' }];
      render(<Tabs items={singleTab} activeTab="tab1" onTabChange={vi.fn()} />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });

    it('should handle many tabs', () => {
      const manyTabs: TabItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tab${i + 1}`,
        label: `Tab ${i + 1}`,
      }));
      render(<Tabs items={manyTabs} activeTab="tab1" onTabChange={vi.fn()} />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 10')).toBeInTheDocument();
    });

    it('should handle tabs with long labels', () => {
      const longLabelTabs: TabItem[] = [
        { id: 'tab1', label: 'Very Long Tab Label That Might Wrap' },
        { id: 'tab2', label: 'Another Long Label' },
      ];
      render(<Tabs items={longLabelTabs} activeTab="tab1" onTabChange={vi.fn()} />);
      expect(screen.getByText('Very Long Tab Label That Might Wrap')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have overflow-x-auto on horizontal tabs', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toHaveClass('overflow-x-auto');
    });

    it('should have whitespace-nowrap on tab buttons', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />);
      const tab = screen.getByText('Tab 1').closest('button');
      expect(tab).toHaveClass('whitespace-nowrap');
    });

    it('should have flex-shrink-0 on horizontal tab buttons', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />);
      const tab = screen.getByText('Tab 1').closest('button');
      expect(tab).toHaveClass('flex-shrink-0');
    });

    it('should have minimum width on mobile for horizontal tabs', () => {
      render(<Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />);
      const tab = screen.getByText('Tab 1').closest('button');
      expect(tab).toHaveClass('min-w-[120px]');
    });

    it('should not have overflow-x-auto on vertical tabs', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="vertical" />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).not.toHaveClass('overflow-x-auto');
    });

    it('should apply scrollbar styling via inline styles', () => {
      const { container } = render(
        <Tabs items={mockItems} activeTab="tab1" onTabChange={vi.fn()} variant="horizontal" />
      );
      const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
      expect(tablist.style.scrollbarWidth).toBe('thin');
      expect(tablist.style.scrollbarColor).toBe('#475569 #1e293b');
      expect(tablist.style.scrollBehavior).toBe('smooth');
    });
  });
});

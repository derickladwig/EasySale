import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

const mockItems: BreadcrumbItem[] = [
  { label: 'Home', path: '/', onClick: vi.fn() },
  { label: 'Products', path: '/products', onClick: vi.fn() },
  { label: 'Electronics', path: '/products/electronics', onClick: vi.fn() },
  { label: 'Laptops', path: '/products/electronics/laptops', onClick: vi.fn() },
];

describe('Breadcrumbs', () => {
  describe('Rendering', () => {
    it('should render breadcrumbs', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should render all items', () => {
      render(<Breadcrumbs items={mockItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
    });

    it('should render with single item', () => {
      const singleItem: BreadcrumbItem[] = [{ label: 'Home' }];
      render(<Breadcrumbs items={singleItem} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should render with empty items', () => {
      const { container } = render(<Breadcrumbs items={[]} />);
      expect(container.querySelector('ol')).toBeInTheDocument();
    });
  });

  describe('Separators', () => {
    it('should render default separator between items', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      // Default separator is ChevronRight icon (SVG) wrapped in span with aria-hidden
      const separatorSpans = container.querySelectorAll('span[aria-hidden="true"]');
      expect(separatorSpans.length).toBe(mockItems.length - 1);
    });

    it('should render custom separator', () => {
      render(<Breadcrumbs items={mockItems} separator={<span>/</span>} />);
      const separators = screen.getAllByText('/');
      expect(separators.length).toBe(mockItems.length - 1);
    });

    it('should not render separator after last item', () => {
      const { container } = render(<Breadcrumbs items={mockItems} separator={<span>/</span>} />);
      const lastItem = screen.getByText('Laptops').closest('li');
      expect(lastItem?.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
    });

    it('should not render separator for single item', () => {
      const singleItem: BreadcrumbItem[] = [{ label: 'Home' }];
      const { container } = render(<Breadcrumbs items={singleItem} separator={<span>/</span>} />);
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render non-last items as buttons', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toBeInTheDocument();
    });

    it('should render last item as span', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Laptops');
      expect(lastItem.tagName).toBe('SPAN');
    });

    it('should have aria-current on last item', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Laptops');
      expect(lastItem).toHaveAttribute('aria-current', 'page');
    });

    it('should call onClick when item is clicked', () => {
      const handleClick = vi.fn();
      const items: BreadcrumbItem[] = [
        { label: 'Home', onClick: handleClick },
        { label: 'Products' },
      ];
      render(<Breadcrumbs items={items} />);

      const homeButton = screen.getByText('Home');
      homeButton.click();

      expect(handleClick).toHaveBeenCalled();
    });

    it('should not call onClick for last item', () => {
      const handleClick = vi.fn();
      const items: BreadcrumbItem[] = [
        { label: 'Home' },
        { label: 'Products', onClick: handleClick },
      ];
      render(<Breadcrumbs items={items} />);

      const productsSpan = screen.getByText('Products');
      productsSpan.click();

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should work without onClick handler', () => {
      const items: BreadcrumbItem[] = [{ label: 'Home' }, { label: 'Products' }];
      render(<Breadcrumbs items={items} />);

      const homeButton = screen.getByText('Home');
      expect(() => homeButton.click()).not.toThrow();
    });
  });

  describe('Truncation', () => {
    it('should not truncate when items <= maxItems', () => {
      render(<Breadcrumbs items={mockItems} maxItems={5} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
    });

    it('should truncate when items > maxItems', () => {
      render(<Breadcrumbs items={mockItems} maxItems={3} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
      expect(screen.queryByText('Products')).not.toBeInTheDocument();
    });

    it('should show first item and last (maxItems - 1) items', () => {
      const manyItems: BreadcrumbItem[] = [
        { label: 'Item 1' },
        { label: 'Item 2' },
        { label: 'Item 3' },
        { label: 'Item 4' },
        { label: 'Item 5' },
        { label: 'Item 6' },
      ];
      render(<Breadcrumbs items={manyItems} maxItems={3} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('Item 5')).toBeInTheDocument();
      expect(screen.getByText('Item 6')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 4')).not.toBeInTheDocument();
    });

    it('should render ellipsis as non-clickable', () => {
      render(<Breadcrumbs items={mockItems} maxItems={3} />);
      const ellipsis = screen.getByText('...');
      expect(ellipsis.tagName).toBe('SPAN');
    });

    it('should not truncate when maxItems is not specified', () => {
      render(<Breadcrumbs items={mockItems} />);
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have primary color for clickable items', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveClass('text-primary-400');
    });

    it('should have dark color for last item', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Laptops');
      expect(lastItem).toHaveClass('text-text-primary');
    });

    it('should have hover state for clickable items', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveClass('hover:text-primary-300');
    });

    it('should truncate long labels', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveClass('truncate');
      expect(homeButton).toHaveClass('max-w-[200px]');
    });

    it('should accept additional className', () => {
      const { container } = render(<Breadcrumbs items={mockItems} className="custom-class" />);
      expect(container.querySelector('nav')).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for navigation', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('should have aria-hidden on separators', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const separators = container.querySelectorAll('[aria-hidden="true"]');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should have aria-current on last item', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Laptops');
      expect(lastItem).toHaveAttribute('aria-current', 'page');
    });

    it('should use semantic ol element', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      expect(container.querySelector('ol')).toBeInTheDocument();
    });

    it('should use semantic li elements', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(mockItems.length);
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete breadcrumbs with all features', () => {
      render(
        <Breadcrumbs
          items={mockItems}
          separator={<span>›</span>}
          maxItems={4}
          className="custom-class"
        />
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
      expect(screen.getAllByText('›').length).toBe(3);
    });

    it('should handle very long paths', () => {
      const longPath: BreadcrumbItem[] = Array.from({ length: 10 }, (_, i) => ({
        label: `Level ${i + 1}`,
        path: `/level${i + 1}`,
      }));
      render(<Breadcrumbs items={longPath} maxItems={4} />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByText('Level 8')).toBeInTheDocument();
      expect(screen.getByText('Level 9')).toBeInTheDocument();
      expect(screen.getByText('Level 10')).toBeInTheDocument();
    });

    it('should handle items with very long labels', () => {
      const longLabelItems: BreadcrumbItem[] = [
        { label: 'Home' },
        { label: 'Very Long Category Name That Should Be Truncated' },
      ];
      render(<Breadcrumbs items={longLabelItems} />);
      expect(
        screen.getByText('Very Long Category Name That Should Be Truncated')
      ).toBeInTheDocument();
    });

    it('should handle items without paths', () => {
      const itemsWithoutPaths: BreadcrumbItem[] = [{ label: 'Home' }, { label: 'Products' }];
      render(<Breadcrumbs items={itemsWithoutPaths} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
    });

    it('should handle mixed items with and without onClick', () => {
      const handleClick = vi.fn();
      const mixedItems: BreadcrumbItem[] = [
        { label: 'Home', onClick: handleClick },
        { label: 'Products' },
        { label: 'Electronics' },
      ];
      render(<Breadcrumbs items={mixedItems} />);

      const homeButton = screen.getByText('Home');
      homeButton.click();

      expect(handleClick).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import { BreadcrumbItem } from './Breadcrumbs';
import { TabItem } from './Tabs';
import { Home, Settings } from 'lucide-react';

const mockBreadcrumbs: BreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Electronics', path: '/products/electronics' },
];

const mockTabs: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'settings', label: 'Settings', icon: Settings },
];

describe('PageHeader', () => {
  describe('Rendering', () => {
    it('should render page header', () => {
      const { container } = render(<PageHeader title="Test Page" />);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('should render title as h1', () => {
      render(<PageHeader title="Test Page" />);
      const title = screen.getByText('Test Page');
      expect(title.tagName).toBe('H1');
    });

    it('should render description when provided', () => {
      render(<PageHeader title="Test Page" description="This is a test page" />);
      expect(screen.getByText('This is a test page')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<PageHeader title="Test Page" />);
      expect(container.querySelector('p')).not.toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it('should render breadcrumbs when provided', () => {
      render(<PageHeader title="Test Page" breadcrumbs={mockBreadcrumbs} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    it('should not render breadcrumbs when not provided', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('should not render breadcrumbs when empty array', () => {
      render(<PageHeader title="Test Page" breadcrumbs={[]} />);
      expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render actions when provided', () => {
      render(<PageHeader title="Test Page" actions={<button>Action Button</button>} />);
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should not render actions when not provided', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.queryByText('Action Button')).not.toBeInTheDocument();
    });

    it('should render multiple actions', () => {
      render(
        <PageHeader
          title="Test Page"
          actions={
            <>
              <button>Action 1</button>
              <button>Action 2</button>
            </>
          }
        />
      );
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('should render tabs when provided', () => {
      render(
        <PageHeader title="Test Page" tabs={mockTabs} activeTab="overview" onTabChange={vi.fn()} />
      );
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should not render tabs when not provided', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('should not render tabs when empty array', () => {
      render(<PageHeader title="Test Page" tabs={[]} onTabChange={vi.fn()} />);
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('should not render tabs when onTabChange is not provided', () => {
      render(<PageHeader title="Test Page" tabs={mockTabs} />);
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('should call onTabChange when tab is clicked', () => {
      const handleTabChange = vi.fn();
      render(
        <PageHeader
          title="Test Page"
          tabs={mockTabs}
          activeTab="overview"
          onTabChange={handleTabChange}
        />
      );

      const settingsTab = screen.getByText('Settings');
      settingsTab.click();

      expect(handleTabChange).toHaveBeenCalledWith('settings');
    });

    it('should highlight active tab', () => {
      render(
        <PageHeader title="Test Page" tabs={mockTabs} activeTab="overview" onTabChange={vi.fn()} />
      );

      const overviewTab = screen.getByText('Overview').closest('button');
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Styling', () => {
    it('should have dark theme colors', () => {
      const { container } = render(<PageHeader title="Test Page" />);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('bg-background-primary');
      expect(header).toHaveClass('border-border');
    });

    it('should have responsive padding', () => {
      const { container } = render(<PageHeader title="Test Page" />);
      const content = container.querySelector('.px-4');
      expect(content).toHaveClass('md:px-6');
    });

    it('should truncate long titles', () => {
      render(<PageHeader title="Very Long Title That Should Be Truncated" />);
      const title = screen.getByText('Very Long Title That Should Be Truncated');
      expect(title).toHaveClass('truncate');
    });

    it('should clamp long descriptions', () => {
      render(
        <PageHeader
          title="Test Page"
          description="Very long description that should be clamped to two lines"
        />
      );
      const description = screen.getByText(
        'Very long description that should be clamped to two lines'
      );
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should accept additional className', () => {
      const { container } = render(<PageHeader title="Test Page" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Responsive Layout', () => {
    it('should stack title and actions on mobile', () => {
      render(<PageHeader title="Test Page" actions={<button>Action</button>} />);

      const container = screen.getByText('Test Page').closest('div')?.parentElement;
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('md:flex-row');
    });

    it('should have responsive title size', () => {
      render(<PageHeader title="Test Page" />);
      const title = screen.getByText('Test Page');
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('md:text-3xl');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render complete page header with all features', () => {
      render(
        <PageHeader
          title="Test Page"
          description="This is a test page"
          breadcrumbs={mockBreadcrumbs}
          tabs={mockTabs}
          activeTab="overview"
          onTabChange={vi.fn()}
          actions={<button>Action</button>}
          className="custom-class"
        />
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('This is a test page')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should work with minimal props', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle =
        'Very Long Page Title That Should Be Truncated When It Exceeds The Available Width';
      render(<PageHeader title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescription =
        'Very long description that should be clamped to two lines when it exceeds the available space and continues for multiple lines';
      render(<PageHeader title="Test Page" description={longDescription} />);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle many breadcrumbs', () => {
      const manyBreadcrumbs: BreadcrumbItem[] = Array.from({ length: 10 }, (_, i) => ({
        label: `Level ${i + 1}`,
        path: `/level${i + 1}`,
      }));
      render(<PageHeader title="Test Page" breadcrumbs={manyBreadcrumbs} />);
      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });

    it('should handle many tabs', () => {
      const manyTabs: TabItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tab${i + 1}`,
        label: `Tab ${i + 1}`,
      }));
      render(
        <PageHeader title="Test Page" tabs={manyTabs} activeTab="tab1" onTabChange={vi.fn()} />
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 10')).toBeInTheDocument();
    });
  });
});

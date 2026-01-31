import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import * as useBreakpointModule from '../hooks/useBreakpoint';

// Mock useBreakpoint hook
vi.mock('../hooks/useBreakpoint');

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop
    vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
      breakpoint: 'desktop' as const,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isDesktopLg: false,
      width: 1200,
    });
  });

  describe('Basic Rendering', () => {
    it('renders title correctly', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<PageHeader title="Test Page" subtitle="This is a subtitle" />);
      expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
    });

    it('does not render subtitle when not provided', () => {
      const { container } = render(<PageHeader title="Test Page" />);
      const subtitle = container.querySelector('p');
      expect(subtitle).not.toBeInTheDocument();
    });

    it('renders actions when provided', () => {
      render(
        <PageHeader
          title="Test Page"
          actions={<button>Action Button</button>}
        />
      );
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it('renders breadcrumbs on desktop', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Details' },
      ];

      render(<PageHeader title="Product Details" breadcrumbs={breadcrumbs} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('renders breadcrumb links correctly', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Current' },
      ];

      render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

      const homeLink = screen.getByText('Home');
      expect(homeLink.tagName).toBe('A');
      expect(homeLink).toHaveAttribute('href', '/');

      const currentCrumb = screen.getByText('Current');
      expect(currentCrumb.tagName).toBe('SPAN');
      expect(currentCrumb).not.toHaveAttribute('href');
    });

    it('hides breadcrumbs on mobile', () => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "mobile" as const,
        isMobile: true,
        isDesktopLg: false,
        width: 400,
        isTablet: false,
        isDesktop: false,
      });

      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Products' },
      ];

      const { container } = render(
        <PageHeader title="Test" breadcrumbs={breadcrumbs} />
      );

      const nav = container.querySelector('nav');
      expect(nav).not.toBeInTheDocument();
    });

    it('does not render breadcrumbs when empty array', () => {
      const { container } = render(<PageHeader title="Test" breadcrumbs={[]} />);
      const nav = container.querySelector('nav');
      expect(nav).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('uses flex-col layout on mobile', () => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "mobile" as const,
        isMobile: true,
        isDesktopLg: false,
        width: 400,
        isTablet: false,
        isDesktop: false,
      });

      const { container } = render(
        <PageHeader
          title="Test"
          actions={<button>Action</button>}
        />
      );

      const layoutDiv = container.querySelector('.flex-col');
      expect(layoutDiv).toBeInTheDocument();
    });

    it('uses horizontal layout on desktop', () => {
      const { container } = render(
        <PageHeader
          title="Test"
          actions={<button>Action</button>}
        />
      );

      const layoutDiv = container.querySelector('.justify-between');
      expect(layoutDiv).toBeInTheDocument();
    });

    it('makes actions full-width on mobile', () => {
      vi.mocked(useBreakpointModule.useBreakpoint).mockReturnValue({
        breakpoint: "mobile" as const,
        isMobile: true,
        isDesktopLg: false,
        width: 400,
        isTablet: false,
        isDesktop: false,
      });

      render(
        <PageHeader
          title="Test"
          actions={<button>Action</button>}
        />
      );

      const actionButton = screen.getByText('Action');
      const actionContainer = actionButton.parentElement;
      expect(actionContainer).toHaveClass('w-full');
    });
  });

  describe('Spacing Tokens', () => {
    it('uses design token spacing for padding', () => {
      const { container } = render(<PageHeader title="Test" />);
      const headerDiv = container.querySelector('.px-4');
      expect(headerDiv).toBeInTheDocument();
    });

    it('uses design token spacing for margins', () => {
      const breadcrumbs = [{ label: 'Home' }];
      const { container } = render(
        <PageHeader title="Test" breadcrumbs={breadcrumbs} />
      );
      const nav = container.querySelector('.mb-2');
      expect(nav).toBeInTheDocument();
    });

    it('enforces consistent spacing between elements', () => {
      render(
        <PageHeader
          title="Test"
          subtitle="Subtitle"
          actions={<button>Action</button>}
        />
      );

      const subtitle = screen.getByText('Subtitle');
      expect(subtitle).toHaveClass('mt-1');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading element', () => {
      render(<PageHeader title="Test Page" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Page');
    });

    it('uses semantic nav element for breadcrumbs', () => {
      const breadcrumbs = [{ label: 'Home', href: '/' }];
      const { container } = render(
        <PageHeader title="Test" breadcrumbs={breadcrumbs} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('truncates long titles for readability', () => {
      render(<PageHeader title="Very Long Title That Should Be Truncated" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('truncate');
    });

    it('limits subtitle to 2 lines', () => {
      render(
        <PageHeader
          title="Test"
          subtitle="Very long subtitle that should be limited to two lines"
        />
      );
      const subtitle = screen.getByText(/Very long subtitle/);
      expect(subtitle).toHaveClass('line-clamp-2');
    });
  });

  describe('Visual Styling', () => {
    it('applies border and background styling', () => {
      const { container } = render(<PageHeader title="Test" />);
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('bg-surface-base', 'border-b', 'border-border');
    });

    it('applies responsive text sizing', () => {
      render(<PageHeader title="Test" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'lg:text-4xl');
    });

    it('applies responsive padding', () => {
      const { container } = render(<PageHeader title="Test" />);
      const innerDiv = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
      expect(innerDiv).toBeInTheDocument();
    });
  });
});

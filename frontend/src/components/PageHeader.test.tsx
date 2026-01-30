/**
 * PageHeader Component Tests
 * 
 * Unit tests for the PageHeader component.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('should render title', () => {
    render(<PageHeader title="Test Page" />);
    
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Test Page');
  });

  it('should render without breadcrumbs when not provided', () => {
    render(<PageHeader title="Test Page" />);
    
    const nav = screen.queryByRole('navigation', { name: /breadcrumb/i });
    expect(nav).not.toBeInTheDocument();
  });

  it('should render breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Details' },
    ];

    render(<PageHeader title="Product Details" breadcrumbs={breadcrumbs} />);
    
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    
    // Check all breadcrumb items are rendered
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('should render breadcrumb links with href', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Current' },
    ];

    render(<PageHeader title="Test Page" breadcrumbs={breadcrumbs} />);
    
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
    
    // Current breadcrumb should not be a link
    const currentText = screen.getByText('Current');
    expect(currentText).not.toHaveAttribute('href');
  });

  it('should render breadcrumb separators between items', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Details' },
    ];

    render(<PageHeader title="Test Page" breadcrumbs={breadcrumbs} />);
    
    // Should have 2 separators for 3 items
    const separators = screen.getAllByText('/', { selector: '[aria-hidden="true"]' });
    expect(separators).toHaveLength(2);
  });

  it('should render without actions when not provided', () => {
    const { container } = render(<PageHeader title="Test Page" />);
    
    const actionsDiv = container.querySelector('[class*="actions"]');
    expect(actionsDiv).not.toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(
      <PageHeader
        title="Test Page"
        actions={
          <button type="button">Add Item</button>
        }
      />
    );
    
    const button = screen.getByRole('button', { name: 'Add Item' });
    expect(button).toBeInTheDocument();
  });

  it('should render multiple actions', () => {
    render(
      <PageHeader
        title="Test Page"
        actions={
          <>
            <button type="button">Edit</button>
            <button type="button">Delete</button>
          </>
        }
      />
    );
    
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should render all elements together', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Current' },
    ];

    render(
      <PageHeader
        title="Test Page"
        breadcrumbs={breadcrumbs}
        actions={<button type="button">Action</button>}
      />
    );
    
    // All elements should be present
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('should handle empty breadcrumbs array', () => {
    render(<PageHeader title="Test Page" breadcrumbs={[]} />);
    
    const nav = screen.queryByRole('navigation', { name: /breadcrumb/i });
    expect(nav).not.toBeInTheDocument();
  });
});

describe('PageHeader - Theme Compatibility', () => {
  beforeEach(() => {
    // Set up HTML element for theme testing
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-accent', 'blue');
  });

  afterEach(() => {
    // Clean up
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
  });

  it('should render correctly in light theme', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    
    const { container } = render(
      <PageHeader
        title="Test Page"
        breadcrumbs={[{ label: 'Home', href: '/' }]}
        actions={<button type="button">Action</button>}
      />
    );
    
    // Component should render without errors
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');
  });

  it('should render correctly in dark theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    const { container } = render(
      <PageHeader
        title="Test Page"
        breadcrumbs={[{ label: 'Home', href: '/' }]}
        actions={<button type="button">Action</button>}
      />
    );
    
    // Component should render without errors
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');
  });

  it('should use design tokens for styling', () => {
    const { container } = render(<PageHeader title="Test Page" />);
    
    const pageHeader = container.firstChild as HTMLElement;
    expect(pageHeader).toBeInTheDocument();
    
    // Verify the component has the correct class
    expect(pageHeader.className).toContain('pageHeader');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';
import { Toolbar } from '../Toolbar';
import { EmptyState } from '../EmptyState';
import { InlineAlert } from '../InlineAlert';
import { Badge } from '../Badge';

describe('SectionHeader', () => {
  it('should render title', () => {
    render(<SectionHeader title="Section Title" />);
    
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('should render helper text', () => {
    render(
      <SectionHeader 
        title="Settings" 
        helperText="Configure your preferences"
      />
    );
    
    expect(screen.getByText('Configure your preferences')).toBeInTheDocument();
  });

  it('should render actions', () => {
    render(
      <SectionHeader 
        title="Users" 
        actions={<button>Add User</button>}
      />
    );
    
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });
});

describe('Toolbar', () => {
  it('should render search section', () => {
    render(
      <Toolbar search={<input placeholder="Search..." />} />
    );
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('should render filters section', () => {
    render(
      <Toolbar filters={<button>Filter</button>} />
    );
    
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('should render actions section', () => {
    render(
      <Toolbar actions={<button>Export</button>} />
    );
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should render all sections together', () => {
    render(
      <Toolbar 
        search={<input placeholder="Search..." />}
        filters={<button>Filter</button>}
        actions={<button>Export</button>}
      />
    );
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('should render message', () => {
    render(<EmptyState message="No items found" />);
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render title and message', () => {
    render(
      <EmptyState 
        title="No Results" 
        message="Try adjusting your search"
      />
    );
    
    expect(screen.getByText('No Results')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('should render icon', () => {
    render(
      <EmptyState 
        message="No data" 
        icon={<span data-testid="custom-icon">📭</span>}
      />
    );
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should render action button', () => {
    render(
      <EmptyState 
        message="No items" 
        action={<button>Create Item</button>}
      />
    );
    
    expect(screen.getByText('Create Item')).toBeInTheDocument();
  });
});

describe('InlineAlert', () => {
  it('should render content', () => {
    render(<InlineAlert>This is an alert message</InlineAlert>);
    
    expect(screen.getByText('This is an alert message')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(
      <InlineAlert title="Important">
        Please read this carefully
      </InlineAlert>
    );
    
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Please read this carefully')).toBeInTheDocument();
  });

  it('should apply info variant by default', () => {
    render(<InlineAlert>Info message</InlineAlert>);
    
    const alert = screen.getByTestId('inline-alert');
    expect(alert.className).toContain('info');
  });

  it('should apply success variant', () => {
    render(<InlineAlert variant="success">Success message</InlineAlert>);
    
    const alert = screen.getByTestId('inline-alert');
    expect(alert.className).toContain('success');
  });

  it('should apply warning variant', () => {
    render(<InlineAlert variant="warning">Warning message</InlineAlert>);
    
    const alert = screen.getByTestId('inline-alert');
    expect(alert.className).toContain('warning');
  });

  it('should apply error variant', () => {
    render(<InlineAlert variant="error">Error message</InlineAlert>);
    
    const alert = screen.getByTestId('inline-alert');
    expect(alert.className).toContain('error');
  });

  it('should have role="alert"', () => {
    render(<InlineAlert>Alert message</InlineAlert>);
    
    const alert = screen.getByTestId('inline-alert');
    expect(alert).toHaveAttribute('role', 'alert');
  });
});

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Active</Badge>);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply default variant by default', () => {
    render(<Badge>Label</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('default');
  });

  it('should apply primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('primary');
  });

  it('should apply success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('success');
  });

  it('should apply warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('warning');
  });

  it('should apply error variant', () => {
    render(<Badge variant="error">Error</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('error');
  });

  it('should apply info variant', () => {
    render(<Badge variant="info">Info</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('info');
  });

  it('should apply medium size by default', () => {
    render(<Badge>Medium</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('md');
  });

  it('should apply small size', () => {
    render(<Badge size="sm">Small</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('sm');
  });
});

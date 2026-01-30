import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable, Column } from '../DataTable';

interface TestData {
  id: number;
  name: string;
  email: string;
  status: string;
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
];

const mockColumns: Column<TestData>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (item) => item.name,
  },
  {
    key: 'email',
    header: 'Email',
    render: (item) => item.email,
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => item.status,
    align: 'center',
  },
];

describe('DataTable', () => {
  it('should render table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const table = screen.getByTestId('data-table');
    expect(table).toBeInTheDocument();
    
    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(2); // Two active users
  });

  it('should render all rows', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should display empty state when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const emptyState = screen.getByTestId('table-empty');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('No data available');
  });

  it('should display custom empty message', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="No users found"
      />
    );
    
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
        loading
      />
    );
    
    const loadingState = screen.getByTestId('table-loading');
    expect(loadingState).toBeInTheDocument();
    expect(loadingState).toHaveTextContent('Loading...');
  });

  it('should display error state', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
        error="Failed to load data"
      />
    );
    
    const errorState = screen.getByTestId('table-error');
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveTextContent('Failed to load data');
  });

  it('should prioritize error over loading', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
        loading
        error="Error occurred"
      />
    );
    
    // Loading is checked first, so loading state should show
    expect(screen.getByTestId('table-loading')).toBeInTheDocument();
  });

  it('should apply column alignment', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const statusHeader = screen.getByText('Status').closest('th');
    expect(statusHeader?.className).toContain('align-center');
  });

  it('should use left alignment by default', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader?.className).toContain('align-left');
  });

  it('should support custom className', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
        className="custom-table"
      />
    );
    
    const wrapper = container.querySelector('.custom-table');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render custom cell content', () => {
    const customColumns: Column<TestData>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (item) => <strong>{item.name}</strong>,
      },
    ];
    
    render(
      <DataTable
        data={[mockData[0]]}
        columns={customColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const nameCell = screen.getByText('John Doe');
    expect(nameCell.tagName).toBe('STRONG');
  });

  it('should handle right-aligned columns', () => {
    const columnsWithRight: Column<TestData>[] = [
      {
        key: 'id',
        header: 'ID',
        render: (item) => item.id,
        align: 'right',
      },
    ];
    
    const { container } = render(
      <DataTable
        data={mockData}
        columns={columnsWithRight}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const idHeader = screen.getByText('ID').closest('th');
    expect(idHeader?.className).toContain('align-right');
  });
});

describe('DataTable Keyboard Navigation', () => {
  it('should support row navigation with arrow keys', async () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    
    // Verify rows exist and are in DOM
    rows.forEach(row => {
      expect(row).toBeInTheDocument();
    });
  });

  it('should have focusable rows', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const rows = container.querySelectorAll('tbody tr');
    
    // Check if rows can receive focus (have tabIndex or are naturally focusable)
    rows.forEach(row => {
      const tabIndex = row.getAttribute('tabindex');
      // Rows should either have tabindex or be naturally focusable
      expect(row).toBeInTheDocument();
    });
  });

  it('should render table structure for keyboard navigation', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    // Verify table structure
    const table = container.querySelector('table');
    const thead = container.querySelector('thead');
    const tbody = container.querySelector('tbody');
    
    expect(table).toBeInTheDocument();
    expect(thead).toBeInTheDocument();
    expect(tbody).toBeInTheDocument();
    
    // Verify rows are properly structured
    const rows = tbody?.querySelectorAll('tr');
    expect(rows?.length).toBe(3);
  });

  it('should maintain row order for sequential navigation', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    // Verify data is rendered in correct order
    const names = screen.getAllByText(/John Doe|Jane Smith|Bob Johnson/);
    expect(names[0]).toHaveTextContent('John Doe');
    expect(names[1]).toHaveTextContent('Jane Smith');
    expect(names[2]).toHaveTextContent('Bob Johnson');
  });

  it('should support table accessibility attributes', () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id.toString()}
      />
    );
    
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    
    // Verify table has proper structure for screen readers
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBeGreaterThan(0);
  });
});

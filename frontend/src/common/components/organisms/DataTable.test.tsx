import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataTable } from './DataTable';
import { Package } from 'lucide-react';

interface TestData {
  id: number;
  name: string;
  email: string;
  age: number;
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
];

const mockColumns = [
  { key: 'name' as keyof TestData, header: 'Name', sortable: true },
  { key: 'email' as keyof TestData, header: 'Email', sortable: true },
  { key: 'age' as keyof TestData, header: 'Age', sortable: true },
];

describe('DataTable', () => {
  describe('Basic Rendering', () => {
    it('renders table with data', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Row Selection (Requirement 9.4)', () => {
    it('renders checkboxes when onSelectionChange is provided', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={[]}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Should have 1 header checkbox + 3 row checkboxes
      expect(checkboxes).toHaveLength(4);
    });

    it('selects individual row when checkbox is clicked', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={[]}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Click first data row checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith([mockData[0]]);
    });

    it('selects all rows when header checkbox is clicked', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={[]}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Click header checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith(mockData);
    });

    it('deselects all rows when header checkbox is clicked again', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={mockData}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Click header checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith([]);
    });

    it('shows indeterminate state when some rows are selected', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={[mockData[0]]}
          onSelectionChange={handleSelectionChange}
        />
      );

      const headerCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
      expect(headerCheckbox.indeterminate).toBe(true);
    });

    it('highlights selected rows with blue background', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          selectedRows={[mockData[0]]}
          onSelectionChange={vi.fn()}
        />
      );

      const rows = screen.getAllByRole('row');
      // First data row (index 1, after header) should have selected styling
      expect(rows[1]).toHaveClass('bg-primary-500/20');
    });
  });

  describe('Loading States (Requirement 9.5)', () => {
    it('displays skeleton rows when loading', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={[]} loading={true} skeletonRows={3} />);

      // Should show 3 skeleton rows
      const skeletonRows = screen.getAllByRole('row').filter((row) => {
        const cells = within(row).queryAllByRole('cell');
        return cells.some((cell) => {
          const skeleton = cell.querySelector('.animate-pulse');
          return skeleton !== null;
        });
      });

      expect(skeletonRows).toHaveLength(3);
    });

    it('displays custom number of skeleton rows', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={[]} loading={true} skeletonRows={7} />);

      const skeletonRows = screen.getAllByRole('row').filter((row) => {
        const cells = within(row).queryAllByRole('cell');
        return cells.some((cell) => {
          const skeleton = cell.querySelector('.animate-pulse');
          return skeleton !== null;
        });
      });

      expect(skeletonRows).toHaveLength(7);
    });

    it('does not display data when loading', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} loading={true} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Empty States (Requirement 9.6)', () => {
    it('displays empty message when no data', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns} data={[]} emptyMessage="No users found" />
      );

      // Empty message appears in both mobile and desktop views
      const emptyMessages = screen.getAllByText('No users found');
      expect(emptyMessages.length).toBeGreaterThan(0);
    });

    it('displays custom empty icon', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={[]}
          emptyMessage="No products"
          emptyIcon={<Package data-testid="custom-icon" size={48} />}
        />
      );

      // Custom icon appears in both mobile and desktop views
      const customIcons = screen.getAllByTestId('custom-icon');
      expect(customIcons.length).toBeGreaterThan(0);
    });

    it('displays empty action button', () => {
      const handleAction = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={[]}
          emptyMessage="No data"
          emptyAction={{ label: 'Add Item', onClick: handleAction }}
        />
      );

      // Button appears in both mobile and desktop views
      const buttons = screen.getAllByRole('button', { name: 'Add Item' });
      expect(buttons.length).toBeGreaterThan(0);

      fireEvent.click(buttons[0]);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('does not show empty state when loading', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={[]}
          loading={true}
          emptyMessage="No data"
        />
      );

      expect(screen.queryByText('No data')).not.toBeInTheDocument();
    });
  });

  describe('Sticky Headers (Requirement 9.7)', () => {
    it('applies sticky positioning when stickyHeader is true', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} stickyHeader={true} />);

      const thead = screen.getAllByRole('row')[0].parentElement;
      expect(thead).toHaveClass('sticky', 'top-0', 'z-10');
    });

    it('does not apply sticky positioning by default', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} />);

      const thead = screen.getAllByRole('row')[0].parentElement;
      expect(thead).not.toHaveClass('sticky');
    });
  });

  describe('Sorting (Requirement 9.3)', () => {
    it('calls onSort when sortable column header is clicked', () => {
      const handleSort = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          onSort={handleSort}
          sortColumn="name"
          sortDirection="asc"
        />
      );

      fireEvent.click(screen.getByText('Name'));
      expect(handleSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('displays sort indicator for sorted column', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns}
          data={mockData}
          onSort={vi.fn()}
          sortColumn="name"
          sortDirection="asc"
        />
      );

      const nameHeader = screen.getByText('Name').parentElement;
      const sortIcon = nameHeader?.querySelector('svg');
      expect(sortIcon).toHaveClass('text-primary-500', 'opacity-100');
    });
  });

  describe('Row Hover (Requirement 9.2)', () => {
    it('applies hover state when mouse enters row', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row

      fireEvent.mouseEnter(firstDataRow);
      expect(firstDataRow).toHaveClass('bg-background-tertiary');
    });

    it('removes hover state when mouse leaves row', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];

      fireEvent.mouseEnter(firstDataRow);
      fireEvent.mouseLeave(firstDataRow);
      
      // Should return to alternating color (even row)
      expect(firstDataRow).toHaveClass('bg-background-primary');
    });
  });

  describe('Alternating Row Colors (Requirement 9.1)', () => {
    it('applies alternating background colors to rows', () => {
      render(<DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      expect(rows[1]).toHaveClass('bg-background-primary'); // Even row (index 0)
      expect(rows[2]).toHaveClass('bg-background-secondary'); // Odd row (index 1)
      expect(rows[3]).toHaveClass('bg-background-primary'); // Even row (index 2)
    });
  });

  describe('Row Click', () => {
    it('calls onRowClick when row is clicked', () => {
      const handleRowClick = vi.fn();
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} onRowClick={handleRowClick} />
      );

      const rows = screen.getAllByRole('row');
      fireEvent.click(rows[1]); // Click first data row

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('applies cursor-pointer class when onRowClick is provided', () => {
      render(
        <DataTable mobileCardLayout={false} columns={mockColumns} data={mockData} onRowClick={vi.fn()} />
      );

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveClass('cursor-pointer');
    });
  });

  describe('Custom Cell Rendering', () => {
    it('uses custom render function when provided', () => {
      const customColumns = [
        {
          key: 'name' as keyof TestData,
          header: 'Name',
          render: (value: string) => <strong data-testid="custom-cell">{value}</strong>,
        },
      ];

      render(<DataTable mobileCardLayout={false} columns={customColumns} data={mockData} />);

      const customCells = screen.getAllByTestId('custom-cell');
      // With mobile disabled, only desktop view shows = 3 cells
      expect(customCells).toHaveLength(3);
      expect(customCells[0]).toHaveTextContent('John Doe');
    });
  });

  describe('Column Width', () => {
    it('applies custom width to columns', () => {
      const columnsWithWidth = [
        { key: 'name' as keyof TestData, header: 'Name', width: '200px' },
        { key: 'email' as keyof TestData, header: 'Email', width: '300px' },
      ];

      render(<DataTable mobileCardLayout={false} columns={columnsWithWidth} data={mockData} />);

      const headers = screen.getAllByRole('columnheader');
      expect(headers[0]).toHaveStyle({ width: '200px' });
      expect(headers[1]).toHaveStyle({ width: '300px' });
    });
  });
});


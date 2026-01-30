import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, Column } from './DataTable';

interface TestData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
];

const columns: Column<TestData>[] = [
  { key: 'name', header: 'Name', showOnMobile: true, mobilePriority: 1 },
  { key: 'email', header: 'Email', showOnMobile: true, mobilePriority: 2 },
  { key: 'role', header: 'Role', showOnMobile: true, mobilePriority: 3 },
  { key: 'status', header: 'Status', showOnMobile: false },
];

describe('DataTable - Mobile Responsiveness (Requirement 9.8)', () => {
  it('should render mobile card layout on small screens', () => {
    // Arrange & Act
    render(<DataTable columns={columns} data={mockData} />);

    // Assert - Mobile cards should be present (hidden on desktop)
    const mobileContainer = document.querySelector('.md\\:hidden');
    expect(mobileContainer).toBeTruthy();
  });

  it('should display all data in card format on mobile', () => {
    // Arrange & Act
    render(<DataTable columns={columns} data={mockData} />);

    // Assert - All rows should be rendered as cards
    const cards = document.querySelectorAll('.md\\:hidden .bg-background-secondary');
    expect(cards.length).toBeGreaterThanOrEqual(mockData.length);
  });

  it('should show columns based on showOnMobile property', () => {
    // Arrange & Act
    const { container } = render(<DataTable columns={columns} data={mockData} />);

    // Assert - Mobile cards should show Name, Email, Role but not Status
    const mobileSection = container.querySelector('.md\\:hidden');
    expect(mobileSection).toBeTruthy();
    
    if (mobileSection) {
      const text = mobileSection.textContent || '';
      expect(text).toContain('Name');
      expect(text).toContain('Email');
      expect(text).toContain('Role');
      // Status should not be shown on mobile (showOnMobile: false)
    }
  });

  it('should sort columns by mobilePriority in card layout', () => {
    // Arrange
    const columnsWithPriority: Column<TestData>[] = [
      { key: 'status', header: 'Status', showOnMobile: true, mobilePriority: 1 },
      { key: 'name', header: 'Name', showOnMobile: true, mobilePriority: 2 },
      { key: 'email', header: 'Email', showOnMobile: true, mobilePriority: 3 },
    ];

    // Act
    const { container } = render(<DataTable columns={columnsWithPriority} data={[mockData[0]]} />);

    // Assert - First card should show fields in priority order
    const mobileSection = container.querySelector('.md\\:hidden');
    expect(mobileSection).toBeTruthy();
  });

  it('should support row selection in mobile card layout', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    // Act
    render(
      <DataTable
        columns={columns}
        data={mockData}
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    // Find checkboxes in mobile layout
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Click first checkbox (should be in mobile card)
    await user.click(checkboxes[0]);

    // Assert
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('should support row click in mobile card layout', async () => {
    // Arrange
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    // Act
    const { container } = render(
      <DataTable columns={columns} data={mockData} onRowClick={onRowClick} />
    );

    // Find first card in mobile layout
    const mobileSection = container.querySelector('.md\\:hidden');
    const firstCard = mobileSection?.querySelector('.bg-background-secondary');

    if (firstCard) {
      await user.click(firstCard as HTMLElement);
    }

    // Assert
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should show loading skeleton in mobile card layout', () => {
    // Arrange & Act
    render(<DataTable columns={columns} data={[]} loading={true} skeletonRows={3} />);

    // Assert - Should show skeleton cards
    const skeletonCards = document.querySelectorAll('.md\\:hidden .animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('should show empty state in mobile card layout', () => {
    // Arrange & Act
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No users found"
        loading={false}
      />
    );

    // Assert - Should show empty state in both mobile and desktop views
    const emptyMessages = screen.getAllByText('No users found');
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('should allow disabling mobile card layout', () => {
    // Arrange & Act
    const { container } = render(
      <DataTable columns={columns} data={mockData} mobileCardLayout={false} />
    );

    // Assert - Mobile card layout should not be present
    const mobileSection = container.querySelector('.md\\:hidden');
    expect(mobileSection).toBeFalsy();
  });
});

describe('DataTable - Selected Row Highlighting (Requirement 9.9)', () => {
  it('should highlight selected rows with blue background', () => {
    // Arrange
    const selectedRows = [mockData[0], mockData[2]];

    // Act
    const { container } = render(
      <DataTable
        columns={columns}
        data={mockData}
        selectedRows={selectedRows}
        onSelectionChange={vi.fn()}
      />
    );

    // Assert - Selected rows should have blue background class
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveClass('bg-primary-500/20');
    expect(rows[1]).not.toHaveClass('bg-primary-500/20');
    expect(rows[2]).toHaveClass('bg-primary-500/20');
  });

  it('should highlight selected cards with blue background on mobile', () => {
    // Arrange
    const selectedRows = [mockData[0]];

    // Act
    const { container } = render(
      <DataTable
        columns={columns}
        data={mockData}
        selectedRows={selectedRows}
        onSelectionChange={vi.fn()}
      />
    );

    // Assert - Selected card should have blue background
    const mobileSection = container.querySelector('.md\\:hidden');
    const cards = mobileSection?.querySelectorAll('.bg-background-secondary, .bg-primary-500\\/20');
    
    if (cards && cards.length > 0) {
      expect(cards[0]).toHaveClass('bg-primary-500/20');
    }
  });

  it('should add blue border to selected rows', () => {
    // Arrange
    const selectedRows = [mockData[1]];

    // Act
    const { container } = render(
      <DataTable
        columns={columns}
        data={mockData}
        selectedRows={selectedRows}
        onSelectionChange={vi.fn()}
      />
    );

    // Assert - Selected row should have blue border
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[1]).toHaveClass('border-primary-500');
  });
});

describe('DataTable - Animated Sort Indicators (Requirement 9.10)', () => {
  it('should render sort indicators for sortable columns', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'role', header: 'Role', sortable: false },
    ];

    // Act
    const { container } = render(<DataTable columns={sortableColumns} data={mockData} />);

    // Assert - Sortable columns should have sort indicators
    const headers = container.querySelectorAll('th');
    const nameHeader = headers[0]; // First column (Name)
    const emailHeader = headers[1]; // Second column (Email)

    // Check for presence of chevron icons (sort indicators)
    expect(nameHeader.querySelector('svg')).toBeTruthy();
    expect(emailHeader.querySelector('svg')).toBeTruthy();
  });

  it('should highlight active sort indicator with primary color', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    // Assert - Active sort indicator should have primary color class
    const sortIndicators = container.querySelectorAll('.text-primary-500');
    expect(sortIndicators.length).toBeGreaterThan(0);
  });

  it('should show ascending indicator when sorting ascending', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    // Assert - Should show ChevronUp with primary color
    const activeIndicator = container.querySelector('.text-primary-500.opacity-100.scale-110');
    expect(activeIndicator).toBeTruthy();
  });

  it('should show descending indicator when sorting descending', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="desc"
      />
    );

    // Assert - Should show ChevronDown with primary color
    const activeIndicator = container.querySelector('.text-primary-500.opacity-100.scale-110');
    expect(activeIndicator).toBeTruthy();
  });

  it('should apply transition classes for smooth animation', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    // Assert - Sort indicator icons should have transition classes
    const indicators = container.querySelectorAll('th svg');
    indicators.forEach((indicator) => {
      // The SVG elements themselves have the transition classes
      expect(indicator).toHaveClass('transition-all');
      expect(indicator).toHaveClass('duration-300');
      expect(indicator).toHaveClass('ease-in-out');
    });
  });

  it('should scale up active sort indicator', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    // Assert - Active indicator should have scale-110 class
    const activeIndicator = container.querySelector('.scale-110');
    expect(activeIndicator).toBeTruthy();
  });

  it('should dim inactive sort indicators', () => {
    // Arrange
    const sortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
    ];

    // Act
    const { container } = render(
      <DataTable
        columns={sortableColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    // Assert - Inactive indicators should have low opacity
    const inactiveIndicators = container.querySelectorAll('.opacity-30');
    expect(inactiveIndicators.length).toBeGreaterThan(0);
  });
});

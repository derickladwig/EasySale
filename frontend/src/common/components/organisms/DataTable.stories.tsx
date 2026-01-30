import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable } from './DataTable';
import { Package, Users, ShoppingCart } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const sampleProducts: Product[] = [
  { id: 1, name: 'Laptop Pro 15"', category: 'Electronics', price: 1299.99, stock: 45, status: 'In Stock' },
  { id: 2, name: 'Wireless Mouse', category: 'Accessories', price: 29.99, stock: 120, status: 'In Stock' },
  { id: 3, name: 'USB-C Cable', category: 'Accessories', price: 12.99, stock: 8, status: 'Low Stock' },
  { id: 4, name: 'Monitor 27"', category: 'Electronics', price: 349.99, stock: 0, status: 'Out of Stock' },
  { id: 5, name: 'Keyboard Mechanical', category: 'Accessories', price: 89.99, stock: 67, status: 'In Stock' },
  { id: 6, name: 'Webcam HD', category: 'Electronics', price: 79.99, stock: 34, status: 'In Stock' },
  { id: 7, name: 'Headphones Wireless', category: 'Audio', price: 149.99, stock: 5, status: 'Low Stock' },
  { id: 8, name: 'Desk Lamp LED', category: 'Office', price: 39.99, stock: 89, status: 'In Stock' },
];

const columns = [
  {
    key: 'name' as keyof Product,
    header: 'Product Name',
    sortable: true,
    width: '250px',
  },
  {
    key: 'category' as keyof Product,
    header: 'Category',
    sortable: true,
    width: '150px',
  },
  {
    key: 'price' as keyof Product,
    header: 'Price',
    sortable: true,
    width: '120px',
    render: (value: number) => `$${value.toFixed(2)}`,
  },
  {
    key: 'stock' as keyof Product,
    header: 'Stock',
    sortable: true,
    width: '100px',
  },
  {
    key: 'status' as keyof Product,
    header: 'Status',
    sortable: true,
    width: '150px',
    render: (value: string) => {
      const colors = {
        'In Stock': 'text-success-DEFAULT',
        'Low Stock': 'text-warning-DEFAULT',
        'Out of Stock': 'text-error-DEFAULT',
      };
      return <span className={colors[value as keyof typeof colors]}>{value}</span>;
    },
  },
];

const meta: Meta<typeof DataTable> = {
  title: 'Organisms/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

/**
 * Basic table with data
 */
export const Basic: Story = {
  args: {
    columns,
    data: sampleProducts,
  },
};

/**
 * Table with row selection enabled
 * Click checkboxes to select individual rows or use the header checkbox to select all
 */
export const WithSelection: Story = {
  render: () => {
    const [selectedRows, setSelectedRows] = useState<Product[]>([]);

    return (
      <div className="space-y-4">
        <div className="text-text-secondary text-sm">
          Selected: {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'}
        </div>
        <DataTable
          columns={columns}
          data={sampleProducts}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
        />
      </div>
    );
  },
};

/**
 * Table with sorting functionality
 * Click column headers to sort
 */
export const WithSorting: Story = {
  render: () => {
    const [sortColumn, setSortColumn] = useState<keyof Product>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: keyof Product, direction: 'asc' | 'desc') => {
      setSortColumn(column);
      setSortDirection(direction);
    };

    const sortedData = [...sampleProducts].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return (
      <DataTable
        columns={columns}
        data={sortedData}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    );
  },
};

/**
 * Table with loading state showing skeleton rows
 */
export const Loading: Story = {
  args: {
    columns,
    data: [],
    loading: true,
    skeletonRows: 8,
  },
};

/**
 * Table with empty state and default icon
 */
export const Empty: Story = {
  args: {
    columns,
    data: [],
    emptyMessage: 'No products found',
  },
};

/**
 * Table with empty state, custom icon, and action button
 */
export const EmptyWithAction: Story = {
  args: {
    columns,
    data: [],
    emptyMessage: 'No products in your inventory',
    emptyIcon: <Package size={48} />,
    emptyAction: {
      label: 'Add Product',
      onClick: () => alert('Add product clicked'),
    },
  },
};

/**
 * Table with sticky header for long tables
 * Scroll down to see the header stick to the top
 */
export const StickyHeader: Story = {
  render: () => {
    // Create a large dataset
    const largeDataset = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      category: ['Electronics', 'Accessories', 'Audio', 'Office'][i % 4],
      price: Math.random() * 1000,
      stock: Math.floor(Math.random() * 100),
      status: ['In Stock', 'Low Stock', 'Out of Stock'][i % 3] as Product['status'],
    }));

    return (
      <div className="h-[600px] overflow-auto">
        <DataTable columns={columns} data={largeDataset} stickyHeader />
      </div>
    );
  },
};

/**
 * Table with row click handler
 */
export const WithRowClick: Story = {
  args: {
    columns,
    data: sampleProducts,
    onRowClick: (row: Record<string, any>) => alert(`Clicked: ${row.name}`),
  },
};

/**
 * Complete example with all features enabled
 */
export const AllFeatures: Story = {
  render: () => {
    const [selectedRows, setSelectedRows] = useState<Product[]>([]);
    const [sortColumn, setSortColumn] = useState<keyof Product>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: keyof Product, direction: 'asc' | 'desc') => {
      setSortColumn(column);
      setSortDirection(direction);
    };

    const sortedData = [...sampleProducts].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-text-secondary text-sm">
            Selected: {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'}
          </div>
          <div className="text-text-secondary text-sm">
            Total: {sampleProducts.length} products
          </div>
        </div>
        <div className="h-[500px] overflow-auto">
          <DataTable
            columns={columns}
            data={sortedData}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            stickyHeader
            onRowClick={(row) => console.log('Clicked:', row)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Different empty state examples
 */
export const EmptyStates: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-text-primary font-semibold mb-4">No Products</h3>
        <DataTable
          columns={columns}
          data={[]}
          emptyMessage="No products found in your inventory"
          emptyIcon={<Package size={48} />}
          emptyAction={{
            label: 'Add Product',
            onClick: () => alert('Add product'),
          }}
        />
      </div>

      <div>
        <h3 className="text-text-primary font-semibold mb-4">No Customers</h3>
        <DataTable
          columns={[
            { key: 'name' as keyof Product, header: 'Name' },
            { key: 'category' as keyof Product, header: 'Email' },
          ]}
          data={[]}
          emptyMessage="No customers yet"
          emptyIcon={<Users size={48} />}
          emptyAction={{
            label: 'Add Customer',
            onClick: () => alert('Add customer'),
          }}
        />
      </div>

      <div>
        <h3 className="text-text-primary font-semibold mb-4">No Orders</h3>
        <DataTable
          columns={[
            { key: 'name' as keyof Product, header: 'Order ID' },
            { key: 'category' as keyof Product, header: 'Customer' },
          ]}
          data={[]}
          emptyMessage="No orders have been placed"
          emptyIcon={<ShoppingCart size={48} />}
        />
      </div>
    </div>
  ),
};

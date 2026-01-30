import React from 'react';
import { InventoryTemplate } from '../../common/components/templates';
import { Button } from '../../common/components/atoms/Button';
import { Icon } from '../../common/components/atoms/Icon';
import { Input } from '../../common/components/atoms/Input';
import { DataTable, Column } from '../../common/components/organisms/DataTable';
import { Plus, Search } from 'lucide-react';

/**
 * Example Inventory Page
 * 
 * Demonstrates the use of InventoryTemplate with filters and data table.
 */
export const ExampleInventory: React.FC = () => {
  const columns: Column<any>[] = [
    { key: 'sku', header: 'SKU', sortable: true },
    { key: 'name', header: 'Product Name', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'quantity', header: 'Quantity', sortable: true },
    { key: 'price', header: 'Price', sortable: true },
    { key: 'status', header: 'Status', sortable: false },
  ];

  const data = [
    { id: '1', sku: 'CAP-001', name: 'Baseball Cap - Red', category: 'Caps', quantity: 45, price: '$19.99' },
    { id: '2', sku: 'CAP-002', name: 'Trucker Hat - Black', category: 'Caps', quantity: 67, price: '$24.99' },
    { id: '3', sku: 'CAP-003', name: 'Snapback - Navy', category: 'Caps', quantity: 38, price: '$22.99' },
    { id: '4', sku: 'CAP-004', name: 'Fitted Cap - Gray', category: 'Caps', quantity: 28, price: '$26.99' },
    { id: '5', sku: 'CAP-005', name: 'Beanie - Black', category: 'Caps', quantity: 52, price: '$18.99' },
  ];

  return (
    <InventoryTemplate
      title="Inventory Management"
      description="Manage your product inventory"
      actions={
        <Button
          variant="primary"
          size="md"
          leftIcon={<Icon icon={Plus} size="sm" />}
        >
          Add Product
        </Button>
      }
      filters={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search products..."
            leftIcon={<Icon icon={Search} size="sm" />}
          />
          <select className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Categories</option>
            <option value="caps">Caps</option>
            <option value="parts">Auto Parts</option>
            <option value="paint">Paint</option>
          </select>
          <select className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Stock Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          <Button variant="outline" size="md" fullWidth>
            Reset Filters
          </Button>
        </div>
      }
      table={
        <DataTable
          columns={columns}
          data={data}
          onRowClick={(row) => console.log('Row clicked:', row)}
        />
      }
    />
  );
};













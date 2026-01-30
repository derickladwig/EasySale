import { TableSchema } from './DynamicTable';

// ============================================================================
// Table Template Library
// Pre-configured table schemas for common data types
// ============================================================================

/**
 * Products Table
 * Display product catalog with pricing and inventory
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  lastUpdated: string;
}

export const productsTableSchema: TableSchema<Product> = {
  keyField: 'id',
  columns: [
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'name',
      label: 'Product Name',
      type: 'text',
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'price',
      label: 'Price',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'cost',
      label: 'Cost',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'stock',
      label: 'Stock',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '100px',
      render: (value) => {
        const stock = Number(value);
        const color =
          stock === 0 ? 'text-error-400' : stock < 10 ? 'text-warning-400' : 'text-success-400';
        return <span className={color}>{stock}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value): React.ReactNode => {
        const colors = {
          active: 'bg-success-500/20 text-success-400',
          inactive: 'bg-warning-500/20 text-warning-400',
          discontinued: 'bg-error-500/20 text-error-400',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {String(value)}
          </span>
        );
      },
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      type: 'date',
      sortable: true,
      hideOnMobile: true,
      width: '140px',
    },
  ],
};

/**
 * Customers Table
 * Display customer list with contact info and status
 */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  tier: 'retail' | 'wholesale' | 'contractor' | 'vip';
  totalPurchases: number;
  lastPurchase: string;
  status: 'active' | 'inactive';
}

export const customersTableSchema: TableSchema<Customer> = {
  keyField: 'id',
  columns: [
    {
      key: 'name',
      label: 'Customer Name',
      type: 'text',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'text',
      sortable: true,
      format: (value): string => {
        // Format phone number: (555) 123-4567
        const cleaned = String(value).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
          return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return String(value);
      },
    },
    {
      key: 'company',
      label: 'Company',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
      render: (value): React.ReactNode => value ? String(value) : '-',
    },
    {
      key: 'tier',
      label: 'Tier',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          retail: 'bg-surface-elevated text-text-secondary',
          wholesale: 'bg-info-500/20 text-info-400',
          contractor: 'bg-warning-500/20 text-warning-400',
          vip: 'bg-primary-500/20 text-primary-400',
        };
        const labels = {
          retail: 'Retail',
          wholesale: 'Wholesale',
          contractor: 'Contractor',
          vip: 'VIP',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '140px',
      hideOnMobile: true,
    },
    {
      key: 'lastPurchase',
      label: 'Last Purchase',
      type: 'date',
      sortable: true,
      width: '140px',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '100px',
      render: (value) => {
        return value === 'active' ? (
          <span className="text-success-400">●</span>
        ) : (
          <span className="text-error-400">●</span>
        );
      },
    },
  ],
};

/**
 * Orders Table
 * Display sales orders with status tracking
 */
export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  items: number;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
}

export const ordersTableSchema: TableSchema<Order> = {
  keyField: 'id',
  columns: [
    {
      key: 'orderNumber',
      label: 'Order #',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      sortable: true,
      width: '120px',
    },
    {
      key: 'items',
      label: 'Items',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '80px',
      hideOnMobile: true,
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'tax',
      label: 'Tax',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '100px',
      hideOnMobile: true,
    },
    {
      key: 'total',
      label: 'Total',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'status',
      label: 'Order Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          pending: 'bg-warning-500/20 text-warning-400',
          processing: 'bg-info-500/20 text-info-400',
          shipped: 'bg-primary-500/20 text-primary-400',
          delivered: 'bg-success-500/20 text-success-400',
          cancelled: 'bg-error-500/20 text-error-400',
        };
        const labels = {
          pending: 'Pending',
          processing: 'Processing',
          shipped: 'Shipped',
          delivered: 'Delivered',
          cancelled: 'Cancelled',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '100px',
      hideOnMobile: true,
      render: (value) => {
        const colors = {
          unpaid: 'bg-error-500/20 text-error-400',
          partial: 'bg-warning-500/20 text-warning-400',
          paid: 'bg-success-500/20 text-success-400',
          refunded: 'bg-surface-elevated text-text-secondary',
        };
        const labels = {
          unpaid: 'Unpaid',
          partial: 'Partial',
          paid: 'Paid',
          refunded: 'Refunded',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Employees Table
 * Display employee roster with roles and performance
 */
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  hireDate: string;
  salary: number;
  performance: number; // 1-5 rating
  status: 'active' | 'on-leave' | 'terminated';
}

export const employeesTableSchema: TableSchema<Employee> = {
  keyField: 'id',
  columns: [
    {
      key: 'name',
      label: 'Employee Name',
      type: 'text',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'role',
      label: 'Role',
      type: 'text',
      sortable: true,
    },
    {
      key: 'department',
      label: 'Department',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'hireDate',
      label: 'Hire Date',
      type: 'date',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'salary',
      label: 'Salary',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'performance',
      label: 'Performance',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const rating = Number(value);
        const stars = '⭐'.repeat(rating);
        return <span title={`${rating}/5`}>{stars}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          active: 'bg-success-500/20 text-success-400',
          'on-leave': 'bg-warning-500/20 text-warning-400',
          terminated: 'bg-error-500/20 text-error-400',
        };
        const labels = {
          active: 'Active',
          'on-leave': 'On Leave',
          terminated: 'Terminated',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Transactions Table
 * Display financial transactions with details
 */
export interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'return' | 'payment' | 'refund' | 'adjustment';
  reference: string;
  customer: string;
  amount: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
}

export const transactionsTableSchema: TableSchema<Transaction> = {
  keyField: 'id',
  columns: [
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      sortable: true,
      width: '120px',
      format: (value): string => {
        const date = new Date(value as string | number | Date);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      key: 'type',
      label: 'Type',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          sale: 'bg-success-500/20 text-success-400',
          return: 'bg-warning-500/20 text-warning-400',
          payment: 'bg-info-500/20 text-info-400',
          refund: 'bg-error-500/20 text-error-400',
          adjustment: 'bg-surface-elevated text-text-secondary',
        };
        const labels = {
          sale: 'Sale',
          return: 'Return',
          payment: 'Payment',
          refund: 'Refund',
          adjustment: 'Adjustment',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
    {
      key: 'reference',
      label: 'Reference',
      type: 'text',
      sortable: true,
      width: '140px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      render: (value, row) => {
        const amount = Number(value);
        const isNegative = row.type === 'return' || row.type === 'refund';
        const color = isNegative ? 'text-error-400' : 'text-success-400';
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Math.abs(amount));
        return (
          <span className={color}>
            {isNegative ? '-' : '+'}
            {formatted}
          </span>
        );
      },
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      type: 'text',
      sortable: true,
      width: '140px',
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          completed: 'bg-success-500/20 text-success-400',
          pending: 'bg-warning-500/20 text-warning-400',
          failed: 'bg-error-500/20 text-error-400',
          cancelled: 'bg-surface-elevated text-text-secondary',
        };
        const labels = {
          completed: 'Completed',
          pending: 'Pending',
          failed: 'Failed',
          cancelled: 'Cancelled',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Inventory Table
 * Display inventory levels with reorder alerts
 */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  location: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  reorderQty: number;
  lastCounted: string;
}

export const inventoryTableSchema: TableSchema<InventoryItem> = {
  keyField: 'id',
  columns: [
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'name',
      label: 'Product Name',
      type: 'text',
      sortable: true,
    },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'onHand',
      label: 'On Hand',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '100px',
    },
    {
      key: 'reserved',
      label: 'Reserved',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '100px',
      hideOnMobile: true,
    },
    {
      key: 'available',
      label: 'Available',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '100px',
      render: (value, row) => {
        const available = Number(value);
        const reorderPoint = Number(row.reorderPoint);
        const color =
          available === 0
            ? 'text-error-400'
            : available <= reorderPoint
              ? 'text-warning-400'
              : 'text-success-400';
        return <span className={`font-semibold ${color}`}>{available}</span>;
      },
    },
    {
      key: 'reorderPoint',
      label: 'Reorder Point',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'reorderQty',
      label: 'Reorder Qty',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'lastCounted',
      label: 'Last Counted',
      type: 'date',
      sortable: true,
      width: '140px',
      hideOnMobile: true,
    },
  ],
};

// ============================================================================
// Template Registry (defined at end of file after all schemas)
// ============================================================================

export type TableTemplateKey =
  | 'products'
  | 'customers'
  | 'orders'
  | 'employees'
  | 'transactions'
  | 'inventory'
  | 'appointments'
  | 'workOrders'
  | 'invoices'
  | 'vehicles'
  | 'suppliers';

/**
 * Get a table template by key
 */
export function getTableTemplate<T = unknown>(key: TableTemplateKey): TableSchema<T> {
  return allTableTemplates[key] as TableSchema<T>;
}

/**
 * Get all available table templates
 */
export function getAllTableTemplates() {
  return allTableTemplates;
}

/**
 * Appointments Table
 * Display scheduled appointments
 */
export interface Appointment {
  id: string;
  date: string;
  time: string;
  customer: string;
  service: string;
  provider: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

export const appointmentsTableSchema: TableSchema<Appointment> = {
  keyField: 'id',
  columns: [
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      sortable: true,
      width: '120px',
    },
    {
      key: 'time',
      label: 'Time',
      type: 'text',
      sortable: true,
      width: '100px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
    },
    {
      key: 'service',
      label: 'Service',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'provider',
      label: 'Provider',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'number',
      sortable: true,
      align: 'center',
      width: '100px',
      hideOnMobile: true,
      format: (value) => `${value} min`,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '140px',
      render: (value) => {
        const colors = {
          scheduled: 'bg-info-500/20 text-info-400',
          confirmed: 'bg-primary-500/20 text-primary-400',
          'in-progress': 'bg-warning-500/20 text-warning-400',
          completed: 'bg-success-500/20 text-success-400',
          cancelled: 'bg-error-500/20 text-error-400',
          'no-show': 'bg-surface-elevated text-text-secondary',
        };
        const labels = {
          scheduled: 'Scheduled',
          confirmed: 'Confirmed',
          'in-progress': 'In Progress',
          completed: 'Completed',
          cancelled: 'Cancelled',
          'no-show': 'No Show',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Work Orders Table
 * Display service work orders
 */
export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  customer: string;
  vehicle: string;
  date: string;
  services: string;
  technician: string;
  estimatedCost: number;
  actualCost: number;
  status: 'estimate' | 'approved' | 'in-progress' | 'completed' | 'invoiced' | 'cancelled';
}

export const workOrdersTableSchema: TableSchema<WorkOrder> = {
  keyField: 'id',
  columns: [
    {
      key: 'workOrderNumber',
      label: 'WO #',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      sortable: true,
      width: '120px',
    },
    {
      key: 'services',
      label: 'Services',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'technician',
      label: 'Technician',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'estimatedCost',
      label: 'Estimate',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'actualCost',
      label: 'Actual',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          estimate: 'bg-surface-elevated text-text-secondary',
          approved: 'bg-info-500/20 text-info-400',
          'in-progress': 'bg-warning-500/20 text-warning-400',
          completed: 'bg-success-500/20 text-success-400',
          invoiced: 'bg-primary-500/20 text-primary-400',
          cancelled: 'bg-error-500/20 text-error-400',
        };
        const labels = {
          estimate: 'Estimate',
          approved: 'Approved',
          'in-progress': 'In Progress',
          completed: 'Completed',
          invoiced: 'Invoiced',
          cancelled: 'Cancelled',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Invoices Table
 * Display invoices and billing
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
}

export const invoicesTableSchema: TableSchema<Invoice> = {
  keyField: 'id',
  columns: [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      sortable: true,
      width: '120px',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'total',
      label: 'Total',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
    },
    {
      key: 'amountPaid',
      label: 'Paid',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'balance',
      label: 'Balance',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '120px',
      render: (value) => {
        const balance = Number(value);
        const color = balance > 0 ? 'text-warning-400' : 'text-success-400';
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(balance);
        return <span className={color}>{formatted}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '120px',
      render: (value) => {
        const colors = {
          draft: 'bg-surface-elevated text-text-secondary',
          sent: 'bg-info-500/20 text-info-400',
          viewed: 'bg-primary-500/20 text-primary-400',
          partial: 'bg-warning-500/20 text-warning-400',
          paid: 'bg-success-500/20 text-success-400',
          overdue: 'bg-error-500/20 text-error-400',
          cancelled: 'bg-surface-elevated text-text-secondary',
        };
        const labels = {
          draft: 'Draft',
          sent: 'Sent',
          viewed: 'Viewed',
          partial: 'Partial',
          paid: 'Paid',
          overdue: 'Overdue',
          cancelled: 'Cancelled',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

/**
 * Vehicles Table
 * Display customer vehicles
 */
// ============================================================================
// Vehicle Table Schema (Automotive Module)
// ============================================================================
// NOTE: This table schema is for the automotive vertical pack.
// It should only be used when config.modules.automotive.enabled === true
// The VIN field and vehicle-specific data are only relevant when automotive is enabled.

export interface Vehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  licensePlate: string;
  customer: string;
  mileage: number;
  lastService: string;
  nextService: string;
}

export const vehiclesTableSchema: TableSchema<Vehicle> = {
  keyField: 'id',
  columns: [
    {
      key: 'year',
      label: 'Year',
      type: 'number',
      sortable: true,
      width: '80px',
    },
    {
      key: 'make',
      label: 'Make',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      sortable: true,
    },
    {
      key: 'licensePlate',
      label: 'License Plate',
      type: 'text',
      sortable: true,
      width: '120px',
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'vin',
      label: 'VIN',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
      width: '180px',
    },
    {
      key: 'mileage',
      label: 'Mileage',
      type: 'number',
      sortable: true,
      align: 'right',
      width: '120px',
      format: (value) => {
        return new Intl.NumberFormat('en-US').format(Number(value));
      },
    },
    {
      key: 'lastService',
      label: 'Last Service',
      type: 'date',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'nextService',
      label: 'Next Service',
      type: 'date',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
  ],
};

/**
 * Suppliers Table
 * Display supplier information
 */
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  paymentTerms: string;
  totalPurchases: number;
  lastOrder: string;
  status: 'active' | 'inactive' | 'suspended';
}

export const suppliersTableSchema: TableSchema<Supplier> = {
  keyField: 'id',
  columns: [
    {
      key: 'name',
      label: 'Supplier Name',
      type: 'text',
      sortable: true,
    },
    {
      key: 'contactPerson',
      label: 'Contact',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'text',
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      type: 'text',
      sortable: true,
      hideOnMobile: true,
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      type: 'text',
      sortable: true,
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      type: 'currency',
      sortable: true,
      align: 'right',
      width: '140px',
      hideOnMobile: true,
    },
    {
      key: 'lastOrder',
      label: 'Last Order',
      type: 'date',
      sortable: true,
      width: '120px',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'text',
      sortable: true,
      align: 'center',
      width: '100px',
      render: (value) => {
        const colors = {
          active: 'bg-success-500/20 text-success-400',
          inactive: 'bg-surface-elevated text-text-secondary',
          suspended: 'bg-error-500/20 text-error-400',
        };
        const labels = {
          active: 'Active',
          inactive: 'Inactive',
          suspended: 'Suspended',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}
          >
            {labels[value as keyof typeof labels]}
          </span>
        );
      },
    },
  ],
};

// Complete template registry
export const allTableTemplates = {
  products: productsTableSchema,
  customers: customersTableSchema,
  orders: ordersTableSchema,
  employees: employeesTableSchema,
  transactions: transactionsTableSchema,
  inventory: inventoryTableSchema,
  appointments: appointmentsTableSchema,
  workOrders: workOrdersTableSchema,
  invoices: invoicesTableSchema,
  vehicles: vehiclesTableSchema,
  suppliers: suppliersTableSchema,
};

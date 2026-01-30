import { WidgetSchema } from './DynamicWidget';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';

// ============================================================================
// Widget Template Library
// Pre-configured dashboard widgets for common metrics
// ============================================================================

/**
 * Total Sales Widget
 * Display total sales with trend
 */
export const totalSalesWidget: WidgetSchema = {
  id: 'total-sales',
  type: 'stat',
  title: 'Total Sales',
  description: 'Revenue for current period',
  size: 'sm',
  value: '$0',
  trend: 'neutral',
  icon: <DollarSign size={24} className="text-success-400" />,
  color: 'bg-success-500/20',
  refreshInterval: 60000, // 1 minute
};

/**
 * Orders Count Widget
 * Display number of orders
 */
export const ordersCountWidget: WidgetSchema = {
  id: 'orders-count',
  type: 'stat',
  title: 'Orders',
  description: 'Total orders today',
  size: 'sm',
  value: '0',
  trend: 'neutral',
  icon: <ShoppingCart size={24} className="text-primary-400" />,
  color: 'bg-primary-500/20',
  refreshInterval: 30000, // 30 seconds
};

/**
 * Customers Count Widget
 * Display number of customers
 */
export const customersCountWidget: WidgetSchema = {
  id: 'customers-count',
  type: 'stat',
  title: 'Customers',
  description: 'Active customers',
  size: 'sm',
  value: '0',
  trend: 'neutral',
  icon: <Users size={24} className="text-info-400" />,
  color: 'bg-info-500/20',
  refreshInterval: 300000, // 5 minutes
};

/**
 * Low Stock Alert Widget
 * Display number of low stock items
 */
export const lowStockWidget: WidgetSchema = {
  id: 'low-stock',
  type: 'stat',
  title: 'Low Stock Items',
  description: 'Items below reorder point',
  size: 'sm',
  value: '0',
  icon: <AlertTriangle size={24} className="text-warning-400" />,
  color: 'bg-warning-500/20',
  refreshInterval: 300000, // 5 minutes
};

/**
 * Sales Target Progress Widget
 * Display progress towards sales target
 */
export const salesTargetWidget: WidgetSchema = {
  id: 'sales-target',
  type: 'progress',
  title: 'Monthly Sales Target',
  description: 'Progress towards monthly goal',
  size: 'md',
  current: 0,
  target: 100000,
  unit: '$',
  refreshInterval: 60000, // 1 minute
};

/**
 * Top Products Widget
 * Display list of top selling products
 */
export const topProductsWidget: WidgetSchema = {
  id: 'top-products',
  type: 'list',
  title: 'Top Products',
  description: 'Best sellers this week',
  size: 'md',
  items: [
    {
      label: 'Product 1',
      value: '$1,234',
      icon: <Package size={16} className="text-success-400" />,
      color: 'bg-success-500/20',
    },
    {
      label: 'Product 2',
      value: '$987',
      icon: <Package size={16} className="text-primary-400" />,
      color: 'bg-primary-500/20',
    },
    {
      label: 'Product 3',
      value: '$765',
      icon: <Package size={16} className="text-info-400" />,
      color: 'bg-info-500/20',
    },
  ],
  refreshInterval: 300000, // 5 minutes
};

/**
 * Recent Activity Widget
 * Display recent system activity
 */
export const recentActivityWidget: WidgetSchema = {
  id: 'recent-activity',
  type: 'list',
  title: 'Recent Activity',
  description: 'Latest transactions',
  size: 'md',
  items: [
    {
      label: 'Sale completed',
      value: '2 min ago',
      icon: <CheckCircle size={16} className="text-success-400" />,
      color: 'bg-success-500/20',
    },
    {
      label: 'New customer',
      value: '5 min ago',
      icon: <Users size={16} className="text-info-400" />,
      color: 'bg-info-500/20',
    },
    {
      label: 'Stock updated',
      value: '10 min ago',
      icon: <Package size={16} className="text-primary-400" />,
      color: 'bg-primary-500/20',
    },
  ],
  refreshInterval: 30000, // 30 seconds
};

/**
 * Average Order Value Widget
 * Display average order value with trend
 */
export const averageOrderValueWidget: WidgetSchema = {
  id: 'average-order-value',
  type: 'stat',
  title: 'Average Order Value',
  description: 'Per transaction',
  size: 'sm',
  value: '$0',
  trend: 'neutral',
  icon: <TrendingUp size={24} className="text-primary-400" />,
  color: 'bg-primary-500/20',
  refreshInterval: 60000, // 1 minute
};

/**
 * Pending Orders Widget
 * Display number of pending orders
 */
export const pendingOrdersWidget: WidgetSchema = {
  id: 'pending-orders',
  type: 'stat',
  title: 'Pending Orders',
  description: 'Awaiting processing',
  size: 'sm',
  value: '0',
  icon: <Clock size={24} className="text-warning-400" />,
  color: 'bg-warning-500/20',
  refreshInterval: 30000, // 30 seconds
};

/**
 * Inventory Value Widget
 * Display total inventory value
 */
export const inventoryValueWidget: WidgetSchema = {
  id: 'inventory-value',
  type: 'stat',
  title: 'Inventory Value',
  description: 'Total stock value',
  size: 'sm',
  value: '$0',
  icon: <Package size={24} className="text-info-400" />,
  color: 'bg-info-500/20',
  refreshInterval: 300000, // 5 minutes
};

/**
 * Custom Widget Example
 * Shows how to create a custom widget with render function
 */
export const customChartWidget: WidgetSchema = {
  id: 'custom-chart',
  type: 'custom',
  title: 'Sales Chart',
  description: 'Last 7 days',
  size: 'lg',
  render: () => (
    <div className="h-48 flex items-end justify-between gap-2">
      {[65, 45, 78, 52, 88, 72, 95].map((value, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-400"
            style={{ height: `${value}%` }}
          />
          <span className="text-xs text-text-secondary">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
          </span>
        </div>
      ))}
    </div>
  ),
  refreshInterval: 300000, // 5 minutes
};

// ============================================================================
// Widget Collections
// Pre-configured dashboard layouts
// ============================================================================

/**
 * Sales Dashboard Widgets
 */
export const salesDashboardWidgets: WidgetSchema[] = [
  totalSalesWidget,
  ordersCountWidget,
  averageOrderValueWidget,
  pendingOrdersWidget,
  salesTargetWidget,
  topProductsWidget,
  recentActivityWidget,
];

/**
 * Inventory Dashboard Widgets
 */
export const inventoryDashboardWidgets: WidgetSchema[] = [
  inventoryValueWidget,
  lowStockWidget,
  {
    ...topProductsWidget,
    title: 'Fast Moving Items',
    description: 'High turnover products',
  },
  {
    id: 'stock-alerts',
    type: 'list',
    title: 'Stock Alerts',
    description: 'Items needing attention',
    size: 'md',
    items: [
      {
        label: 'Out of stock',
        value: '5 items',
        icon: <AlertTriangle size={16} className="text-error-400" />,
        color: 'bg-error-500/20',
      },
      {
        label: 'Low stock',
        value: '12 items',
        icon: <AlertTriangle size={16} className="text-warning-400" />,
        color: 'bg-warning-500/20',
      },
      {
        label: 'Reorder needed',
        value: '8 items',
        icon: <Package size={16} className="text-info-400" />,
        color: 'bg-info-500/20',
      },
    ],
  },
];

/**
 * Customer Dashboard Widgets
 */
export const customerDashboardWidgets: WidgetSchema[] = [
  customersCountWidget,
  {
    id: 'new-customers',
    type: 'stat',
    title: 'New Customers',
    description: 'This month',
    size: 'sm',
    value: '0',
    trend: 'neutral',
    icon: <Users size={24} className="text-success-400" />,
    color: 'bg-success-500/20',
  },
  {
    id: 'customer-retention',
    type: 'progress',
    title: 'Customer Retention',
    description: 'Repeat customer rate',
    size: 'md',
    current: 0,
    target: 100,
    unit: '%',
  },
  {
    id: 'top-customers',
    type: 'list',
    title: 'Top Customers',
    description: 'By purchase volume',
    size: 'md',
    items: [
      {
        label: 'Customer A',
        value: '$5,432',
        icon: <Users size={16} className="text-success-400" />,
        color: 'bg-success-500/20',
      },
      {
        label: 'Customer B',
        value: '$4,321',
        icon: <Users size={16} className="text-primary-400" />,
        color: 'bg-primary-500/20',
      },
      {
        label: 'Customer C',
        value: '$3,210',
        icon: <Users size={16} className="text-info-400" />,
        color: 'bg-info-500/20',
      },
    ],
  },
];

/**
 * Executive Dashboard Widgets
 */
export const executiveDashboardWidgets: WidgetSchema[] = [
  totalSalesWidget,
  ordersCountWidget,
  customersCountWidget,
  inventoryValueWidget,
  salesTargetWidget,
  customChartWidget,
  topProductsWidget,
  recentActivityWidget,
];

// ============================================================================
// Template Registry
// ============================================================================

export const widgetTemplates = {
  totalSales: totalSalesWidget,
  ordersCount: ordersCountWidget,
  customersCount: customersCountWidget,
  lowStock: lowStockWidget,
  salesTarget: salesTargetWidget,
  topProducts: topProductsWidget,
  recentActivity: recentActivityWidget,
  averageOrderValue: averageOrderValueWidget,
  pendingOrders: pendingOrdersWidget,
  inventoryValue: inventoryValueWidget,
  customChart: customChartWidget,
};

export const dashboardCollections = {
  sales: salesDashboardWidgets,
  inventory: inventoryDashboardWidgets,
  customer: customerDashboardWidgets,
  executive: executiveDashboardWidgets,
};

export type WidgetTemplateKey = keyof typeof widgetTemplates;
export type DashboardCollectionKey = keyof typeof dashboardCollections;

/**
 * Get a widget template by key
 */
export function getWidgetTemplate(key: WidgetTemplateKey): WidgetSchema {
  return widgetTemplates[key];
}

/**
 * Get a dashboard collection by key
 */
export function getDashboardCollection(key: DashboardCollectionKey): WidgetSchema[] {
  return dashboardCollections[key];
}

/**
 * Get all available widget templates
 */
export function getAllWidgetTemplates() {
  return widgetTemplates;
}

/**
 * Get all dashboard collections
 */
export function getAllDashboardCollections() {
  return dashboardCollections;
}

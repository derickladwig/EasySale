import type {
  Product,
  Customer,
  Order,
  Employee,
  Transaction,
  InventoryItem,
} from './tableTemplates';

// ============================================================================
// Sample Data Generators
// Generate realistic sample data for testing and demos
// ============================================================================

/**
 * Generate sample products
 */
export function generateSampleProducts(count: number = 50): Product[] {
  const categories = ['Apparel', 'Accessories', 'Equipment', 'Supplies', 'General'];
  const statuses: Product['status'][] = ['active', 'active', 'active', 'inactive', 'discontinued'];

  return Array.from({ length: count }, (_, i) => ({
    id: `prod-${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
    name: `Product ${i + 1}`,
    category: categories[i % categories.length],
    price: Math.round((Math.random() * 200 + 10) * 100) / 100,
    cost: Math.round((Math.random() * 100 + 5) * 100) / 100,
    stock: Math.floor(Math.random() * 100),
    status: statuses[i % statuses.length],
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

/**
 * Generate sample customers
 */
export function generateSampleCustomers(count: number = 50): Customer[] {
  const firstNames = [
    'John',
    'Jane',
    'Mike',
    'Sarah',
    'David',
    'Emily',
    'Chris',
    'Lisa',
    'Tom',
    'Anna',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];
  const companies = [
    'ABC Corp',
    'XYZ Inc',
    'Tech Solutions',
    'Auto Works',
    'Build Co',
    null,
    null,
    null,
  ];
  const tiers: Customer['tier'][] = [
    'retail',
    'retail',
    'retail',
    'wholesale',
    'contractor',
    'vip',
  ];
  const statuses: Customer['status'][] = ['active', 'active', 'active', 'active', 'inactive'];

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    return {
      id: `cust-${i + 1}`,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
      company: companies[i % companies.length] || undefined,
      tier: tiers[i % tiers.length],
      totalPurchases: Math.round((Math.random() * 10000 + 100) * 100) / 100,
      lastPurchase: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[i % statuses.length],
    };
  });
}

/**
 * Generate sample orders
 */
export function generateSampleOrders(count: number = 50): Order[] {
  const customers = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown'];
  const orderStatuses: Order['status'][] = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];
  const paymentStatuses: Order['paymentStatus'][] = ['unpaid', 'partial', 'paid', 'refunded'];

  return Array.from({ length: count }, (_, i) => {
    const subtotal = Math.round((Math.random() * 1000 + 50) * 100) / 100;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal + tax;

    return {
      id: `order-${i + 1}`,
      orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
      customer: customers[i % customers.length],
      date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      items: Math.floor(Math.random() * 10) + 1,
      subtotal,
      tax,
      total,
      status: orderStatuses[i % orderStatuses.length],
      paymentStatus: paymentStatuses[i % paymentStatuses.length],
    };
  });
}

/**
 * Generate sample employees
 */
export function generateSampleEmployees(count: number = 30): Employee[] {
  const firstNames = [
    'John',
    'Jane',
    'Mike',
    'Sarah',
    'David',
    'Emily',
    'Chris',
    'Lisa',
    'Tom',
    'Anna',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];
  const roles = ['Cashier', 'Sales Associate', 'Manager', 'Warehouse Staff', 'Technician'];
  const departments = ['Sales', 'Operations', 'Management', 'Warehouse', 'Service'];
  const statuses: Employee['status'][] = [
    'active',
    'active',
    'active',
    'active',
    'on-leave',
    'terminated',
  ];

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    return {
      id: `emp-${i + 1}`,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      role: roles[i % roles.length],
      department: departments[i % departments.length],
      hireDate: new Date(Date.now() - Math.random() * 1825 * 24 * 60 * 60 * 1000).toISOString(),
      salary: Math.round((Math.random() * 50000 + 30000) / 1000) * 1000,
      performance: Math.floor(Math.random() * 5) + 1,
      status: statuses[i % statuses.length],
    };
  });
}

/**
 * Generate sample transactions
 */
export function generateSampleTransactions(count: number = 100): Transaction[] {
  const types: Transaction['type'][] = [
    'sale',
    'sale',
    'sale',
    'return',
    'payment',
    'refund',
    'adjustment',
  ];
  const customers = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown'];
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Store Credit'];
  const statuses: Transaction['status'][] = [
    'completed',
    'completed',
    'completed',
    'pending',
    'failed',
    'cancelled',
  ];

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    const amount = Math.round((Math.random() * 500 + 10) * 100) / 100;

    return {
      id: `txn-${i + 1}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      type,
      reference: `REF-${String(i + 1).padStart(8, '0')}`,
      customer: customers[i % customers.length],
      amount,
      paymentMethod: paymentMethods[i % paymentMethods.length],
      status: statuses[i % statuses.length],
    };
  });
}

/**
 * Generate sample inventory items
 */
export function generateSampleInventory(count: number = 50): InventoryItem[] {
  const locations = ['Warehouse A', 'Warehouse B', 'Store Front', 'Back Room'];

  return Array.from({ length: count }, (_, i) => {
    const onHand = Math.floor(Math.random() * 200);
    const reserved = Math.floor(Math.random() * Math.min(onHand, 50));
    const available = onHand - reserved;
    const reorderPoint = Math.floor(Math.random() * 30) + 10;

    return {
      id: `inv-${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(5, '0')}`,
      name: `Product ${i + 1}`,
      location: locations[i % locations.length],
      onHand,
      reserved,
      available,
      reorderPoint,
      reorderQty: reorderPoint * 2,
      lastCounted: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

/**
 * Get all sample data
 */
export function getAllSampleData() {
  return {
    products: generateSampleProducts(),
    customers: generateSampleCustomers(),
    orders: generateSampleOrders(),
    employees: generateSampleEmployees(),
    transactions: generateSampleTransactions(),
    inventory: generateSampleInventory(),
  };
}

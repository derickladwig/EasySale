/**
 * Test fixtures for users and authentication
 */

export const mockAdmin = {
  id: 'user-001',
  username: 'admin',
  email: 'admin@EasySale.local',
  role: 'admin',
  permissions: [
    'access_sell',
    'access_inventory',
    'access_admin',
    'apply_discount',
    'override_price',
    'process_return',
    'receive_stock',
    'adjust_inventory',
    'manage_users',
    'manage_settings',
    'view_audit_logs',
  ],
  firstName: 'Admin',
  lastName: 'User',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockCashier = {
  id: 'user-002',
  username: 'cashier',
  email: 'cashier@EasySale.local',
  role: 'cashier',
  permissions: ['access_sell', 'process_return'],
  firstName: 'Jane',
  lastName: 'Cashier',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockManager = {
  id: 'user-003',
  username: 'manager',
  email: 'manager@EasySale.local',
  role: 'manager',
  permissions: [
    'access_sell',
    'access_inventory',
    'apply_discount',
    'override_price',
    'process_return',
    'receive_stock',
    'adjust_inventory',
    'view_audit_logs',
  ],
  firstName: 'John',
  lastName: 'Manager',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockInventoryClerk = {
  id: 'user-004',
  username: 'inventory',
  email: 'inventory@EasySale.local',
  role: 'inventory_clerk',
  permissions: ['access_inventory', 'receive_stock', 'adjust_inventory'],
  firstName: 'Bob',
  lastName: 'Clerk',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockUsers = [mockAdmin, mockCashier, mockManager, mockInventoryClerk];

export const mockAuthToken = 'mock-jwt-token-12345';

export const mockAuthResponse = {
  token: mockAuthToken,
  user: mockAdmin,
  expiresAt: '2026-01-09T00:00:00Z',
};

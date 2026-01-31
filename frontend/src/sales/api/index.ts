/**
 * Sales Feature API Client
 * 
 * Provides API functions for:
 * - Layaway management
 * - Work orders
 * - Commissions
 * - Gift cards
 * - Promotions
 * - Credit accounts
 */

import { apiClient } from '@common/api/client';

// Helper to build query string from params
const buildQueryString = (params?: Record<string, string | number | boolean | undefined>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// ============================================================================
// LAYAWAY API
// ============================================================================

export interface LayawayItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Layaway {
  id: string;
  customerId: string;
  customerName: string;
  items: LayawayItem[];
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  status: 'active' | 'completed' | 'cancelled' | 'overdue';
  dueDate: string;
  createdAt: string;
  payments: LayawayPayment[];
}

export interface LayawayPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
}

export interface CreateLayawayRequest {
  customerId: string;
  customerName: string;
  items: LayawayItem[];
  depositAmount: number;
  dueDate: string;
}

export const layawayApi = {
  create: async (data: CreateLayawayRequest): Promise<Layaway> => {
    return apiClient.post('/api/layaways', data);
  },

  get: async (id: string): Promise<Layaway> => {
    return apiClient.get(`/api/layaways/${id}`);
  },

  list: async (params?: { customerId?: string; status?: string }): Promise<Layaway[]> => {
    const qs = buildQueryString(params);
    return apiClient.get(`/api/layaways${qs}`);
  },

  recordPayment: async (id: string, amount: number, paymentMethod: string): Promise<Layaway> => {
    return apiClient.post(`/api/layaways/${id}/payments`, { amount, payment_method: paymentMethod });
  },

  complete: async (id: string): Promise<Layaway> => {
    return apiClient.post(`/api/layaways/${id}/complete`);
  },

  cancel: async (id: string): Promise<Layaway> => {
    return apiClient.post(`/api/layaways/${id}/cancel`);
  },

  getOverdue: async (): Promise<Layaway[]> => {
    return apiClient.get('/api/layaways/overdue');
  },

  checkOverdue: async (): Promise<{ count: number; totalAmount: number }> => {
    return apiClient.post('/api/layaways/check-overdue');
  },
};

// ============================================================================
// WORK ORDER API
// ============================================================================

export interface WorkOrderLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'labor' | 'parts' | 'other';
}

export interface WorkOrder {
  id: string;
  customerId: string;
  customerName: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  lines: WorkOrderLine[];
  totalAmount: number;
  estimatedCompletion?: string;
  completedAt?: string;
  createdAt: string;
  assignedTo?: string;
}

export interface CreateWorkOrderRequest {
  customerId: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCompletion?: string;
  assignedTo?: string;
}

export const workOrderApi = {
  create: async (data: CreateWorkOrderRequest): Promise<WorkOrder> => {
    return apiClient.post('/api/work-orders', data);
  },

  get: async (id: string): Promise<WorkOrder> => {
    return apiClient.get(`/api/work-orders/${id}`);
  },

  update: async (id: string, data: Partial<WorkOrder>): Promise<WorkOrder> => {
    return apiClient.put(`/api/work-orders/${id}`, data);
  },

  list: async (params?: { status?: string; customerId?: string }): Promise<WorkOrder[]> => {
    const qs = buildQueryString(params);
    return apiClient.get(`/api/work-orders${qs}`);
  },

  addLine: async (id: string, line: Omit<WorkOrderLine, 'id' | 'total'>): Promise<WorkOrder> => {
    return apiClient.post(`/api/work-orders/${id}/lines`, line);
  },

  complete: async (id: string): Promise<WorkOrder> => {
    return apiClient.post(`/api/work-orders/${id}/complete`);
  },
};

// ============================================================================
// COMMISSION API
// ============================================================================

export interface CommissionRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  categoryId?: string;
  productId?: string;
  minSaleAmount?: number;
  isActive: boolean;
}

export interface EmployeeCommission {
  employeeId: string;
  employeeName: string;
  period: string;
  totalSales: number;
  totalCommission: number;
  transactions: Array<{
    transactionId: string;
    amount: number;
    commission: number;
    date: string;
  }>;
}

export const commissionApi = {
  listRules: async (): Promise<CommissionRule[]> => {
    return apiClient.get('/api/commissions/rules');
  },

  createRule: async (rule: Omit<CommissionRule, 'id'>): Promise<CommissionRule> => {
    return apiClient.post('/api/commissions/rules', rule);
  },

  getEmployeeCommissions: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeCommission> => {
    const qs = buildQueryString({ start_date: startDate, end_date: endDate });
    return apiClient.get(`/api/commissions/employees/${employeeId}${qs}`);
  },

  generateReport: async (startDate: string, endDate: string): Promise<EmployeeCommission[]> => {
    const qs = buildQueryString({ start_date: startDate, end_date: endDate });
    return apiClient.get(`/api/commissions/report${qs}`);
  },
};

// ============================================================================
// GIFT CARD API
// ============================================================================

export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  status: 'active' | 'depleted' | 'expired' | 'cancelled';
  expiresAt?: string;
  issuedAt: string;
  issuedTo?: string;
  transactions: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  type: 'issue' | 'redeem' | 'reload';
  amount: number;
  balanceAfter: number;
  transactionId?: string;
  createdAt: string;
}

export const giftCardApi = {
  issue: async (amount: number, customerId?: string): Promise<GiftCard> => {
    return apiClient.post('/api/gift-cards', { amount, customer_id: customerId });
  },

  checkBalance: async (code: string): Promise<{ balance: number; status: string }> => {
    return apiClient.get(`/api/gift-cards/${code}/balance`);
  },

  redeem: async (code: string, amount: number, transactionId?: string): Promise<GiftCard> => {
    return apiClient.post(`/api/gift-cards/${code}/redeem`, { amount, transaction_id: transactionId });
  },

  reload: async (code: string, amount: number): Promise<GiftCard> => {
    return apiClient.post(`/api/gift-cards/${code}/reload`, { amount });
  },
};

// ============================================================================
// PROMOTION API
// ============================================================================

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  value: number;
  conditions: {
    minPurchase?: number;
    categoryIds?: string[];
    productIds?: string[];
    customerTiers?: string[];
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
}

export interface GroupMarkdown {
  id: string;
  name: string;
  percentage: number;
  categoryIds: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export const promotionApi = {
  create: async (promotion: Omit<Promotion, 'id' | 'usageCount'>): Promise<Promotion> => {
    return apiClient.post('/api/promotions', promotion);
  },

  list: async (params?: { isActive?: boolean }): Promise<Promotion[]> => {
    const qs = buildQueryString(params ? { isActive: params.isActive } : undefined);
    return apiClient.get(`/api/promotions${qs}`);
  },

  update: async (id: string, data: Partial<Promotion>): Promise<Promotion> => {
    return apiClient.put(`/api/promotions/${id}`, data);
  },

  getUsage: async (id: string): Promise<{ usageCount: number; totalDiscount: number }> => {
    return apiClient.get(`/api/promotions/${id}/usage`);
  },

  evaluate: async (cartItems: Array<{ productId: string; quantity: number; price: number }>): Promise<{
    applicablePromotions: Array<{ promotionId: string; discount: number }>;
    totalDiscount: number;
  }> => {
    return apiClient.post('/api/promotions/evaluate', { items: cartItems });
  },

  createGroupMarkdown: async (markdown: Omit<GroupMarkdown, 'id'>): Promise<GroupMarkdown> => {
    return apiClient.post('/api/promotions/group-markdowns', markdown);
  },

  listGroupMarkdowns: async (): Promise<GroupMarkdown[]> => {
    return apiClient.get('/api/promotions/group-markdowns');
  },

  deactivateGroupMarkdown: async (id: string): Promise<void> => {
    return apiClient.post(`/api/promotions/group-markdowns/${id}/deactivate`);
  },
};

// ============================================================================
// CREDIT ACCOUNT API
// ============================================================================

export interface CreditAccount {
  id: string;
  customerId: string;
  customerName: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  status: 'active' | 'suspended' | 'closed';
  paymentTerms: number; // days
  lastPaymentDate?: string;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  accountId: string;
  type: 'charge' | 'payment' | 'adjustment';
  amount: number;
  balanceAfter: number;
  reference?: string;
  createdAt: string;
}

export interface AgingReport {
  accountId: string;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export const creditApi = {
  create: async (customerId: string, creditLimit: number, paymentTerms: number): Promise<CreditAccount> => {
    return apiClient.post('/api/credit-accounts', {
      customer_id: customerId,
      credit_limit: creditLimit,
      payment_terms: paymentTerms,
    });
  },

  get: async (id: string): Promise<CreditAccount> => {
    return apiClient.get(`/api/credit-accounts/${id}`);
  },

  recordCharge: async (id: string, amount: number, reference?: string): Promise<CreditTransaction> => {
    return apiClient.post(`/api/credit-accounts/${id}/charges`, { amount, reference });
  },

  recordPayment: async (id: string, amount: number, reference?: string): Promise<CreditTransaction> => {
    return apiClient.post(`/api/credit-accounts/${id}/payments`, { amount, reference });
  },

  generateStatement: async (id: string, startDate: string, endDate: string): Promise<{
    account: CreditAccount;
    transactions: CreditTransaction[];
    openingBalance: number;
    closingBalance: number;
  }> => {
    const qs = buildQueryString({ start_date: startDate, end_date: endDate });
    return apiClient.get(`/api/credit-accounts/${id}/statement${qs}`);
  },

  getAgingReport: async (): Promise<AgingReport[]> => {
    return apiClient.get('/api/credit-accounts/aging');
  },

  checkCredit: async (customerId: string, amount: number): Promise<{
    approved: boolean;
    availableCredit: number;
    reason?: string;
  }> => {
    // Backend endpoint: POST /api/customers/{id}/check-credit
    return apiClient.post(`/api/customers/${customerId}/check-credit`, { amount });
  },

  verifyOfflineTransactions: async (transactionIds: string[]): Promise<{
    verified: string[];
    failed: Array<{ id: string; reason: string }>;
  }> => {
    // Backend endpoint: POST /api/transactions/verify-offline
    return apiClient.post('/api/transactions/verify-offline', { transaction_ids: transactionIds });
  },

  getPendingVerifications: async (): Promise<Array<{
    transactionId: string;
    customerId: string;
    amount: number;
    createdAt: string;
  }>> => {
    // Backend endpoint: GET /api/transactions/pending-verifications
    return apiClient.get('/api/transactions/pending-verifications');
  },
};

// ============================================================================
// LOYALTY API
// ============================================================================

export interface LoyaltyBalance {
  customerId: string;
  points: number;
  tier: string;
  lifetimePoints: number;
  lastEarnedAt?: string;
  storeCredit?: number;
}

export interface PriceLevel {
  id: string;
  name: string;
  discountPercentage: number;
  minPurchaseAmount?: number;
  isDefault: boolean;
}

export interface StoreCreditBalance {
  customerId: string;
  balance: number;
  lastUsedAt?: string;
}

export const loyaltyApi = {
  getBalance: async (customerId: string): Promise<LoyaltyBalance> => {
    return apiClient.get(`/api/loyalty/${customerId}/balance`);
  },

  redeemPoints: async (customerId: string, points: number, transactionId?: string): Promise<{
    pointsRedeemed: number;
    dollarValue: number;
    remainingPoints: number;
  }> => {
    return apiClient.post(`/api/loyalty/${customerId}/redeem`, { points, transaction_id: transactionId });
  },

  adjustPoints: async (customerId: string, points: number, reason: string): Promise<LoyaltyBalance> => {
    return apiClient.post(`/api/loyalty/${customerId}/adjust`, { points, reason });
  },

  adjustTier: async (customerId: string, tier: string): Promise<LoyaltyBalance> => {
    return apiClient.post(`/api/loyalty/${customerId}/tier`, { tier });
  },

  getPriceLevels: async (): Promise<PriceLevel[]> => {
    return apiClient.get('/api/loyalty/price-levels');
  },

  createPriceLevel: async (level: Omit<PriceLevel, 'id'>): Promise<PriceLevel> => {
    return apiClient.post('/api/loyalty/price-levels', level);
  },

  getStoreCreditBalance: async (customerId: string): Promise<StoreCreditBalance> => {
    return apiClient.get(`/api/loyalty/${customerId}/store-credit`);
  },

  issueStoreCredit: async (customerId: string, amount: number, reason: string): Promise<StoreCreditBalance> => {
    return apiClient.post(`/api/loyalty/${customerId}/store-credit/issue`, { amount, reason });
  },

  redeemStoreCredit: async (customerId: string, amount: number, transactionId?: string): Promise<StoreCreditBalance> => {
    return apiClient.post(`/api/loyalty/${customerId}/store-credit/redeem`, { amount, transaction_id: transactionId });
  },
};

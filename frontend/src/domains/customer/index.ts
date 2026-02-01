/**
 * Customer Domain - Public API
 * 
 * Re-exports all public types and hooks for the customer domain
 */

// Types
export type {
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './api';

// API functions (for direct use if needed)
export {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './api';

// React Query hooks
export {
  useCustomersQuery,
  useCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useCustomerOrdersQuery,
  transformCustomer,
} from './hooks';

// Re-export Customer type alias for convenience
import type { CustomerResponse as CustomerResponseType } from './api';
export type Customer = CustomerResponseType;

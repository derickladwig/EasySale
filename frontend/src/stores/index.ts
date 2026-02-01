/**
 * Stores - Zustand-based global state management
 * 
 * This module exports all Zustand stores for the application.
 * Use these stores for complex client-side state that needs to be
 * shared across components and persisted.
 * 
 * Guidelines:
 * - Use Zustand stores for: cart, product cache, UI preferences
 * - Use React Context for: auth, theme, simple global state
 * - Use React Query for: server state, API data
 */

// Cart store
export {
  useCartStore,
  selectCartItems,
  selectCartCustomer,
  selectHasItems,
} from './cartStore';
export type {
  CartItem,
  CartCustomer,
  CartDiscount,
  CartState,
} from './cartStore';

// Product cache store
export {
  useProductStore,
  selectRecentlyViewed,
  selectCacheSize,
} from './productStore';
export type {
  CachedProduct,
  ProductCacheState,
} from './productStore';

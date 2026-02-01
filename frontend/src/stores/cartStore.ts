/**
 * Cart Store - Zustand-based global cart state management
 * 
 * Provides centralized cart state with persistence to localStorage.
 * Replaces local useState in SellPage for better state sharing.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ Types ============

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  discount?: number;
  attributes?: Record<string, string>;
  barcode?: string;
  taxable?: boolean;
}

export interface CartCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  pricingTier?: string;
}

export interface CartDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  code?: string;
  reason?: string;
}

export interface CartState {
  // State
  items: CartItem[];
  customer: CartCustomer | null;
  discount: CartDiscount | null;
  notes: string;
  holdId: string | null;
  
  // Computed (as functions to avoid stale closures)
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxAmount: (taxRate: number) => number;
  getTotal: (taxRate: number) => number;
  getItemCount: () => number;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  setDiscount: (discount: CartDiscount | null) => void;
  setNotes: (notes: string) => void;
  setHoldId: (holdId: string | null) => void;
  clear: () => void;
  
  // Bulk operations
  loadFromHold: (items: CartItem[], customer: CartCustomer | null, notes: string, holdId: string) => void;
}

// ============ Store Implementation ============

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      customer: null,
      discount: null,
      notes: '',
      holdId: null,

      // Computed values
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const { discount } = get();
        if (!discount) return 0;
        
        const subtotal = get().getSubtotal();
        if (discount.type === 'percentage') {
          return subtotal * (discount.value / 100);
        }
        return Math.min(discount.value, subtotal);
      },

      getTaxAmount: (taxRate: number) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const taxableAmount = subtotal - discountAmount;
        
        // Only tax taxable items
        const { items } = get();
        const taxableSubtotal = items
          .filter(item => item.taxable !== false)
          .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        
        // Calculate tax proportionally
        const taxablePortion = subtotal > 0 ? taxableSubtotal / subtotal : 1;
        return (taxableAmount * taxablePortion) * (taxRate / 100);
      },

      getTotal: (taxRate: number) => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        const taxAmount = get().getTaxAmount(taxRate);
        return subtotal - discountAmount + taxAmount;
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Actions
      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(i => i.productId === item.productId);
          
          if (existingIndex >= 0) {
            // Update quantity of existing item
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + (item.quantity ?? 1),
            };
            return { items: newItems };
          }
          
          // Add new item
          return {
            items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      updateItemPrice: (productId, price) => {
        set((state) => ({
          items: state.items.map(item =>
            item.productId === productId
              ? { ...item, unitPrice: price, originalPrice: item.originalPrice ?? item.unitPrice }
              : item
          ),
        }));
      },

      setCustomer: (customer) => {
        set({ customer });
      },

      setDiscount: (discount) => {
        set({ discount });
      },

      setNotes: (notes) => {
        set({ notes });
      },

      setHoldId: (holdId) => {
        set({ holdId });
      },

      clear: () => {
        set({
          items: [],
          customer: null,
          discount: null,
          notes: '',
          holdId: null,
        });
      },

      loadFromHold: (items, customer, notes, holdId) => {
        set({
          items,
          customer,
          notes,
          holdId,
          discount: null,
        });
      },
    }),
    {
      name: 'easysale-cart',
      storage: createJSONStorage(() => localStorage),
      // Only persist items, customer, notes - not computed values
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        discount: state.discount,
        notes: state.notes,
        holdId: state.holdId,
      }),
    }
  )
);

// ============ Selectors ============

/**
 * Select just the items from the cart store
 */
export const selectCartItems = (state: CartState) => state.items;

/**
 * Select just the customer from the cart store
 */
export const selectCartCustomer = (state: CartState) => state.customer;

/**
 * Select if cart has items
 */
export const selectHasItems = (state: CartState) => state.items.length > 0;

/**
 * useCart Hook - Bridge between SellPage and Zustand cart store
 * 
 * This hook provides a backward-compatible interface for the SellPage
 * while using the Zustand cart store under the hood.
 * 
 * Usage:
 * Replace local useState cart management with this hook for
 * centralized cart state that persists across page navigations.
 */

import { useCallback, useMemo } from 'react';
import { useCartStore, CartItem as StoreCartItem, CartCustomer, CartDiscount } from '@stores';
import { Product } from '@domains/product';
import { Customer } from '@domains/customer';
import { toast } from '@common/components/molecules/Toast';

// Legacy CartItem interface for backward compatibility with SellPage
export interface CartItem {
  product: Product;
  quantity: number;
  priceOverride?: number;
  itemDiscount?: number;
  discountReason?: string;
}

/**
 * Transform store cart item to legacy format
 */
function toCartItem(storeItem: StoreCartItem, products: Product[]): CartItem | null {
  const product = products.find(p => p.id === storeItem.productId);
  if (!product) return null;
  
  return {
    product,
    quantity: storeItem.quantity,
    priceOverride: storeItem.unitPrice !== product.unitPrice ? storeItem.unitPrice : undefined,
    itemDiscount: storeItem.discount,
    discountReason: undefined, // Not stored in Zustand yet
  };
}

/**
 * Transform legacy customer to store format
 */
function toCartCustomer(customer: Customer | null): CartCustomer | null {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    pricingTier: customer.tier,
  };
}

/**
 * Transform store customer to legacy format
 */
function toLegacyCustomer(cartCustomer: CartCustomer | null): Customer | null {
  if (!cartCustomer) return null;
  return {
    id: cartCustomer.id,
    name: cartCustomer.name,
    email: cartCustomer.email ?? '',
    phone: cartCustomer.phone ?? '',
    type: 'individual',
    tier: (cartCustomer.pricingTier as 'standard' | 'silver' | 'gold' | 'platinum') || 'standard',
    totalSpent: 0,
    orderCount: 0,
    lastOrder: new Date().toISOString(),
  };
}

export interface UseCartOptions {
  /** Products list for hydrating cart items */
  products: Product[];
  /** Tax rate as decimal (e.g., 0.13 for 13%) */
  taxRate?: number;
}

export interface UseCartReturn {
  // State
  cart: CartItem[];
  customer: Customer | null;
  discount: number;
  couponCode: string | null;
  notes: string;
  holdId: string | null;
  
  // Computed
  subtotal: number;
  discountedSubtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  
  // Actions
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  updateLineItem: (productId: string, updates: { priceOverride?: number; itemDiscount?: number; discountReason?: string }) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setCouponCode: (code: string | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  
  // Hold operations
  holdTransaction: (note: string) => string;
  resumeHold: (holdId: string, items: CartItem[], customer: Customer | null, notes: string) => void;
}

/**
 * Hook for cart management with Zustand store
 * 
 * @example
 * const { cart, addToCart, total, clearCart } = useCart({ products, taxRate: 0.13 });
 */
export function useCart({ products, taxRate = 0 }: UseCartOptions): UseCartReturn {
  const store = useCartStore();
  
  // Transform store items to legacy format
  const cart = useMemo(() => {
    return store.items
      .map(item => toCartItem(item, products))
      .filter((item): item is CartItem => item !== null);
  }, [store.items, products]);
  
  // Transform customer
  const customer = useMemo(() => toLegacyCustomer(store.customer), [store.customer]);
  
  // Calculate line item price helper
  const getLineItemPrice = useCallback((item: CartItem): number => {
    const basePrice = item.priceOverride ?? item.product.unitPrice ?? 0;
    const lineDiscount = item.itemDiscount ?? 0;
    return Math.max(0, basePrice - lineDiscount);
  }, []);
  
  // Computed values
  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + getLineItemPrice(item) * item.quantity, 0),
    [cart, getLineItemPrice]
  );
  
  const discount = store.discount?.value ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Actions
  const addToCart = useCallback((product: Product) => {
    const currentItem = store.items.find(i => i.productId === product.id);
    const currentQty = currentItem?.quantity ?? 0;
    const availableStock = product.quantityOnHand ?? Infinity;
    
    if (currentQty >= availableStock) {
      toast.warning(`Only ${availableStock} ${product.name} available in stock`);
      return;
    }
    
    store.addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice ?? 0,
      barcode: product.barcode,
      taxable: true,
      attributes: product.attributes,
    });
  }, [store]);
  
  const updateQuantity = useCallback((productId: string, delta: number) => {
    const item = store.items.find(i => i.productId === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    if (delta > 0 && product) {
      const availableStock = product.quantityOnHand ?? Infinity;
      if (item.quantity >= availableStock) {
        toast.warning(`Only ${availableStock} ${product.name} available in stock`);
        return;
      }
    }
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      store.removeItem(productId);
    } else {
      store.updateQuantity(productId, newQty);
    }
  }, [store, products]);
  
  const removeFromCart = useCallback((productId: string) => {
    store.removeItem(productId);
  }, [store]);
  
  const updateLineItem = useCallback((
    productId: string,
    updates: { priceOverride?: number; itemDiscount?: number; discountReason?: string }
  ) => {
    if (updates.priceOverride !== undefined) {
      store.updateItemPrice(productId, updates.priceOverride);
    }
    // Note: itemDiscount and discountReason would need store extension
  }, [store]);
  
  const setCustomer = useCallback((customer: Customer | null) => {
    store.setCustomer(toCartCustomer(customer));
  }, [store]);
  
  const setDiscount = useCallback((value: number) => {
    if (value > 0) {
      store.setDiscount({ type: 'fixed', value });
    } else {
      store.setDiscount(null);
    }
  }, [store]);
  
  const setCouponCode = useCallback((_code: string | null) => {
    // Coupon codes would need to be validated and applied via API
    // For now, this is a placeholder
  }, []);
  
  const setNotes = useCallback((notes: string) => {
    store.setNotes(notes);
  }, [store]);
  
  const clearCart = useCallback(() => {
    store.clear();
  }, [store]);
  
  const holdTransaction = useCallback((note: string): string => {
    const holdId = `HOLD-${Date.now()}`;
    store.setHoldId(holdId);
    store.setNotes(note);
    // In a real implementation, we'd save to backend/localStorage
    return holdId;
  }, [store]);
  
  const resumeHold = useCallback((
    holdId: string,
    items: CartItem[],
    customer: Customer | null,
    notes: string
  ) => {
    const storeItems: StoreCartItem[] = items.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.priceOverride ?? item.product.unitPrice ?? 0,
      discount: item.itemDiscount,
      taxable: true,
      attributes: item.product.attributes ? Object.fromEntries(
        Object.entries(item.product.attributes).map(([k, v]) => [k, String(v)])
      ) : undefined,
    }));
    
    store.loadFromHold(storeItems, toCartCustomer(customer), notes, holdId);
  }, [store]);
  
  return {
    cart,
    customer,
    discount,
    couponCode: null, // Not implemented in store yet
    notes: store.notes,
    holdId: store.holdId,
    subtotal,
    discountedSubtotal,
    tax,
    total,
    itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    updateLineItem,
    setCustomer,
    setDiscount,
    setCouponCode,
    setNotes,
    clearCart,
    holdTransaction,
    resumeHold,
  };
}

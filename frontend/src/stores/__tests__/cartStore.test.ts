/**
 * Cart Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cartStore';

describe('cartStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCartStore.setState({
      items: [],
      customer: null,
      discount: null,
      notes: '',
      holdId: null,
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const { addItem, items } = useCartStore.getState();
      
      addItem({
        productId: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        unitPrice: 10.00,
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('prod-1');
      expect(state.items[0].quantity).toBe(1);
    });

    it('should increment quantity for existing item', () => {
      const { addItem } = useCartStore.getState();
      
      addItem({
        productId: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        unitPrice: 10.00,
      });
      
      addItem({
        productId: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        unitPrice: 10.00,
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(2);
    });

    it('should add item with custom quantity', () => {
      const { addItem } = useCartStore.getState();
      
      addItem({
        productId: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        unitPrice: 10.00,
        quantity: 5,
      });

      const state = useCartStore.getState();
      expect(state.items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', () => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 1, unitPrice: 10 },
          { productId: 'prod-2', name: 'Product 2', sku: 'SKU-002', quantity: 2, unitPrice: 20 },
        ],
      });

      const { removeItem } = useCartStore.getState();
      removeItem('prod-1');

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('prod-2');
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 1, unitPrice: 10 },
        ],
      });

      const { updateQuantity } = useCartStore.getState();
      updateQuantity('prod-1', 5);

      const state = useCartStore.getState();
      expect(state.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is 0 or less', () => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 1, unitPrice: 10 },
        ],
      });

      const { updateQuantity } = useCartStore.getState();
      updateQuantity('prod-1', 0);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('updateItemPrice', () => {
    it('should update item price and preserve original', () => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 1, unitPrice: 10 },
        ],
      });

      const { updateItemPrice } = useCartStore.getState();
      updateItemPrice('prod-1', 8);

      const state = useCartStore.getState();
      expect(state.items[0].unitPrice).toBe(8);
      expect(state.items[0].originalPrice).toBe(10);
    });
  });

  describe('setCustomer', () => {
    it('should set customer', () => {
      const { setCustomer } = useCartStore.getState();
      
      setCustomer({
        id: 'cust-1',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const state = useCartStore.getState();
      expect(state.customer?.id).toBe('cust-1');
      expect(state.customer?.name).toBe('John Doe');
    });

    it('should clear customer when set to null', () => {
      useCartStore.setState({
        customer: { id: 'cust-1', name: 'John Doe' },
      });

      const { setCustomer } = useCartStore.getState();
      setCustomer(null);

      const state = useCartStore.getState();
      expect(state.customer).toBeNull();
    });
  });

  describe('setDiscount', () => {
    it('should set discount', () => {
      const { setDiscount } = useCartStore.getState();
      
      setDiscount({ type: 'percentage', value: 10 });

      const state = useCartStore.getState();
      expect(state.discount?.type).toBe('percentage');
      expect(state.discount?.value).toBe(10);
    });
  });

  describe('clear', () => {
    it('should clear all cart state', () => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 1, unitPrice: 10 },
        ],
        customer: { id: 'cust-1', name: 'John Doe' },
        discount: { type: 'fixed', value: 5 },
        notes: 'Test notes',
        holdId: 'HOLD-123',
      });

      const { clear } = useCartStore.getState();
      clear();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.customer).toBeNull();
      expect(state.discount).toBeNull();
      expect(state.notes).toBe('');
      expect(state.holdId).toBeNull();
    });
  });

  describe('computed values', () => {
    beforeEach(() => {
      useCartStore.setState({
        items: [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 2, unitPrice: 10 },
          { productId: 'prod-2', name: 'Product 2', sku: 'SKU-002', quantity: 1, unitPrice: 25 },
        ],
      });
    });

    it('should calculate subtotal correctly', () => {
      const { getSubtotal } = useCartStore.getState();
      expect(getSubtotal()).toBe(45); // (2 * 10) + (1 * 25)
    });

    it('should calculate item count correctly', () => {
      const { getItemCount } = useCartStore.getState();
      expect(getItemCount()).toBe(3); // 2 + 1
    });

    it('should calculate discount amount for fixed discount', () => {
      useCartStore.setState({
        discount: { type: 'fixed', value: 10 },
      });

      const { getDiscountAmount } = useCartStore.getState();
      expect(getDiscountAmount()).toBe(10);
    });

    it('should calculate discount amount for percentage discount', () => {
      useCartStore.setState({
        discount: { type: 'percentage', value: 10 },
      });

      const { getDiscountAmount } = useCartStore.getState();
      expect(getDiscountAmount()).toBe(4.5); // 10% of 45
    });

    it('should calculate total with tax', () => {
      const { getTotal } = useCartStore.getState();
      expect(getTotal(10)).toBe(49.5); // 45 + (45 * 0.10)
    });

    it('should calculate total with discount and tax', () => {
      useCartStore.setState({
        discount: { type: 'fixed', value: 5 },
      });

      const { getTotal } = useCartStore.getState();
      // Subtotal: 45, Discount: 5, After discount: 40, Tax (10%): 4, Total: 44
      expect(getTotal(10)).toBe(44);
    });
  });

  describe('loadFromHold', () => {
    it('should load cart from held transaction', () => {
      const { loadFromHold } = useCartStore.getState();
      
      loadFromHold(
        [
          { productId: 'prod-1', name: 'Product 1', sku: 'SKU-001', quantity: 2, unitPrice: 10 },
        ],
        { id: 'cust-1', name: 'John Doe' },
        'Held for customer',
        'HOLD-123'
      );

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.customer?.id).toBe('cust-1');
      expect(state.notes).toBe('Held for customer');
      expect(state.holdId).toBe('HOLD-123');
      expect(state.discount).toBeNull(); // Discount should be cleared
    });
  });
});

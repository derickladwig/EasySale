/**
 * Product Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProductStore } from '../productStore';

describe('productStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProductStore.setState({
      products: {},
      recentlyViewed: [],
      maxCacheSize: 500,
      maxRecentlyViewed: 20,
    });
  });

  describe('cacheProduct', () => {
    it('should cache a product', () => {
      const { cacheProduct } = useProductStore.getState();
      
      cacheProduct({
        id: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        price: 10.00,
      });

      const state = useProductStore.getState();
      expect(state.products['prod-1']).toBeDefined();
      expect(state.products['prod-1'].name).toBe('Test Product');
      expect(state.products['prod-1'].lastAccessed).toBeDefined();
    });

    it('should update existing cached product', () => {
      const { cacheProduct } = useProductStore.getState();
      
      cacheProduct({
        id: 'prod-1',
        name: 'Test Product',
        sku: 'SKU-001',
        price: 10.00,
      });

      const firstAccess = useProductStore.getState().products['prod-1'].lastAccessed;

      // Wait a bit and cache again
      cacheProduct({
        id: 'prod-1',
        name: 'Updated Product',
        sku: 'SKU-001',
        price: 15.00,
      });

      const state = useProductStore.getState();
      expect(state.products['prod-1'].name).toBe('Updated Product');
      expect(state.products['prod-1'].price).toBe(15.00);
      expect(state.products['prod-1'].lastAccessed).toBeGreaterThanOrEqual(firstAccess);
    });
  });

  describe('cacheProducts', () => {
    it('should cache multiple products', () => {
      const { cacheProducts } = useProductStore.getState();
      
      cacheProducts([
        { id: 'prod-1', name: 'Product 1', sku: 'SKU-001', price: 10 },
        { id: 'prod-2', name: 'Product 2', sku: 'SKU-002', price: 20 },
        { id: 'prod-3', name: 'Product 3', sku: 'SKU-003', price: 30 },
      ]);

      const state = useProductStore.getState();
      expect(Object.keys(state.products)).toHaveLength(3);
    });
  });

  describe('getProduct', () => {
    it('should return cached product', () => {
      useProductStore.setState({
        products: {
          'prod-1': {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'SKU-001',
            price: 10,
            lastAccessed: Date.now() - 1000,
          },
        },
      });

      const { getProduct } = useProductStore.getState();
      const product = getProduct('prod-1');

      expect(product).toBeDefined();
      expect(product?.name).toBe('Test Product');
    });

    it('should update lastAccessed when getting product', () => {
      const oldTime = Date.now() - 10000;
      useProductStore.setState({
        products: {
          'prod-1': {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'SKU-001',
            price: 10,
            lastAccessed: oldTime,
          },
        },
      });

      const { getProduct } = useProductStore.getState();
      getProduct('prod-1');

      const state = useProductStore.getState();
      expect(state.products['prod-1'].lastAccessed).toBeGreaterThan(oldTime);
    });

    it('should return undefined for non-existent product', () => {
      const { getProduct } = useProductStore.getState();
      const product = getProduct('non-existent');

      expect(product).toBeUndefined();
    });
  });

  describe('getProductByBarcode', () => {
    it('should find product by barcode', () => {
      useProductStore.setState({
        products: {
          'prod-1': {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'SKU-001',
            barcode: '1234567890',
            price: 10,
            lastAccessed: Date.now(),
          },
        },
      });

      const { getProductByBarcode } = useProductStore.getState();
      const product = getProductByBarcode('1234567890');

      expect(product).toBeDefined();
      expect(product?.id).toBe('prod-1');
    });

    it('should return undefined for non-existent barcode', () => {
      const { getProductByBarcode } = useProductStore.getState();
      const product = getProductByBarcode('non-existent');

      expect(product).toBeUndefined();
    });
  });

  describe('getProductBySku', () => {
    it('should find product by SKU', () => {
      useProductStore.setState({
        products: {
          'prod-1': {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'SKU-001',
            price: 10,
            lastAccessed: Date.now(),
          },
        },
      });

      const { getProductBySku } = useProductStore.getState();
      const product = getProductBySku('SKU-001');

      expect(product).toBeDefined();
      expect(product?.id).toBe('prod-1');
    });
  });

  describe('addToRecentlyViewed', () => {
    it('should add product to recently viewed', () => {
      const { addToRecentlyViewed } = useProductStore.getState();
      
      addToRecentlyViewed('prod-1');
      addToRecentlyViewed('prod-2');

      const state = useProductStore.getState();
      expect(state.recentlyViewed).toEqual(['prod-2', 'prod-1']);
    });

    it('should move existing product to front', () => {
      useProductStore.setState({
        recentlyViewed: ['prod-1', 'prod-2', 'prod-3'],
      });

      const { addToRecentlyViewed } = useProductStore.getState();
      addToRecentlyViewed('prod-2');

      const state = useProductStore.getState();
      expect(state.recentlyViewed).toEqual(['prod-2', 'prod-1', 'prod-3']);
    });

    it('should limit recently viewed to maxRecentlyViewed', () => {
      useProductStore.setState({
        maxRecentlyViewed: 3,
        recentlyViewed: ['prod-1', 'prod-2', 'prod-3'],
      });

      const { addToRecentlyViewed } = useProductStore.getState();
      addToRecentlyViewed('prod-4');

      const state = useProductStore.getState();
      expect(state.recentlyViewed).toHaveLength(3);
      expect(state.recentlyViewed).toEqual(['prod-4', 'prod-1', 'prod-2']);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached products and recently viewed', () => {
      useProductStore.setState({
        products: {
          'prod-1': { id: 'prod-1', name: 'Product 1', sku: 'SKU-001', price: 10, lastAccessed: Date.now() },
        },
        recentlyViewed: ['prod-1'],
      });

      const { clearCache } = useProductStore.getState();
      clearCache();

      const state = useProductStore.getState();
      expect(Object.keys(state.products)).toHaveLength(0);
      expect(state.recentlyViewed).toHaveLength(0);
    });
  });

  describe('pruneCache', () => {
    it('should remove products not accessed in the last hour', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const thirtyMinutesAgo = now - 30 * 60 * 1000;

      useProductStore.setState({
        products: {
          'old-prod': {
            id: 'old-prod',
            name: 'Old Product',
            sku: 'OLD-001',
            price: 10,
            lastAccessed: twoHoursAgo,
          },
          'recent-prod': {
            id: 'recent-prod',
            name: 'Recent Product',
            sku: 'NEW-001',
            price: 20,
            lastAccessed: thirtyMinutesAgo,
          },
        },
      });

      const { pruneCache } = useProductStore.getState();
      pruneCache();

      const state = useProductStore.getState();
      expect(state.products['old-prod']).toBeUndefined();
      expect(state.products['recent-prod']).toBeDefined();
    });
  });

  describe('cache size limits', () => {
    it('should prune oldest products when cache exceeds maxCacheSize', () => {
      useProductStore.setState({
        maxCacheSize: 3,
        products: {},
      });

      const { cacheProducts } = useProductStore.getState();
      
      // Cache 5 products with different access times
      const now = Date.now();
      cacheProducts([
        { id: 'prod-1', name: 'Product 1', sku: 'SKU-001', price: 10 },
        { id: 'prod-2', name: 'Product 2', sku: 'SKU-002', price: 20 },
        { id: 'prod-3', name: 'Product 3', sku: 'SKU-003', price: 30 },
        { id: 'prod-4', name: 'Product 4', sku: 'SKU-004', price: 40 },
        { id: 'prod-5', name: 'Product 5', sku: 'SKU-005', price: 50 },
      ]);

      const state = useProductStore.getState();
      expect(Object.keys(state.products).length).toBeLessThanOrEqual(3);
    });
  });
});

/**
 * Product Store - Zustand-based product cache
 * 
 * Provides a client-side cache for frequently accessed products.
 * Useful for quick lookups during barcode scanning without re-fetching.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ Types ============

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  quantity?: number;
  category?: string;
  taxable?: boolean;
  attributes?: Record<string, string>;
  imageUrl?: string;
  lastAccessed: number;
}

export interface ProductCacheState {
  // State
  products: Record<string, CachedProduct>;
  recentlyViewed: string[];
  maxCacheSize: number;
  maxRecentlyViewed: number;
  
  // Actions
  cacheProduct: (product: Omit<CachedProduct, 'lastAccessed'>) => void;
  cacheProducts: (products: Omit<CachedProduct, 'lastAccessed'>[]) => void;
  getProduct: (id: string) => CachedProduct | undefined;
  getProductByBarcode: (barcode: string) => CachedProduct | undefined;
  getProductBySku: (sku: string) => CachedProduct | undefined;
  addToRecentlyViewed: (productId: string) => void;
  clearCache: () => void;
  pruneCache: () => void;
}

// ============ Store Implementation ============

export const useProductStore = create<ProductCacheState>()(
  persist(
    (set, get) => ({
      // Initial state
      products: {},
      recentlyViewed: [],
      maxCacheSize: 500,
      maxRecentlyViewed: 20,

      // Actions
      cacheProduct: (product) => {
        set((state) => {
          const newProducts = {
            ...state.products,
            [product.id]: {
              ...product,
              lastAccessed: Date.now(),
            },
          };
          
          // Prune if over max size
          const productIds = Object.keys(newProducts);
          if (productIds.length > state.maxCacheSize) {
            // Remove oldest accessed products
            const sorted = productIds
              .map(id => ({ id, lastAccessed: newProducts[id].lastAccessed }))
              .sort((a, b) => b.lastAccessed - a.lastAccessed);
            
            const toKeep = sorted.slice(0, state.maxCacheSize);
            const prunedProducts: Record<string, CachedProduct> = {};
            toKeep.forEach(({ id }) => {
              prunedProducts[id] = newProducts[id];
            });
            
            return { products: prunedProducts };
          }
          
          return { products: newProducts };
        });
      },

      cacheProducts: (products) => {
        set((state) => {
          const newProducts = { ...state.products };
          const now = Date.now();
          
          products.forEach(product => {
            newProducts[product.id] = {
              ...product,
              lastAccessed: now,
            };
          });
          
          // Prune if over max size
          const productIds = Object.keys(newProducts);
          if (productIds.length > state.maxCacheSize) {
            const sorted = productIds
              .map(id => ({ id, lastAccessed: newProducts[id].lastAccessed }))
              .sort((a, b) => b.lastAccessed - a.lastAccessed);
            
            const toKeep = sorted.slice(0, state.maxCacheSize);
            const prunedProducts: Record<string, CachedProduct> = {};
            toKeep.forEach(({ id }) => {
              prunedProducts[id] = newProducts[id];
            });
            
            return { products: prunedProducts };
          }
          
          return { products: newProducts };
        });
      },

      getProduct: (id) => {
        const { products } = get();
        const product = products[id];
        
        if (product) {
          // Update last accessed time
          set((state) => ({
            products: {
              ...state.products,
              [id]: { ...product, lastAccessed: Date.now() },
            },
          }));
        }
        
        return product;
      },

      getProductByBarcode: (barcode) => {
        const { products } = get();
        return Object.values(products).find(p => p.barcode === barcode);
      },

      getProductBySku: (sku) => {
        const { products } = get();
        return Object.values(products).find(p => p.sku === sku);
      },

      addToRecentlyViewed: (productId) => {
        set((state) => {
          // Remove if already in list
          const filtered = state.recentlyViewed.filter(id => id !== productId);
          // Add to front
          const newList = [productId, ...filtered];
          // Trim to max size
          return {
            recentlyViewed: newList.slice(0, state.maxRecentlyViewed),
          };
        });
      },

      clearCache: () => {
        set({
          products: {},
          recentlyViewed: [],
        });
      },

      pruneCache: () => {
        set((state) => {
          const now = Date.now();
          const oneHourAgo = now - 60 * 60 * 1000;
          
          // Remove products not accessed in the last hour
          const prunedProducts: Record<string, CachedProduct> = {};
          Object.entries(state.products).forEach(([id, product]) => {
            if (product.lastAccessed > oneHourAgo) {
              prunedProducts[id] = product;
            }
          });
          
          return { products: prunedProducts };
        });
      },
    }),
    {
      name: 'easysale-product-cache',
      storage: createJSONStorage(() => localStorage),
      // Only persist products and recently viewed
      partialize: (state) => ({
        products: state.products,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);

// ============ Selectors ============

/**
 * Select recently viewed product IDs
 */
export const selectRecentlyViewed = (state: ProductCacheState) => state.recentlyViewed;

/**
 * Select cache size
 */
export const selectCacheSize = (state: ProductCacheState) => Object.keys(state.products).length;

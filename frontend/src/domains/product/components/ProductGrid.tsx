import React, { useState, useEffect } from 'react';
import { Product, CategoryConfig as _CategoryConfig } from '../types';
import { productApi } from '../api';

interface ProductGridProps {
  category?: string;
  filters?: Record<string, any>;
  onProductSelect?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  category,
  filters,
  onProductSelect,
  viewMode = 'grid',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
  }, [category, filters, page]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productApi.listProducts({
        page,
        pageSize: 50,
        category,
      });
      setProducts(response.products);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  if (loading && products.length === 0) {
    return <div className="p-4 text-center">Loading products...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-[var(--color-error-600)]">Error: {error}</div>;
  }

  if (products.length === 0) {
    return <div className="p-4 text-center text-text-tertiary">No products found</div>;
  }

  return (
    <div className="product-grid">
      {/* Selection controls */}
      {selectedProducts.size > 0 && (
        <div className="mb-4 p-3 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
          </span>
          <div className="space-x-2">
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-surface-elevated border border-border text-text-primary rounded hover:bg-surface-overlay"
            >
              Deselect All
            </button>
            <button className="px-3 py-1 text-sm bg-accent text-accent-foreground rounded hover:bg-accent-hover">
              Bulk Actions
            </button>
          </div>
        </div>
      )}

      {/* Grid/List view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-surface-base"
              onClick={() => onProductSelect?.(product)}
            >
              <div className="flex items-start justify-between mb-2">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleProductSelection(product.id);
                  }}
                  className="mt-1"
                />
                {product.images.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
              <h3 className="font-semibold text-lg mb-1 text-text-primary">{product.name}</h3>
              <p className="text-sm text-text-secondary mb-2">SKU: {product.sku}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-success">
                  ${product.unitPrice.toFixed(2)}
                </span>
                <span className="text-sm text-text-tertiary">Stock: {product.quantityOnHand}</span>
              </div>
              {product.profitMargin > 0 && (
                <div className="mt-2 text-xs text-text-tertiary">
                  Margin: {product.profitMargin.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-elevated">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === products.length}
                    onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-base divide-y divide-border">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-surface-elevated cursor-pointer"
                  onClick={() => onProductSelect?.(product)}
                >
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleProductSelection(product.id);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    ${product.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{product.quantityOnHand}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {product.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="mt-4 flex justify-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

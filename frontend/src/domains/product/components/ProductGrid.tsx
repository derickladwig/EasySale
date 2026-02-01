import React, { useState } from 'react';
import { Product, CategoryConfig as _CategoryConfig } from '../types';
import { useProductsQuery } from '../hooks';

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
  const [page, setPage] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Use React Query hook for better state management
  const { data, isLoading, isError, error } = useProductsQuery({
    page,
    pageSize: 50,
    category,
  });

  const products = data?.products || [];
  const hasMore = data?.hasMore || false;

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

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading products...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-error-600 dark:text-error-400 font-medium mb-2">Error loading products</p>
          <p className="text-error-700 dark:text-error-300 text-sm">
            {error instanceof Error ? error.message : 'Failed to load products'}
          </p>
        </div>
      </div>
    );
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

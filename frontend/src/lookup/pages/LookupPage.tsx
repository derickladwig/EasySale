import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronRight,
  Info,
  ShoppingCart,
  History,
  Star,
  MapPin,
  Package,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useConfig, DynamicIcon } from '../../config';
import { useProductsQuery } from '@domains/product/hooks';
import { Product } from '@domains/product/types';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { EmptyDetailPane } from '@common/components/molecules/EmptyDetailPane';
import { CreateProductModal } from '../components/CreateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { DeleteProductDialog } from '../components/DeleteProductDialog';
import { Button } from '@common/components/atoms/Button';

export function LookupPage() {
  const navigate = useNavigate();
  const { categories, formatCurrency } = useConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch products from API
  const { data: productsResponse, isLoading, error } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  // Build category list from config
  const categoryOptions = ['All', ...categories.map((cat) => cat.id)];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.attributes?.brand?.toString().toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-tertiary">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="text-center max-w-md">
          <div className="text-error-500 mb-4">
            <Package size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-text-secondary mb-2">Failed to load products</h2>
          <p className="text-text-tertiary mb-4">
            {error.message || 'An error occurred while loading products'}
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state - no products at all
  if (products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <EmptyState
          title="No products found"
          description="Start by importing products or adding your first product to the inventory"
          icon={<Package size={48} />}
          primaryAction={{
            label: 'Add product',
            onClick: () => setShowCreateModal(true),
          }}
          secondaryAction={{
            label: 'Import products',
            onClick: () => navigate('/admin/data-management'),
          }}
        />
        <CreateProductModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left Panel - Search & Results */}
      <div className="flex-1 flex flex-col bg-background-primary min-h-0">
        {/* Search Header */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                size={20}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, brand, or part number..."
                className="w-full pl-10 pr-4 py-3 bg-surface-base border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button
              variant="primary"
              leftIcon={<Plus size={20} />}
              onClick={() => setShowCreateModal(true)}
            >
              <span className="hidden sm:inline">Add</span>
            </Button>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              leftIcon={<Filter size={20} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryOptions.map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              const label = categoryId === 'All' ? 'All' : category?.name || categoryId;

              return (
                <button
                  key={categoryId}
                  onClick={() => setSelectedCategory(categoryId)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                    selectedCategory === categoryId
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-base text-text-secondary hover:bg-surface-elevated'
                  )}
                >
                  {category?.icon && <DynamicIcon name={category.icon} size={16} />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <select className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>All Brands</option>
                {/* Brand options derived from actual product data */}
                {Array.from(new Set(products.map(p => p.attributes?.brand).filter(Boolean)))
                  .sort()
                  .map(brand => (
                    <option key={String(brand)} value={String(brand)}>{String(brand)}</option>
                  ))}
              </select>
              <select className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>All Stock Levels</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
              <select className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Price: Any</option>
                <option>Under $25</option>
                <option>$25 - $50</option>
                <option>$50 - $100</option>
                <option>Over $100</option>
              </select>
              <select className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Sort: Relevance</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name: A-Z</option>
                <option>Stock Level</option>
              </select>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="px-4 py-2 border-b border-border text-sm text-text-tertiary">
          {filteredProducts.length} products found
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Search size={48} className="text-text-tertiary mb-4 opacity-50" />
              <p className="text-lg font-medium text-text-secondary mb-2">
                No products match your search
              </p>
              <p className="text-sm text-text-tertiary">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const price = product.price ?? product.unitPrice;
              const stock = product.quantity ?? product.quantityOnHand;
              const brand = product.attributes?.brand;

              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    'w-full p-4 flex items-start gap-4 border-b border-border text-left transition-colors',
                    selectedProduct?.id === product.id ? 'bg-surface-base' : 'hover:bg-surface-base/50'
                  )}
                >
                  <div className="w-16 h-16 bg-surface-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const category = categories.find((c) => c.id === product.category);
                      return category?.icon ? (
                        <DynamicIcon name={category.icon} size={24} className="text-text-tertiary" />
                      ) : (
                        <DynamicIcon name="Package" size={24} className="text-text-tertiary" />
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary mb-1">{product.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-text-tertiary">{product.sku}</span>
                      {brand && (
                        <span className="px-2 py-0.5 bg-surface-elevated rounded text-text-secondary">
                          {brand}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-primary-400 font-semibold">
                        {formatCurrency(price)}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          stock > 20
                            ? 'bg-success-500/20 text-success-400'
                            : stock > 5
                              ? 'bg-warning-500/20 text-warning-400'
                              : 'bg-error-500/20 text-error-400'
                        )}
                      >
                        {stock} in stock
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-text-disabled flex-shrink-0" size={20} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Product Details */}
      <div className="w-full lg:w-[400px] bg-surface-base border-l border-border flex flex-col min-h-0">
        {selectedProduct ? (
          <>
            {(() => {
              const price = selectedProduct.price ?? selectedProduct.unitPrice;
              const stock = selectedProduct.quantity ?? selectedProduct.quantityOnHand;
              const brand = selectedProduct.attributes?.brand;
              const location = selectedProduct.attributes?.location;

              return (
                <>
                  {/* Product header */}
                  <div className="p-6 border-b border-border">
                    <div className="w-full aspect-video bg-surface-elevated rounded-lg mb-4 flex items-center justify-center">
                      {(() => {
                        const category = categories.find((c) => c.id === selectedProduct.category);
                        return category?.icon ? (
                          <DynamicIcon name={category.icon} size={48} className="text-text-disabled" />
                        ) : (
                          <DynamicIcon name="Package" size={48} className="text-text-disabled" />
                        );
                      })()}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-text-tertiary mb-3">
                      <span>{selectedProduct.sku}</span>
                      {brand && (
                        <>
                          <span>•</span>
                          <span>{brand}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-primary-400">
                        {formatCurrency(price)}
                      </span>
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-sm font-medium',
                          stock > 20
                            ? 'bg-success-500/20 text-success-400'
                            : stock > 5
                              ? 'bg-warning-500/20 text-warning-400'
                              : 'bg-error-500/20 text-error-400'
                        )}
                      >
                        {stock} in stock
                      </span>
                    </div>
                  </div>

                  {/* Product details */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Location */}
                    {location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="text-text-tertiary flex-shrink-0 mt-0.5" size={20} />
                        <div>
                          <div className="text-sm text-text-tertiary mb-1">Location</div>
                          <div className="text-text-primary">{location}</div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {selectedProduct.description && (
                      <div className="flex items-start gap-3">
                        <Info className="text-text-tertiary flex-shrink-0 mt-0.5" size={20} />
                        <div>
                          <div className="text-sm text-text-tertiary mb-1">Description</div>
                          <div className="text-text-primary">{selectedProduct.description}</div>
                        </div>
                      </div>
                    )}

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-surface-elevated rounded-lg">
                        <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                          <History size={16} />
                          Last Sold
                        </div>
                        <div className="text-text-primary font-medium">2 days ago</div>
                      </div>
                      <div className="p-3 bg-surface-elevated rounded-lg">
                        <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                          <Star size={16} />
                          Popularity
                        </div>
                        <div className="text-text-primary font-medium">High</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-border space-y-2">
                    <Button
                      variant="primary"
                      fullWidth
                      leftIcon={<ShoppingCart size={20} />}
                    >
                      Add to Sale
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        leftIcon={<Edit size={16} />}
                        onClick={() => setShowEditModal(true)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <EmptyDetailPane
            message="Select a product to view details"
            shortcuts={[
              { key: 'F3', description: 'Search products' },
              { key: '↑↓', description: 'Navigate list' },
              { key: 'Enter', description: 'View details' },
            ]}
          />
        )}
      </div>

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      {selectedProduct && (
        <>
          <EditProductModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            product={selectedProduct}
          />
          <DeleteProductDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            product={selectedProduct}
            onDeleted={() => setSelectedProduct(null)}
          />
        </>
      )}
    </div>
  );
}

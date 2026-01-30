import { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Receipt,
  Percent,
  Tag,
  ShoppingCart,
  ChevronRight,
  Grid3X3,
  List,
  Scan,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useConfig, DynamicIcon } from '../../config';
import { useProductsQuery, Product } from '@domains/product';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { Alert } from '@common/components/organisms/Alert';
import { EmptyState } from '@common/components/molecules/EmptyState';
// AppShell and Navigation removed - AppLayout provides navigation
// import { AppShell } from '../../components/AppShell';
// import { PageHeader } from '../../components/PageHeader';
// import { Navigation } from '@common/components/Navigation';
import { Stack } from '../../components/ui/Stack';

interface CartItem {
  product: Product;
  quantity: number;
}

export function SellPage() {
  const { categories, formatCurrency } = useConfig();

  // Fetch products from API
  const { data: productsResponse, isLoading, error } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Build category list from config
  const categoryOptions = ['All', ...categories.map((cat) => cat.id)];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product.unitPrice || 0) * item.quantity,
    0
  );
  const tax = subtotal * 0.13; // 13% tax
  const total = subtotal + tax;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" variant="primary" text="Loading products..." centered />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
        </div>
        <div className="max-w-md mx-auto py-8">
          <Alert
            variant="error"
            title="Failed to load products"
            description={
              error.message || 'An error occurred while loading products. Please try again.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Product Catalog */}
      <div className="flex-1 flex flex-col bg-bg-primary border-r border-border-subtle min-h-0">
        {/* Search and filters */}
        <div className="p-4 border-b border-border-subtle">
          <Stack gap="3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Category tabs and view toggle */}
            <div className="flex items-center justify-between gap-4">
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
                          ? 'bg-accent text-white'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                      )}
                    >
                      {category?.icon && <DynamicIcon name={category.icon} size={16} />}
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'grid' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'list' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </Stack>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {products.length === 0 ? (
            <EmptyState
              title="Scan an item to begin"
              description="Use a barcode scanner or search for products to add them to the sale"
              icon={<Scan size={48} />}
              primaryAction={{
                label: 'Focus Search',
                onClick: () => {
                  const searchInput = document.querySelector(
                    'input[type="search"]'
                  ) as HTMLInputElement;
                  searchInput?.focus();
                },
                icon: <Search size={18} />,
              }}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description={
                searchQuery
                  ? `No products match "${searchQuery}"`
                  : `No products in ${selectedCategory} category`
              }
              icon={<Search size={48} />}
              primaryAction={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                },
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-surface-2 border border-border rounded-lg p-4 text-left hover:border-accent hover:bg-surface-3 transition-colors group"
                >
                  <div className="aspect-square bg-surface-3 rounded-lg mb-3 flex items-center justify-center">
                    {/* Show category icon if available */}
                    {(() => {
                      const category = categories.find((c) => c.id === product.category);
                      return category?.icon ? (
                        <DynamicIcon
                          name={category.icon}
                          size={32}
                          className="text-text-muted group-hover:text-text-secondary"
                        />
                      ) : (
                        <DynamicIcon
                          name="Package"
                          size={32}
                          className="text-text-muted group-hover:text-text-secondary"
                        />
                      );
                    })()}
                  </div>
                  <h3 className="font-medium text-text-primary text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-text-secondary mb-2">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-accent">
                      {formatCurrency(product.unitPrice || 0)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        product.quantityOnHand > 20
                          ? 'bg-success/20 text-success'
                          : product.quantityOnHand > 5
                            ? 'bg-warning/20 text-warning'
                            : 'bg-error/20 text-error'
                      )}
                    >
                      {product.quantityOnHand} in stock
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-3 flex items-center gap-4 hover:border-accent hover:bg-surface-3 transition-colors"
                >
                  <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const category = categories.find((c) => c.id === product.category);
                      return category?.icon ? (
                        <DynamicIcon name={category.icon} size={20} className="text-text-muted" />
                      ) : (
                        <DynamicIcon name="Package" size={20} className="text-text-muted" />
                      );
                    })()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{product.name}</h3>
                    <p className="text-xs text-text-secondary">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">
                      {formatCurrency(product.unitPrice || 0)}
                    </div>
                    <div className="text-xs text-text-secondary">{product.quantityOnHand} in stock</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-[420px] flex flex-col bg-surface-2 min-h-0">
        {/* Customer selection */}
        <div className="p-4 border-b border-border-subtle">
          <button
            onClick={() => setSelectedCustomer(selectedCustomer ? null : 'Walk-in Customer')}
            className="w-full flex items-center gap-3 p-3 bg-surface-3 rounded-lg hover:bg-surface-3/80 transition-colors"
          >
            <div className="w-10 h-10 bg-surface-2 rounded-full flex items-center justify-center">
              <User className="text-text-secondary" size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-text-primary">
                {selectedCustomer || 'Select Customer'}
              </div>
              <div className="text-xs text-text-secondary">
                {selectedCustomer ? 'Tap to change' : 'Walk-in or search customer'}
              </div>
            </div>
            <ChevronRight className="text-text-secondary" size={20} />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Cart is empty</p>
              <p className="text-sm">Add products to start a sale</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-surface-3 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-primary truncate">{item.product.name}</h4>
                    <p className="text-sm text-text-secondary">
                      {formatCurrency(item.product.unitPrice || 0)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 flex items-center justify-center text-text-primary transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium text-text-primary">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 flex items-center justify-center text-text-primary transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="w-20 text-right">
                    <div className="font-bold text-text-primary">
                      {formatCurrency((item.product.unitPrice || 0) * item.quantity)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-2 text-text-secondary hover:text-error transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart actions */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border-subtle space-y-3">
            {/* Quick actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-3 rounded-lg text-text-secondary hover:bg-surface-3/80 hover:text-text-primary transition-colors">
                <Percent size={18} />
                <span className="text-sm">Discount</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-3 rounded-lg text-text-secondary hover:bg-surface-3/80 hover:text-text-primary transition-colors">
                <Tag size={18} />
                <span className="text-sm">Coupon</span>
              </button>
              <button
                onClick={clearCart}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-3 rounded-lg text-text-secondary hover:bg-error hover:text-white transition-colors"
              >
                <Trash2 size={18} />
                <span className="text-sm">Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Totals and payment */}
        <div className="p-4 bg-bg-primary border-t border-border-subtle">
          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tax (13%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-text-primary pt-2 border-t border-border-subtle">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-success hover:bg-success/90 disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-white font-medium transition-colors"
            >
              <Banknote size={24} />
              <span className="text-sm">Cash</span>
            </button>
            <button
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-accent hover:bg-accent-hover disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-white font-medium transition-colors"
            >
              <CreditCard size={24} />
              <span className="text-sm">Card</span>
            </button>
            <button
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-surface-3 hover:bg-surface-3/80 disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-text-primary font-medium transition-colors"
            >
              <Receipt size={24} />
              <span className="text-sm">Other</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

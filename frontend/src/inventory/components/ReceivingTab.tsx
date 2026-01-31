/**
 * ReceivingTab Component
 * 
 * Quick stock receiving interface for the Inventory page.
 * Allows receiving stock without going through full vendor bill process.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  Search,
  Plus,
  Minus,
  Check,
  Package,
  FileText,
  Loader2,
} from 'lucide-react';
import { useProductsQuery, Product } from '@domains/product';
import { Button } from '@common/components/atoms/Button';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { toast } from '@common/utils/toast';
import { apiClient } from '@common/api/client';

interface ReceivingItem {
  product: Product;
  quantity: number;
  cost?: number;
}

export function ReceivingTab() {
  const navigate = useNavigate();
  const { data: productsResponse, isLoading: productsLoading } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState('');

  // Filter products for search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToReceiving = (product: Product) => {
    setReceivingItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, cost: product.cost }];
    });
    setSearchQuery('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setReceivingItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateCost = (productId: string, cost: number) => {
    setReceivingItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, cost } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (receivingItems.length === 0) return;

    setIsSubmitting(true);
    try {
      // Update inventory for each item
      for (const item of receivingItems) {
        await apiClient.patch(`/api/products/${item.product.id}`, {
          quantity_on_hand: (item.product.quantityOnHand || 0) + item.quantity,
          cost: item.cost,
        });
      }

      toast.success(`Received ${receivingItems.length} item(s) successfully`);
      setReceivingItems([]);
      setReference('');
    } catch {
      toast.error('Failed to process receiving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = receivingItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Product Search */}
      <div className="flex-1 flex flex-col border-r border-border min-h-0">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products to receive..."
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border-strong rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-text-tertiary" size={32} />
            </div>
          ) : searchQuery && filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description={`No products match "${searchQuery}"`}
              icon={<Package size={48} className="opacity-50" />}
            />
          ) : searchQuery ? (
            <div className="space-y-2">
              {filteredProducts.slice(0, 20).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToReceiving(product)}
                  className="w-full bg-surface border border-border rounded-lg p-3 flex items-center gap-3 hover:border-accent hover:bg-surface-secondary transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="text-text-tertiary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">{product.name}</div>
                    <div className="text-xs text-text-tertiary">{product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-text-secondary">{product.quantityOnHand} in stock</div>
                  </div>
                  <Plus className="text-accent" size={20} />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TruckIcon size={48} className="mx-auto mb-4 text-text-tertiary opacity-50" />
              <p className="text-lg font-medium text-text-primary mb-2">Quick Receive</p>
              <p className="text-sm text-text-tertiary mb-6">
                Search for products to add to receiving
              </p>
              <Button
                variant="secondary"
                leftIcon={<FileText size={18} />}
                onClick={() => navigate('/vendor-bills/upload')}
              >
                Or Upload Vendor Bill
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Receiving List */}
      <div className="w-full lg:w-[400px] flex flex-col bg-surface min-h-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-text-primary">Receiving List</h3>
          <p className="text-sm text-text-tertiary">
            {totalItems} item{totalItems !== 1 ? 's' : ''} to receive
          </p>
        </div>

        {/* Reference field */}
        <div className="p-4 border-b border-border">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Reference / PO Number
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary placeholder-text-tertiary"
          />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {receivingItems.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivingItems.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-surface-secondary rounded-lg p-3"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-text-tertiary">{item.product.sku}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded bg-surface hover:bg-surface-elevated flex items-center justify-center text-text-primary transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-medium text-text-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded bg-surface hover:bg-surface-elevated flex items-center justify-center text-text-primary transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.cost || ''}
                        onChange={(e) => updateCost(item.product.id, parseFloat(e.target.value) || 0)}
                        placeholder="Cost"
                        className="w-full px-2 py-1 text-sm bg-surface border border-border rounded text-text-primary"
                        step={0.01}
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="primary"
            fullWidth
            leftIcon={isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            onClick={handleSubmit}
            disabled={receivingItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : `Receive ${totalItems} Item${totalItems !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

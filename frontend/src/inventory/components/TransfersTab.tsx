/**
 * TransfersTab Component
 * 
 * Stock transfer interface for moving inventory between locations.
 * Uses the stock adjustment API for actual transfers.
 */

import { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowRight,
  Search,
  Plus,
  Minus,
  Check,
  Package,
  Loader2,
} from 'lucide-react';
import { useProductsQuery, Product } from '@domains/product';
import { Button } from '@common/components/atoms/Button';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { toast } from '@common/utils/toast';
import { apiClient } from '@common/utils/apiClient';

interface TransferItem {
  product: Product;
  quantity: number;
}

interface Location {
  id: string;
  name: string;
}

// Default locations - will be replaced by API data when available
const DEFAULT_LOCATIONS: Location[] = [
  { id: 'main', name: 'Main Store' },
  { id: 'warehouse', name: 'Warehouse' },
  { id: 'backroom', name: 'Back Room' },
];

export function TransfersTab() {
  const { data: productsResponse, isLoading: productsLoading } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
  const [fromLocation, setFromLocation] = useState(DEFAULT_LOCATIONS[0].id);
  const [toLocation, setToLocation] = useState(DEFAULT_LOCATIONS[1].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  // Load locations from settings/stores API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Try to fetch stores/locations from API
        const response = await apiClient.get<{ stores?: Location[]; locations?: Location[] }>('/api/stores');
        if (response.stores && response.stores.length > 0) {
          setLocations(response.stores);
          setFromLocation(response.stores[0].id);
          if (response.stores.length > 1) {
            setToLocation(response.stores[1].id);
          }
        }
      } catch {
        // Use default locations if API not available
      }
    };
    loadLocations();
  }, []);

  // Filter products for search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToTransfer = (product: Product) => {
    setTransferItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearchQuery('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setTransferItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (transferItems.length === 0) return;
    if (fromLocation === toLocation) {
      toast.error('Source and destination must be different');
      return;
    }

    setIsSubmitting(true);
    try {
      // Process each transfer item using stock adjustment API
      const transferPromises = transferItems.map(async (item) => {
        // Decrease from source location
        await apiClient.post(`/api/products/${item.product.id}/stock/adjust`, {
          adjustment_type: 'transfer_out',
          quantity_change: -item.quantity,
          reason: `Transfer to ${locations.find(l => l.id === toLocation)?.name}`,
          notes: notes || undefined,
          store_id: fromLocation,
          location_id: fromLocation,
        });
        
        // Increase at destination location
        await apiClient.post(`/api/products/${item.product.id}/stock/adjust`, {
          adjustment_type: 'transfer_in',
          quantity_change: item.quantity,
          reason: `Transfer from ${locations.find(l => l.id === fromLocation)?.name}`,
          notes: notes || undefined,
          store_id: toLocation,
          location_id: toLocation,
        });
      });

      await Promise.all(transferPromises);

      const fromName = locations.find((l) => l.id === fromLocation)?.name;
      const toName = locations.find((l) => l.id === toLocation)?.name;
      
      toast.success(`Transferred ${transferItems.length} item(s) from ${fromName} to ${toName}`);
      setTransferItems([]);
      setNotes('');
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to process transfer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);

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
              placeholder="Search products to transfer..."
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
                  onClick={() => addToTransfer(product)}
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
              <ArrowUpDown size={48} className="mx-auto mb-4 text-text-tertiary opacity-50" />
              <p className="text-lg font-medium text-text-primary mb-2">Stock Transfers</p>
              <p className="text-sm text-text-tertiary">
                Search for products to add to transfer
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Transfer Details */}
      <div className="w-full lg:w-[400px] flex flex-col bg-surface min-h-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-text-primary">Transfer Details</h3>
          <p className="text-sm text-text-tertiary">
            {totalItems} item{totalItems !== 1 ? 's' : ''} to transfer
          </p>
        </div>

        {/* Location selectors */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-tertiary mb-1">From</label>
              <select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <ArrowRight className="text-text-tertiary mt-5" size={20} />
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-tertiary mb-1">To</label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {fromLocation === toLocation && (
            <p className="text-xs text-error-400">Source and destination must be different</p>
          )}
        </div>

        {/* Notes field */}
        <div className="p-4 border-b border-border">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional transfer notes..."
            rows={2}
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary placeholder-text-tertiary resize-none"
          />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {transferItems.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transferItems.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-surface-secondary rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-text-tertiary">{item.product.sku}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded bg-surface hover:bg-surface-elevated flex items-center justify-center text-text-primary transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-medium text-text-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded bg-surface hover:bg-surface-elevated flex items-center justify-center text-text-primary transition-colors"
                      >
                        <Plus size={16} />
                      </button>
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
            disabled={transferItems.length === 0 || isSubmitting || fromLocation === toLocation}
          >
            {isSubmitting ? 'Processing...' : `Transfer ${totalItems} Item${totalItems !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

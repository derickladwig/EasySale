import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  TruckIcon,
  AlertTriangle,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ChevronRight,
  Box,
  Barcode,
  MapPin,
  FileText,
  Printer,
  Edit,
  Trash2,
  X,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useInventoryQuery } from '../hooks/useInventoryQuery';
import { useUpdateProductMutation } from '@domains/product/hooks';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { toast } from '@common/utils/toast';
import { Button } from '@common/components/atoms/Button';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (barcode: string) => void;
}

function ScanModal({ isOpen, onClose, onScanComplete }: ScanModalProps) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScanComplete(manualBarcode.trim());
      setManualBarcode('');
      onClose();
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    // Simulate barcode scanner
    setTimeout(() => {
      const mockBarcode = `${Date.now()}`.slice(-8);
      onScanComplete(mockBarcode);
      setIsScanning(false);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-elevated rounded-lg p-6 w-full max-w-md" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Scan Item</h2>
        
        <div className="space-y-4">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Barcode size={20} />}
            onClick={simulateScan}
            disabled={isScanning}
            loading={isScanning}
          >
            {isScanning ? 'Scanning...' : 'Start Camera Scan'}
          </Button>
          
          <div className="text-center text-text-tertiary">or</div>
          
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Enter barcode manually"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary placeholder-text-tertiary"
            />
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { ReceivingTab } from '../components/ReceivingTab';
import { TransfersTab } from '../components/TransfersTab';

type TabType = 'inventory' | 'receiving' | 'transfers' | 'vendor-bills' | 'alerts';

const tabs = [
  { id: 'inventory' as TabType, label: 'Inventory', icon: Package },
  { id: 'receiving' as TabType, label: 'Receiving', icon: TruckIcon },
  { id: 'transfers' as TabType, label: 'Transfers', icon: ArrowUpDown },
  { id: 'vendor-bills' as TabType, label: 'Vendor Bills', icon: FileText },
  { id: 'alerts' as TabType, label: 'Alerts', icon: AlertTriangle, badge: 0 },
];

// Filter Modal Component
interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

interface FilterState {
  status: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  location: string;
  minStock: number | null;
  maxStock: number | null;
}

function FilterModal({ isOpen, onClose, filters, onApply }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-elevated rounded-lg p-6 w-full max-w-md" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Filter Inventory</h2>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={localFilters.status}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value as FilterState['status'] })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
            >
              <option value="all">All Statuses</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          {/* Location filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Location</label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={localFilters.location}
              onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary placeholder-text-tertiary"
            />
          </div>

          {/* Stock range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Min Stock</label>
              <input
                type="number"
                placeholder="0"
                value={localFilters.minStock ?? ''}
                onChange={(e) => setLocalFilters({ ...localFilters, minStock: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Max Stock</label>
              <input
                type="number"
                placeholder="∞"
                value={localFilters.maxStock ?? ''}
                onChange={(e) => setLocalFilters({ ...localFilters, maxStock: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              setLocalFilters({ status: 'all', location: '', minStock: null, maxStock: null });
            }}
          >
            Clear
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(localFilters);
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

// Stock Adjustment Modal
interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string; name: string; stock: number }[];
  onAdjust: (adjustments: { id: string; newStock: number; reason: string }[]) => void;
}

function StockAdjustmentModal({ isOpen, onClose, items, onAdjust }: StockAdjustmentModalProps) {
  const [adjustments, setAdjustments] = useState<Record<string, { newStock: number; reason: string }>>(
    Object.fromEntries(items.map(item => [item.id, { newStock: item.stock, reason: '' }]))
  );
  const [globalReason, setGlobalReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-elevated rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Adjust Stock</h2>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">Adjustment Reason (applies to all)</label>
          <select
            value={globalReason}
            onChange={(e) => setGlobalReason(e.target.value)}
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
          >
            <option value="">Select reason...</option>
            <option value="cycle_count">Cycle Count</option>
            <option value="damaged">Damaged/Defective</option>
            <option value="theft">Theft/Shrinkage</option>
            <option value="received">Received Stock</option>
            <option value="returned">Customer Return</option>
            <option value="correction">Correction</option>
          </select>
        </div>

        <div className="space-y-3 mb-6">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-3 bg-surface-secondary rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary truncate">{item.name}</div>
                <div className="text-sm text-text-tertiary">Current: {item.stock}</div>
              </div>
              <input
                type="number"
                min="0"
                value={adjustments[item.id]?.newStock ?? item.stock}
                onChange={(e) => setAdjustments({
                  ...adjustments,
                  [item.id]: { ...adjustments[item.id], newStock: parseInt(e.target.value) || 0 }
                })}
                className="w-24 px-3 py-2 bg-surface border border-border rounded-md text-text-primary text-center"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const adjustmentList = items.map(item => ({
                id: item.id,
                newStock: adjustments[item.id]?.newStock ?? item.stock,
                reason: globalReason || 'correction'
              }));
              onAdjust(adjustmentList);
              onClose();
            }}
          >
            Save Adjustments
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    location: '',
    minStock: null,
    maxStock: null,
  });

  // Use inventory query hook
   
  const { data: inventory, isLoading, error, refetch } = useInventoryQuery();

  const handleScanComplete = async (barcode: string) => {
    try {
      // Look up product by barcode
      const response = await fetch(`/api/products/barcode/${barcode}`);
      if (response.ok) {
        const product = await response.json();
        toast.success(`Found: ${product.name}`);
        // Navigate to receive page or update inventory
        navigate(`/inventory/receive/${product.id}`);
      } else {
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    } catch {
      toast.error('Failed to lookup product');
    }
  };

  const filteredInventory = inventory.filter((item) => {
    // Text search
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    
    // Location filter
    const matchesLocation = !filters.location || 
      item.location.toLowerCase().includes(filters.location.toLowerCase());
    
    // Stock range filter
    const matchesMinStock = filters.minStock === null || item.stock >= filters.minStock;
    const matchesMaxStock = filters.maxStock === null || item.stock <= filters.maxStock;
    
    return matchesSearch && matchesStatus && matchesLocation && matchesMinStock && matchesMaxStock;
  });

  const hasActiveFilters = filters.status !== 'all' || filters.location !== '' || 
    filters.minStock !== null || filters.maxStock !== null;

  const handlePrintLabels = () => {
    const selectedProducts = inventory.filter(item => selectedItems.includes(item.id));
    toast.success(`Printing labels for ${selectedProducts.length} items...`);
    // In production, this would trigger label printing
    setTimeout(() => {
      toast.info('Labels sent to printer');
      setSelectedItems([]);
    }, 1500);
  };

  const updateProduct = useUpdateProductMutation();
  
  const handleStockAdjustment = async (adjustments: { id: string; newStock: number; reason: string }[]) => {
    try {
      // Update each product's stock via API
      for (const adj of adjustments) {
        await updateProduct.mutateAsync({
          id: adj.id,
          updates: { quantity_on_hand: adj.newStock }
        });
      }
      toast.success(`Adjusted stock for ${adjustments.length} items`);
      setSelectedItems([]);
    } catch (error) {
      toast.error('Failed to adjust stock. Please try again.');
    }
  };

  const handleTransfer = () => {
    const selectedProductIds = selectedItems.join(',');
    navigate(`/inventory/transfer?items=${selectedProductIds}`);
  };

  const handleReorder = (item: typeof inventory[0]) => {
    toast.success(`Creating purchase order for ${item.name}...`);
    // In production, navigate to purchase order creation
    navigate('/vendor-bills/upload', { state: { reorderItem: item } });
  };

  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter((i) => i.status === 'low-stock').length,
    outOfStock: inventory.filter((i) => i.status === 'out-of-stock').length,
    pendingReceiving: 0,
  };

  // Update alerts badge
  const alertCount = stats.lowStock + stats.outOfStock;
  const tabsWithBadge = tabs.map((tab) =>
    tab.id === 'alerts' ? { ...tab, badge: alertCount } : tab
  );

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map((i) => i.id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Inventory Management</h1>
            <p className="text-text-tertiary text-sm">
              Manage stock levels, receiving, and transfers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<Barcode size={18} />}
              onClick={() => setIsScanModalOpen(true)}
            >
              <span className="hidden sm:inline">Scan</span>
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => navigate('/inventory/add')}
            >
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
              <Box size={16} />
              Total Items
            </div>
            <div className="text-2xl font-bold text-text-primary">{stats.totalItems}</div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-2 text-warning-400 text-sm mb-1">
              <AlertTriangle size={16} />
              Low Stock
            </div>
            <div className="text-2xl font-bold text-warning-400">{stats.lowStock}</div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-2 text-error-400 text-sm mb-1">
              <Package size={16} />
              Out of Stock
            </div>
            <div className="text-2xl font-bold text-error-400">{stats.outOfStock}</div>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary-400 text-sm mb-1">
              <TruckIcon size={16} />
              Pending
            </div>
            <div className="text-2xl font-bold text-primary-400">{stats.pendingReceiving}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-lg p-1 overflow-x-auto">
          {tabsWithBadge.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id ? 'bg-surface-secondary text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}
              >
                <Icon size={18} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-error-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'inventory' && (
          <>
            {/* Search and filters */}
            <div className="p-4 border-b border-border flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                  size={20}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inventory..."
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-border-strong rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <Button
                variant={hasActiveFilters ? "primary" : "secondary"}
                leftIcon={<Filter size={18} />}
                onClick={() => setIsFilterModalOpen(true)}
              >
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    Active
                  </span>
                )}
              </Button>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading inventory..." centered />
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="flex-1 flex items-center justify-center text-text-tertiary">
                <div className="text-center">
                  <AlertTriangle size={48} className="mx-auto mb-4 opacity-50 text-error-400" />
                  <p className="text-lg font-medium text-error-400">{error}</p>
                  <Button
                    variant="primary"
                    onClick={refetch}
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && filteredInventory.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  title="No inventory found"
                  description={
                    searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Start by scanning items to receive or import your inventory'
                  }
                  icon={<Package size={48} className="opacity-50" />}
                  primaryAction={{
                    label: 'Scan to receive',
                    onClick: () => setIsScanModalOpen(true),
                    icon: <Barcode size={18} />,
                  }}
                  secondaryAction={
                    !searchQuery
                      ? {
                          label: 'Add item',
                          onClick: () => navigate('/lookup'),
                          icon: <Plus size={18} />,
                        }
                      : undefined
                  }
                />
              </div>
            )}

            {/* Table */}
            {!isLoading && !error && filteredInventory.length > 0 && (
              <>
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-surface sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === filteredInventory.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-border-strong bg-surface-secondary text-primary-600 focus:ring-accent"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary hidden md:table-cell">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary hidden lg:table-cell">
                          Location
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-text-tertiary">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary hidden sm:table-cell">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-text-tertiary">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInventory.map((item) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'hover:bg-surface/50 transition-colors',
                            selectedItems.includes(item.id) && 'bg-surface'
                          )}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                              className="w-4 h-4 rounded border-border-strong bg-surface-secondary text-primary-600 focus:ring-accent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="text-text-tertiary" size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-text-primary truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-text-disabled md:hidden">{item.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-sm hidden md:table-cell">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-text-tertiary text-sm">
                              <MapPin size={14} />
                              {item.location}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-medium text-text-primary">{item.stock}</div>
                            <div className="text-xs text-text-disabled">min: {item.minStock}</div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span
                              className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                item.status === 'in-stock' && 'bg-success-500/20 text-success-400',
                                item.status === 'low-stock' && 'bg-warning-500/20 text-warning-400',
                                item.status === 'out-of-stock' && 'bg-error-500/20 text-error-400'
                              )}
                            >
                              {item.status === 'in-stock' && 'In Stock'}
                              {item.status === 'low-stock' && 'Low Stock'}
                              {item.status === 'out-of-stock' && 'Out of Stock'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative">
                              <button 
                                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                                onClick={() => setActiveRowMenu(activeRowMenu === item.id ? null : item.id)}
                              >
                                <MoreVertical size={18} />
                              </button>
                              {activeRowMenu === item.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg z-50">
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-secondary hover:text-white flex items-center gap-2"
                                    onClick={() => {
                                      setActiveRowMenu(null);
                                      navigate(`/lookup/${item.id}`);
                                    }}
                                  >
                                    <Edit size={16} />
                                    Edit Product
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-secondary hover:text-white flex items-center gap-2"
                                    onClick={() => {
                                      setActiveRowMenu(null);
                                      setSelectedItems([item.id]);
                                      setIsAdjustModalOpen(true);
                                    }}
                                  >
                                    <ArrowUpDown size={16} />
                                    Adjust Stock
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-secondary hover:text-white flex items-center gap-2"
                                    onClick={() => {
                                      setActiveRowMenu(null);
                                      navigate(`/inventory/transfer?items=${item.id}`);
                                    }}
                                  >
                                    <TruckIcon size={16} />
                                    Transfer
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-secondary hover:text-white flex items-center gap-2"
                                    onClick={() => {
                                      setActiveRowMenu(null);
                                      toast.success(`Printing label for ${item.name}`);
                                    }}
                                  >
                                    <Printer size={16} />
                                    Print Label
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-secondary hover:text-white flex items-center gap-2"
                                    onClick={() => {
                                      setActiveRowMenu(null);
                                      handleReorder(item);
                                    }}
                                  >
                                    <ShoppingCart size={16} />
                                    Reorder
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bulk actions */}
                {selectedItems.length > 0 && (
                  <div className="p-4 border-t border-border bg-surface flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      {selectedItems.length} item(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        leftIcon={<Printer size={16} />}
                        onClick={handlePrintLabels}
                      >
                        Print Labels
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        leftIcon={<ArrowUpDown size={16} />}
                        onClick={() => setIsAdjustModalOpen(true)}
                      >
                        Adjust Stock
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        leftIcon={<TruckIcon size={16} />}
                        onClick={handleTransfer}
                      >
                        Transfer
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'receiving' && <ReceivingTab />}

        {activeTab === 'transfers' && <TransfersTab />}

        {activeTab === 'vendor-bills' && (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Vendor Bills</p>
              <p className="text-sm mb-6">Upload and process vendor invoices with OCR</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => navigate('/vendor-bills/upload')}
                >
                  Upload Bill
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<FileText size={18} />}
                  onClick={() => navigate('/vendor-bills')}
                >
                  View History
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="flex-1 overflow-auto p-4">
            {!isLoading &&
              !error &&
              inventory.filter((i) => i.status !== 'in-stock').length === 0 && (
                <div className="flex items-center justify-center h-full text-text-tertiary">
                  <div className="text-center">
                    <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No alerts</p>
                    <p className="text-sm">All inventory levels are healthy</p>
                  </div>
                </div>
              )}
            <div className="space-y-3">
              {inventory
                .filter((i) => i.status !== 'in-stock')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface border border-border rounded-lg p-4 flex items-center gap-4"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        item.status === 'low-stock' && 'bg-warning-500/20',
                        item.status === 'out-of-stock' && 'bg-error-500/20'
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          item.status === 'low-stock' && 'text-warning-400',
                          item.status === 'out-of-stock' && 'text-error-400'
                        )}
                        size={20}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary">{item.name}</div>
                      <div className="text-sm text-text-tertiary">
                        {item.status === 'low-stock'
                          ? `Low stock: ${item.stock} remaining (min: ${item.minStock})`
                          : 'Out of stock - reorder required'}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ChevronRight size={16} />}
                      onClick={() => handleReorder(item)}
                    >
                      Reorder
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        <ScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onScanComplete={handleScanComplete}
        />

        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApply={setFilters}
        />

        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedItems([]);
          }}
          items={inventory.filter(item => selectedItems.includes(item.id))}
          onAdjust={handleStockAdjustment}
        />
      </div>
    </div>
  );
}

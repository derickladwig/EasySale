/**
 * Bin Location Manager Component
 *
 * Component for managing warehouse bin locations:
 * - View and manage zones
 * - CRUD for bin locations
 * - Assign products to bins
 * - View products in bins
 *
 * Ported from POS project's bin location feature.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Package,
  RefreshCw,
  Search,
  ChevronRight,
  Layers,
  Grid3X3,
  Archive,
} from 'lucide-react';

// Types
interface BinLocation {
  id: string;
  store_id: string;
  code: string;
  name?: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  description?: string;
  bin_type: string;
  max_capacity?: number;
  current_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

interface Zone {
  id: string;
  store_id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  zone_type: string;
  sort_order: number;
  active: boolean;
  bin_count?: number;
}

interface ProductInBin {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_on_hand: number;
  bin_location: string;
}

// API functions
const binApi = {
  listBins: async (): Promise<BinLocation[]> => {
    const response = await fetch('/api/inventory/bins', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch bins');
    return response.json();
  },

  getBin: async (id: string): Promise<BinLocation> => {
    const response = await fetch(`/api/inventory/bins/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch bin');
    return response.json();
  },

  createBin: async (data: {
    store_id: string;
    code: string;
    name?: string;
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
    description?: string;
    bin_type?: string;
    max_capacity?: number;
  }) => {
    const response = await fetch('/api/inventory/bins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create bin');
    return response.json();
  },

  updateBin: async (id: string, data: Partial<BinLocation>) => {
    const response = await fetch(`/api/inventory/bins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update bin');
    return response.json();
  },

  deleteBin: async (id: string) => {
    const response = await fetch(`/api/inventory/bins/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete bin');
    return response.json();
  },

  getProductsInBin: async (code: string): Promise<ProductInBin[]> => {
    const response = await fetch(`/api/inventory/bins/${encodeURIComponent(code)}/products`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  listZones: async (): Promise<Zone[]> => {
    const response = await fetch('/api/inventory/bins/zones', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch zones');
    return response.json();
  },

  createZone: async (data: {
    store_id: string;
    code: string;
    name: string;
    description?: string;
    color?: string;
    zone_type?: string;
    sort_order?: number;
  }) => {
    const response = await fetch('/api/inventory/bins/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create zone');
    return response.json();
  },

  assignProductToBin: async (data: { product_id: string; bin_location: string; reason?: string }) => {
    const response = await fetch('/api/inventory/bins/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to assign product');
    return response.json();
  },
};

// Bin type badge
const BinTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    standard: 'bg-surface-secondary text-text-primary dark:bg-surface-tertiary dark:text-text-tertiary',
    bulk: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300',
    small_parts: 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-300',
    hazmat: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-300',
    cold: 'bg-info-100 text-info-800 dark:bg-info-900 dark:text-info-300',
    secure: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-300',
  };

  const labels: Record<string, string> = {
    standard: 'Standard',
    bulk: 'Bulk',
    small_parts: 'Small Parts',
    hazmat: 'Hazmat',
    cold: 'Cold Storage',
    secure: 'Secure',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || colors.standard}`}>
      {labels[type] || type}
    </span>
  );
};

// Main component
export const BinLocationManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'bins' | 'zones'>('bins');
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [createBinModal, setCreateBinModal] = useState(false);
  const [createZoneModal, setCreateZoneModal] = useState(false);
  const [newBin, setNewBin] = useState({
    store_id: 'default',
    code: '',
    name: '',
    zone: '',
    aisle: '',
    shelf: '',
    bin: '',
    description: '',
    bin_type: 'standard',
    max_capacity: 0,
  });
  const [newZone, setNewZone] = useState({
    store_id: 'default',
    code: '',
    name: '',
    description: '',
    color: 'var(--color-primary-500)',
    zone_type: 'storage',
    sort_order: 0,
  });

  // Queries
  const { data: bins, isLoading: binsLoading, refetch: refetchBins } = useQuery({
    queryKey: ['bin-locations'],
    queryFn: binApi.listBins,
  });

  const { data: zones, isLoading: zonesLoading, refetch: refetchZones } = useQuery({
    queryKey: ['bin-zones'],
    queryFn: binApi.listZones,
  });

  const { data: productsInBin, isLoading: productsLoading } = useQuery({
    queryKey: ['products-in-bin', selectedBin],
    queryFn: () => binApi.getProductsInBin(selectedBin!),
    enabled: !!selectedBin,
  });

  // Mutations
  const createBinMutation = useMutation({
    mutationFn: binApi.createBin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
      setCreateBinModal(false);
      setNewBin({
        store_id: 'default',
        code: '',
        name: '',
        zone: '',
        aisle: '',
        shelf: '',
        bin: '',
        description: '',
        bin_type: 'standard',
        max_capacity: 0,
      });
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: binApi.createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-zones'] });
      setCreateZoneModal(false);
      setNewZone({
        store_id: 'default',
        code: '',
        name: '',
        description: '',
        color: 'var(--color-primary-500)',
        zone_type: 'storage',
        sort_order: 0,
      });
    },
  });

  const deleteBinMutation = useMutation({
    mutationFn: binApi.deleteBin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
      setSelectedBin(null);
    },
  });

  // Filter bins
  const filteredBins = bins?.filter((bin) => {
    const matchesSearch =
      !searchTerm ||
      bin.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bin.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = !zoneFilter || bin.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  // Group bins by zone
  const binsByZone = filteredBins?.reduce((acc, bin) => {
    const zone = bin.zone || 'Unassigned';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(bin);
    return acc;
  }, {} as Record<string, BinLocation[]>);

  // Auto-generate bin code
  const generateBinCode = () => {
    const { zone, aisle, shelf, bin } = newBin;
    const parts = [zone, aisle, shelf, bin].filter(Boolean);
    return parts.join('-');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-brand-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Bin Locations</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('bins')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'bins'
                ? 'bg-brand-primary text-white'
                : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <Grid3X3 className="w-4 h-4 inline mr-2" />
            Bins
          </button>
          <button
            onClick={() => setView('zones')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'zones'
                ? 'bg-brand-primary text-white'
                : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Zones
          </button>
        </div>
      </div>

      {/* Bins View */}
      {view === 'bins' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search bins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
              />
            </div>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
            >
              <option value="">All Zones</option>
              {zones?.map((zone) => (
                <option key={zone.id} value={zone.code}>
                  {zone.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetchBins()}
              className="p-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCreateBinModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Bin
            </button>
          </div>

          {/* Bins Grid */}
          {binsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : filteredBins?.length === 0 ? (
            <div className="text-center py-12 bg-surface-primary rounded-lg border border-border-primary">
              <Archive className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
              <p className="text-text-secondary">No bin locations found</p>
              <button
                onClick={() => setCreateBinModal(true)}
                className="mt-4 text-brand-primary hover:underline"
              >
                Create your first bin location
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(binsByZone || {}).map(([zoneName, zoneBins]) => (
                <div key={zoneName} className="bg-surface-primary rounded-lg border border-border-primary">
                  <div className="p-4 border-b border-border-primary flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Layers className="w-5 h-5 text-brand-primary" />
                      {zoneName}
                    </h3>
                    <span className="text-sm text-text-secondary">{zoneBins.length} bins</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                    {zoneBins.map((bin) => (
                      <div
                        key={bin.id}
                        onClick={() => setSelectedBin(bin.code)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedBin === bin.code
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-border-secondary hover:border-border-primary'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-mono font-semibold text-text-primary">{bin.code}</div>
                          <BinTypeBadge type={bin.bin_type} />
                        </div>
                        {bin.name && <div className="text-sm text-text-secondary mb-2">{bin.name}</div>}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">
                            <Package className="w-4 h-4 inline mr-1" />
                            {bin.product_count || 0} products
                          </span>
                          {bin.max_capacity && (
                            <span className="text-text-tertiary">
                              {bin.current_count}/{bin.max_capacity}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Bin Details */}
          {selectedBin && (
            <div className="bg-surface-primary rounded-lg border border-border-primary">
              <div className="p-4 border-b border-border-primary flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">Products in {selectedBin}</h3>
                <button
                  onClick={() => setSelectedBin(null)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Close
                </button>
              </div>
              {productsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
                </div>
              ) : productsInBin?.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No products in this bin</p>
                </div>
              ) : (
                <div className="divide-y divide-border-secondary">
                  {productsInBin?.map((product) => (
                    <div key={product.product_id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">{product.product_name}</div>
                        <div className="text-sm text-text-secondary">{product.product_sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-text-primary">{product.quantity_on_hand}</div>
                        <div className="text-sm text-text-secondary">units</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Zones View */}
      {view === 'zones' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => refetchZones()}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setCreateZoneModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Zone
            </button>
          </div>

          {/* Zones List */}
          {zonesLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : zones?.length === 0 ? (
            <div className="text-center py-12 bg-surface-primary rounded-lg border border-border-primary">
              <Layers className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
              <p className="text-text-secondary">No zones configured</p>
              <button
                onClick={() => setCreateZoneModal(true)}
                className="mt-4 text-brand-primary hover:underline"
              >
                Create your first zone
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones?.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-surface-primary rounded-lg border border-border-primary p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: zone.color || 'var(--color-primary-500)' }}
                      />
                      <div>
                        <div className="font-semibold text-text-primary">{zone.name}</div>
                        <div className="text-sm text-text-secondary font-mono">{zone.code}</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-surface-secondary text-text-secondary">
                      {zone.zone_type}
                    </span>
                  </div>
                  {zone.description && (
                    <p className="text-sm text-text-secondary mb-3">{zone.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      <Grid3X3 className="w-4 h-4 inline mr-1" />
                      {zone.bin_count || 0} bins
                    </span>
                    <span className={zone.active ? 'text-success-500' : 'text-error-500'}>
                      {zone.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Bin Modal */}
      {createBinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-primary rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create Bin Location</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Zone</label>
                  <input
                    type="text"
                    value={newBin.zone}
                    onChange={(e) => setNewBin({ ...newBin, zone: e.target.value.toUpperCase() })}
                    placeholder="A"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Aisle</label>
                  <input
                    type="text"
                    value={newBin.aisle}
                    onChange={(e) => setNewBin({ ...newBin, aisle: e.target.value })}
                    placeholder="01"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Shelf</label>
                  <input
                    type="text"
                    value={newBin.shelf}
                    onChange={(e) => setNewBin({ ...newBin, shelf: e.target.value })}
                    placeholder="02"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Bin</label>
                  <input
                    type="text"
                    value={newBin.bin}
                    onChange={(e) => setNewBin({ ...newBin, bin: e.target.value.toUpperCase() })}
                    placeholder="A"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Generated Code
                </label>
                <input
                  type="text"
                  value={newBin.code || generateBinCode()}
                  onChange={(e) => setNewBin({ ...newBin, code: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={newBin.name}
                  onChange={(e) => setNewBin({ ...newBin, name: e.target.value })}
                  placeholder="Optional friendly name"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Bin Type</label>
                <select
                  value={newBin.bin_type}
                  onChange={(e) => setNewBin({ ...newBin, bin_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                >
                  <option value="standard">Standard</option>
                  <option value="bulk">Bulk Storage</option>
                  <option value="small_parts">Small Parts</option>
                  <option value="hazmat">Hazmat</option>
                  <option value="cold">Cold Storage</option>
                  <option value="secure">Secure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Max Capacity (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newBin.max_capacity || ''}
                  onChange={(e) => setNewBin({ ...newBin, max_capacity: parseInt(e.target.value) || 0 })}
                  placeholder="0 = unlimited"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  value={newBin.description}
                  onChange={(e) => setNewBin({ ...newBin, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCreateBinModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createBinMutation.mutate({
                    ...newBin,
                    code: newBin.code || generateBinCode(),
                  })
                }
                disabled={!newBin.code && !generateBinCode() || createBinMutation.isPending}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Create Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Zone Modal */}
      {createZoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-primary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create Zone</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Code</label>
                <input
                  type="text"
                  value={newZone.code}
                  onChange={(e) => setNewZone({ ...newZone, code: e.target.value.toUpperCase() })}
                  placeholder="A"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  placeholder="Zone A"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
                <select
                  value={newZone.zone_type}
                  onChange={(e) => setNewZone({ ...newZone, zone_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                >
                  <option value="storage">Storage</option>
                  <option value="receiving">Receiving</option>
                  <option value="shipping">Shipping</option>
                  <option value="staging">Staging</option>
                  <option value="returns">Returns</option>
                  <option value="quarantine">Quarantine</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
                <input
                  type="color"
                  value={newZone.color}
                  onChange={(e) => setNewZone({ ...newZone, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  value={newZone.description}
                  onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCreateZoneModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createZoneMutation.mutate(newZone)}
                disabled={!newZone.code || !newZone.name || createZoneMutation.isPending}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Create Zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinLocationManager;

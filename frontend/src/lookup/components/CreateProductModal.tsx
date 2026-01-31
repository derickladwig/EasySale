import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateProductMutation } from '@domains/product/hooks';
import { useConfig } from '../../config';
import { toast } from '@common/components/molecules/Toast';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProductModal({ isOpen, onClose }: CreateProductModalProps) {
  const { categories } = useConfig();
  const createMutation = useCreateProductMutation();

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: categories[0]?.id || '',
    unitPrice: '',
    cost: '',
    quantityOnHand: '',
    reorderPoint: '',
    barcode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sku || !formData.name || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        cost: parseFloat(formData.cost) || 0,
        quantityOnHand: parseInt(formData.quantityOnHand) || 0,
        reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : undefined,
        barcode: formData.barcode || undefined,
        // Store ID is determined by the backend based on user's session/tenant
      });

      toast.success('Product created successfully');
      onClose();
      
      // Reset form
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: categories[0]?.id || '',
        unitPrice: '',
        cost: '',
        quantityOnHand: '',
        reorderPoint: '',
        barcode: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-white">Create New Product</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              SKU <span className="text-error-400">*</span>
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter SKU"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Product Name <span className="text-error-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Category <span className="text-error-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Unit Price <span className="text-error-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Cost <span className="text-error-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Quantity and Reorder Point */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Quantity on Hand
              </label>
              <input
                type="number"
                value={formData.quantityOnHand}
                onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Reorder Point
              </label>
              <input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Barcode
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter barcode"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {createMutation.isPending ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateProductMutation } from '@domains/product/hooks';
import { Product } from '@domains/product/types';
import { useConfig } from '../../config';
import { toast } from '@common/components/molecules/Toast';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export function EditProductModal({ isOpen, onClose, product }: EditProductModalProps) {
  const { categories } = useConfig();
  const updateMutation = useUpdateProductMutation();

  const [formData, setFormData] = useState({
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    category: product.category,
    unitPrice: product.unitPrice.toString(),
    cost: product.cost.toString(),
    quantityOnHand: product.quantityOnHand.toString(),
    reorderPoint: product.reorderPoint?.toString() || '',
    barcode: product.barcode || '',
  });

  // Update form when product changes
  useEffect(() => {
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      unitPrice: product.unitPrice.toString(),
      cost: product.cost.toString(),
      quantityOnHand: product.quantityOnHand.toString(),
      reorderPoint: product.reorderPoint?.toString() || '',
      barcode: product.barcode || '',
    });
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sku || !formData.name || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: product.id,
        updates: {
          sku: formData.sku,
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category,
          unitPrice: parseFloat(formData.unitPrice),
          cost: parseFloat(formData.cost),
          quantityOnHand: parseInt(formData.quantityOnHand),
          reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : undefined,
          barcode: formData.barcode || undefined,
        },
      });

      toast.success('Product updated successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-base rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-white">Edit Product</h2>
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
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
            disabled={updateMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {updateMutation.isPending ? 'Updating...' : 'Update Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

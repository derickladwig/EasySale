import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { productApi } from '../../../domains/product/api';
import type { Product, ProductVariant } from '../../../domains/product/types';

interface VariantManagerProps {
  parentProduct: Product;
  onClose: () => void;
  onUpdate: () => void;
}

interface VariantFormData {
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
  variantAttributes: Record<string, any>;
}

export const VariantManager: React.FC<VariantManagerProps> = ({
  parentProduct,
  onClose,
  onUpdate,
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    quantity: 0,
    variantAttributes: {},
  });

  useEffect(() => {
    loadVariants();
  }, [parentProduct.id]);

  const loadVariants = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch variants for this parent product
      const variantProducts = await productApi.getVariants(parentProduct.id);
      setVariants(variantProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setFormData({
      name: `${parentProduct.name} - `,
      sku: `${parentProduct.sku}-`,
      price: parentProduct.unitPrice,
      cost: parentProduct.cost,
      quantity: 0,
      variantAttributes: {},
    });
    setShowForm(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.variantProduct.name,
      sku: variant.variantProduct.sku,
      price: variant.variantProduct.unitPrice,
      cost: variant.variantProduct.cost,
      quantity: variant.variantProduct.quantityOnHand,
      variantAttributes: variant.variantAttributes || {},
    });
    setShowForm(true);
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) {
      return;
    }

    try {
      await productApi.deleteProduct(variantId);
      await loadVariants();
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variant');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const variantData = {
        name: formData.name,
        sku: formData.sku,
        unitPrice: formData.price,
        cost: formData.cost,
        quantityOnHand: formData.quantity,
        parent_id: parentProduct.id,
        category: parentProduct.category,
        description: parentProduct.description,
        storeId: parentProduct.storeId,
        // Inherit common attributes from parent
        attributes: {
          ...parentProduct.attributes,
          ...formData.variantAttributes,
        },
        variantAttributes: formData.variantAttributes,
      };

      if (editingVariant) {
        await productApi.updateProduct(editingVariant.variantProduct.id, variantData);
      } else {
        await productApi.createProduct(variantData);
      }

      setShowForm(false);
      await loadVariants();
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save variant');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-tertiary">Loading variants...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Product Variants</h3>
            <p className="text-sm text-text-tertiary">{parentProduct.name}</p>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400">
            {error}
          </div>
        )}

        {!showForm && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-tertiary">
                {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
              </p>
              <button
                onClick={handleCreateVariant}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-tertiary mb-4">No variants yet</p>
                <button
                  onClick={handleCreateVariant}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover"
                >
                  Create First Variant
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="p-4 bg-surface-elevated rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-text-primary font-medium mb-1">
                          {variant.variantProduct.name}
                        </h4>
                        <p className="text-sm text-text-tertiary mb-2">
                          SKU: {variant.variantProduct.sku}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-text-secondary">
                            Price: ${variant.variantProduct.unitPrice.toFixed(2)}
                          </span>
                          <span className="text-text-secondary">
                            Cost: ${variant.variantProduct.cost.toFixed(2)}
                          </span>
                          <span className="text-text-secondary">
                            Qty: {variant.variantProduct.quantityOnHand}
                          </span>
                        </div>
                        {variant.variantAttributes &&
                          Object.keys(variant.variantAttributes).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(variant.variantAttributes).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="px-2 py-1 bg-surface-secondary rounded text-xs text-text-secondary"
                                >
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditVariant(variant)}
                          className="p-2 text-info hover:text-info-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(variant.variantProduct.id)}
                          className="p-2 text-error-400 hover:text-error-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-text-primary font-medium mb-4">
              {editingVariant ? 'Edit Variant' : 'Create Variant'}
            </h4>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Cost *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Quantity *</label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent-hover"
              >
                {editingVariant ? 'Update Variant' : 'Create Variant'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-surface-secondary text-text-primary rounded hover:bg-surface-elevated"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

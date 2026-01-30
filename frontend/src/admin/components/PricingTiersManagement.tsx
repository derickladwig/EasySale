import React, { useState } from 'react';

interface PricingTier {
  id: number;
  name: string;
  description: string;
  discount_percentage: number;
  is_active: boolean;
  customer_count?: number;
}

interface PricingTiersManagementProps {
  storeId?: number;
}

export const PricingTiersManagement: React.FC<PricingTiersManagementProps> = () => {
  const [tiers, setTiers] = useState<PricingTier[]>([
    {
      id: 1,
      name: 'Retail',
      description: 'Standard retail pricing',
      discount_percentage: 0,
      is_active: true,
      customer_count: 150,
    },
    {
      id: 2,
      name: 'Wholesale',
      description: 'Wholesale customers',
      discount_percentage: 15,
      is_active: true,
      customer_count: 25,
    },
    {
      id: 3,
      name: 'VIP',
      description: 'VIP customers',
      discount_percentage: 20,
      is_active: true,
      customer_count: 10,
    },
  ]);
  const [isAddingTier, setIsAddingTier] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [formData, setFormData] = useState<Partial<PricingTier>>({
    name: '',
    description: '',
    discount_percentage: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Tier name is required';
    }

    // Check for duplicate name
    const isDuplicate = tiers.some(
      (t) => t.name.toLowerCase() === formData.name?.toLowerCase() && t.id !== editingTier?.id
    );
    if (isDuplicate) {
      newErrors.name = 'This tier name is already in use';
    }

    if (formData.discount_percentage === undefined || formData.discount_percentage === null) {
      newErrors.discount_percentage = 'Discount percentage is required';
    } else if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      newErrors.discount_percentage = 'Discount must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingTier) {
      // Update existing tier
      setTiers(
        tiers.map((t) => (t.id === editingTier.id ? ({ ...t, ...formData } as PricingTier) : t))
      );
      setEditingTier(null);
    } else {
      // Add new tier
      const newTier: PricingTier = {
        id: Math.max(...tiers.map((t) => t.id), 0) + 1,
        name: formData.name!,
        description: formData.description || '',
        discount_percentage: formData.discount_percentage!,
        is_active: formData.is_active ?? true,
        customer_count: 0,
      };
      setTiers([...tiers, newTier]);
    }

    setIsAddingTier(false);
    setFormData({ name: '', description: '', discount_percentage: 0, is_active: true });
    setErrors({});
  };

  const handleEdit = (tier: PricingTier) => {
    setEditingTier(tier);
    setFormData(tier);
    setIsAddingTier(true);
  };

  const handleDelete = (tierId: number) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier && tier.customer_count && tier.customer_count > 0) {
      alert(
        `Cannot delete tier "${tier.name}" because it has ${tier.customer_count} customers assigned.`
      );
      return;
    }

    if (confirm('Are you sure you want to delete this pricing tier?')) {
      setTiers(tiers.filter((t) => t.id !== tierId));
    }
  };

  const handleCancel = () => {
    setIsAddingTier(false);
    setEditingTier(null);
    setFormData({ name: '', description: '', discount_percentage: 0, is_active: true });
    setErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Pricing Tiers</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Manage customer pricing tiers and discount levels
          </p>
        </div>
        {!isAddingTier && (
          <button
            onClick={() => setIsAddingTier(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add Tier
          </button>
        )}
      </div>

      {isAddingTier && (
        <div className="bg-surface-base border border-border rounded-lg p-6">
          <h4 className="text-md font-medium text-text-primary mb-4">
            {editingTier ? 'Edit Pricing Tier' : 'Add New Pricing Tier'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tier Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => validateForm()}
                className={`w-full px-3 py-2 bg-surface-elevated border rounded-md text-text-primary placeholder-text-tertiary ${
                  errors.name ? 'border-error-500' : 'border-border'
                }`}
                placeholder="e.g., Wholesale"
              />
              {errors.name && <p className="mt-1 text-sm text-error-400">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-tertiary"
                placeholder="e.g., For wholesale customers with bulk orders"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Discount Percentage *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percentage ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })
                  }
                  onBlur={() => validateForm()}
                  className={`w-full px-3 py-2 bg-surface-elevated border rounded-md pr-8 text-text-primary ${
                    errors.discount_percentage ? 'border-error-500' : 'border-border'
                  }`}
                  placeholder="0"
                />
                <span className="absolute right-3 top-2 text-text-tertiary">%</span>
              </div>
              {errors.discount_percentage && (
                <p className="mt-1 text-sm text-error-400">{errors.discount_percentage}</p>
              )}
              <p className="mt-1 text-xs text-text-tertiary">Discount applied to base prices (0-100%)</p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-border rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-text-secondary">
                Active
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-border rounded-md text-text-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {editingTier ? 'Update Tier' : 'Add Tier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface-base border border-border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-elevated">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Tier Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Customers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-base divide-y divide-border">
            {tiers.map((tier) => (
              <tr key={tier.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                  {tier.name}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{tier.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {tier.discount_percentage}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {tier.customer_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tier.is_active ? 'bg-success-500/20 text-success-400' : 'bg-surface-elevated text-text-tertiary'
                    }`}
                  >
                    {tier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(tier)}
                    className="text-primary-400 hover:text-primary-300 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tier.id)}
                    className="text-error-400 hover:text-error-300"
                    disabled={Boolean(tier.customer_count && tier.customer_count > 0)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

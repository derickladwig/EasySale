import React, { useState } from 'react';

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  category: 'weight' | 'volume' | 'length' | 'quantity';
  base_unit_id?: number;
  conversion_factor?: number;
  is_active: boolean;
}

interface UnitsManagementProps {
  storeId?: number;
}

export const UnitsManagement: React.FC<UnitsManagementProps> = () => {
  const [units, setUnits] = useState<Unit[]>([
    { id: 1, name: 'Each', abbreviation: 'ea', category: 'quantity', is_active: true },
    { id: 2, name: 'Kilogram', abbreviation: 'kg', category: 'weight', is_active: true },
    {
      id: 3,
      name: 'Gram',
      abbreviation: 'g',
      category: 'weight',
      base_unit_id: 2,
      conversion_factor: 0.001,
      is_active: true,
    },
    { id: 4, name: 'Liter', abbreviation: 'L', category: 'volume', is_active: true },
    {
      id: 5,
      name: 'Milliliter',
      abbreviation: 'mL',
      category: 'volume',
      base_unit_id: 4,
      conversion_factor: 0.001,
      is_active: true,
    },
  ]);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<Partial<Unit>>({
    name: '',
    abbreviation: '',
    category: 'quantity',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Unit name is required';
    }

    if (!formData.abbreviation?.trim()) {
      newErrors.abbreviation = 'Abbreviation is required';
    } else if (formData.abbreviation.length > 10) {
      newErrors.abbreviation = 'Abbreviation must be 10 characters or less';
    }

    // Check for duplicate abbreviation
    const isDuplicate = units.some(
      (u) =>
        u.abbreviation.toLowerCase() === formData.abbreviation?.toLowerCase() &&
        u.id !== editingUnit?.id
    );
    if (isDuplicate) {
      newErrors.abbreviation = 'This abbreviation is already in use';
    }

    if (formData.base_unit_id && !formData.conversion_factor) {
      newErrors.conversion_factor = 'Conversion factor is required when base unit is specified';
    }

    if (formData.conversion_factor && formData.conversion_factor <= 0) {
      newErrors.conversion_factor = 'Conversion factor must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingUnit) {
      // Update existing unit
      setUnits(units.map((u) => (u.id === editingUnit.id ? ({ ...u, ...formData } as Unit) : u)));
      setEditingUnit(null);
    } else {
      // Add new unit
      const newUnit: Unit = {
        id: Math.max(...units.map((u) => u.id), 0) + 1,
        name: formData.name!,
        abbreviation: formData.abbreviation!,
        category: formData.category!,
        base_unit_id: formData.base_unit_id,
        conversion_factor: formData.conversion_factor,
        is_active: formData.is_active ?? true,
      };
      setUnits([...units, newUnit]);
    }

    setIsAddingUnit(false);
    setFormData({ name: '', abbreviation: '', category: 'quantity', is_active: true });
    setErrors({});
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData(unit);
    setIsAddingUnit(true);
  };

  const handleDelete = (unitId: number) => {
    if (confirm('Are you sure you want to delete this unit? This action cannot be undone.')) {
      setUnits(units.filter((u) => u.id !== unitId));
    }
  };

  const handleCancel = () => {
    setIsAddingUnit(false);
    setEditingUnit(null);
    setFormData({ name: '', abbreviation: '', category: 'quantity', is_active: true });
    setErrors({});
  };

  const baseUnits = units.filter((u) => !u.base_unit_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Units of Measure</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Manage units used for product quantities and measurements
          </p>
        </div>
        {!isAddingUnit && (
          <button
            onClick={() => setIsAddingUnit(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add Unit
          </button>
        )}
      </div>

      {isAddingUnit && (
        <div className="bg-surface-base border border-border rounded-lg p-6">
          <h4 className="text-md font-medium text-text-primary mb-4">
            {editingUnit ? 'Edit Unit' : 'Add New Unit'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Unit Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={() => validateForm()}
                  className={`w-full px-3 py-2 bg-surface-elevated border rounded-md text-text-primary placeholder-text-tertiary ${
                    errors.name ? 'border-error-500' : 'border-border'
                  }`}
                  placeholder="e.g., Kilogram"
                />
                {errors.name && <p className="mt-1 text-sm text-error-400">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Abbreviation *
                </label>
                <input
                  type="text"
                  value={formData.abbreviation || ''}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  onBlur={() => validateForm()}
                  className={`w-full px-3 py-2 bg-surface-elevated border rounded-md text-text-primary placeholder-text-tertiary ${
                    errors.abbreviation ? 'border-error-500' : 'border-border'
                  }`}
                  placeholder="e.g., kg"
                  maxLength={10}
                />
                {errors.abbreviation && (
                  <p className="mt-1 text-sm text-error-400">{errors.abbreviation}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Category *</label>
                <select
                  value={formData.category || 'quantity'}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as Unit['category'] })
                  }
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-text-primary"
                >
                  <option value="quantity">Quantity</option>
                  <option value="weight">Weight</option>
                  <option value="volume">Volume</option>
                  <option value="length">Length</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Base Unit (Optional)
                </label>
                <select
                  value={formData.base_unit_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      base_unit_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-text-primary"
                >
                  <option value="">None (Base Unit)</option>
                  {baseUnits
                    .filter((u) => u.category === formData.category && u.id !== editingUnit?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {formData.base_unit_id && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Conversion Factor *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.conversion_factor || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, conversion_factor: parseFloat(e.target.value) })
                  }
                  onBlur={() => validateForm()}
                  className={`w-full px-3 py-2 bg-surface-elevated border rounded-md text-text-primary placeholder-text-tertiary ${
                    errors.conversion_factor ? 'border-error-500' : 'border-border'
                  }`}
                  placeholder="e.g., 0.001 (1 gram = 0.001 kg)"
                />
                {errors.conversion_factor && (
                  <p className="mt-1 text-sm text-error-400">{errors.conversion_factor}</p>
                )}
                <p className="mt-1 text-xs text-text-tertiary">
                  How many base units equal 1 of this unit
                </p>
              </div>
            )}

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
                {editingUnit ? 'Update Unit' : 'Add Unit'}
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
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Abbreviation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Conversion
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
            {units.map((unit) => {
              const baseUnit = unit.base_unit_id
                ? units.find((u) => u.id === unit.base_unit_id)
                : null;
              return (
                <tr key={unit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                    {unit.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {unit.abbreviation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">
                    {unit.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {baseUnit ? (
                      <span>
                        1 {unit.abbreviation} = {unit.conversion_factor} {baseUnit.abbreviation}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">Base unit</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        unit.is_active ? 'bg-success-500/20 text-success-400' : 'bg-surface-elevated text-text-tertiary'
                      }`}
                    >
                      {unit.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="text-primary-400 hover:text-primary-300 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="text-error-400 hover:text-error-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

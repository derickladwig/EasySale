import React, { useState, useEffect } from 'react';
import {
  Product,
  CategoryConfig,
  AttributeConfig,
  CreateProductRequest,
  UpdateProductRequest,
} from '../types';
import { productApi } from '../api';

interface ProductFormProps {
  product?: Product;
  category?: string;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  category: initialCategory,
  onSave,
  onCancel,
}) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || product?.category || ''
  );
  const [formData, setFormData] = useState<any>({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || initialCategory || '',
    subcategory: product?.subcategory || '',
    unitPrice: product?.unitPrice || 0,
    cost: product?.cost || 0,
    quantityOnHand: product?.quantityOnHand || 0,
    reorderPoint: product?.reorderPoint || 0,
    barcode: product?.barcode || '',
    barcodeType: product?.barcodeType || 'CODE128',
    storeId: product?.storeId || 'default',
    attributes: product?.attributes || {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await productApi.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const selectedCategoryConfig = categories.find((c) => c.id === selectedCategory);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAttributeChange = (attrName: string, value: string | number | boolean | string[]) => {
    setFormData((prev: any) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrName]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.sku) newErrors.sku = 'SKU is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.unitPrice < 0) newErrors.unitPrice = 'Price must be non-negative';
    if (formData.cost < 0) newErrors.cost = 'Cost must be non-negative';

    // Validate category-specific attributes
    if (selectedCategoryConfig) {
      for (const attr of selectedCategoryConfig.attributes) {
        const value = formData.attributes[attr.name];

        // Required validation
        if (attr.required && (value === undefined || value === null || value === '')) {
          newErrors[`attr_${attr.name}`] = `${attr.label || attr.name} is required`;
        }

        // Type validation
        if (value !== undefined && value !== null && value !== '') {
          if (attr.type === 'number') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              newErrors[`attr_${attr.name}`] = `${attr.label || attr.name} must be a number`;
            } else {
              if (attr.min !== undefined && numValue < attr.min) {
                newErrors[`attr_${attr.name}`] =
                  `${attr.label || attr.name} must be at least ${attr.min}`;
              }
              if (attr.max !== undefined && numValue > attr.max) {
                newErrors[`attr_${attr.name}`] =
                  `${attr.label || attr.name} must be at most ${attr.max}`;
              }
            }
          }

          if (attr.type === 'text' && attr.pattern) {
            const regex = new RegExp(attr.pattern);
            if (!regex.test(String(value))) {
              newErrors[`attr_${attr.name}`] = `${attr.label || attr.name} format is invalid`;
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedProduct: Product;

      if (product) {
        // Update existing product
        const updates: UpdateProductRequest = {
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          subcategory: formData.subcategory,
          unitPrice: Number(formData.unitPrice),
          cost: Number(formData.cost),
          quantityOnHand: Number(formData.quantityOnHand),
          reorderPoint: Number(formData.reorderPoint),
          barcode: formData.barcode,
          barcodeType: formData.barcodeType,
          attributes: formData.attributes,
        };
        savedProduct = await productApi.updateProduct(product.id, updates);
      } else {
        // Create new product
        const createRequest: CreateProductRequest = {
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          subcategory: formData.subcategory,
          unitPrice: Number(formData.unitPrice),
          cost: Number(formData.cost),
          quantityOnHand: Number(formData.quantityOnHand),
          reorderPoint: Number(formData.reorderPoint),
          barcode: formData.barcode,
          barcodeType: formData.barcodeType,
          storeId: formData.storeId,
          attributes: formData.attributes,
        };
        savedProduct = await productApi.createProduct(createRequest);
      }

      onSave(savedProduct);
    } catch (err) {
      console.error('Failed to save product:', err);
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save product' });
    } finally {
      setLoading(false);
    }
  };

  const renderAttributeField = (attr: AttributeConfig) => {
    const value = formData.attributes[attr.name];
    const error = errors[`attr_${attr.name}`];

    switch (attr.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
            placeholder={attr.placeholder}
            className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
            placeholder={attr.placeholder}
            min={attr.min}
            max={attr.max}
            className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        );

      case 'dropdown':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select {attr.label || attr.name}</option>
            {attr.values?.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleAttributeChange(attr.name, e.target.checked)}
            className="w-4 h-4"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">{product ? 'Edit Product' : 'Create Product'}</h2>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {errors.submit}
        </div>
      )}

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            SKU <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-surface-elevated text-text-primary ${errors.sku ? 'border-error' : 'border-border'}`}
          />
          {errors.sku && <p className="mt-1 text-sm text-error">{errors.sku}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-surface-elevated text-text-primary ${errors.name ? 'border-error' : 'border-border'}`}
          />
          {errors.name && <p className="mt-1 text-sm text-error">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Category <span className="text-error">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => {
              handleChange('category', e.target.value);
              setSelectedCategory(e.target.value);
            }}
            className={`w-full px-3 py-2 border rounded-lg bg-surface-elevated text-text-primary ${errors.category ? 'border-error' : 'border-border'}`}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-error">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Unit Price</label>
          <input
            type="number"
            step="0.01"
            value={formData.unitPrice}
            onChange={(e) => handleChange('unitPrice', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-surface-elevated text-text-primary ${errors.unitPrice ? 'border-error' : 'border-border'}`}
          />
          {errors.unitPrice && <p className="mt-1 text-sm text-error">{errors.unitPrice}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Cost</label>
          <input
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => handleChange('cost', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-surface-elevated text-text-primary ${errors.cost ? 'border-error' : 'border-border'}`}
          />
          {errors.cost && <p className="mt-1 text-sm text-error">{errors.cost}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Quantity on Hand</label>
          <input
            type="number"
            value={formData.quantityOnHand}
            onChange={(e) => handleChange('quantityOnHand', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface-elevated text-text-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-elevated text-text-primary"
        />
      </div>

      {/* Dynamic category-specific attributes */}
      {selectedCategoryConfig && selectedCategoryConfig.attributes.length > 0 && (
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Category-Specific Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedCategoryConfig.attributes.map((attr) => (
              <div key={attr.name}>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {attr.label || attr.name}
                  {attr.required && <span className="text-error"> *</span>}
                </label>
                {renderAttributeField(attr)}
                {attr.helpText && <p className="mt-1 text-xs text-text-tertiary">{attr.helpText}</p>}
                {errors[`attr_${attr.name}`] && (
                  <p className="mt-1 text-sm text-error">{errors[`attr_${attr.name}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-surface-elevated"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

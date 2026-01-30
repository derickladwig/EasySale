import React from 'react';
import { FormTemplate } from '../../common/components/templates';
import { FormField } from '../../common/components/molecules/FormField';
import { Button } from '../../common/components/atoms/Button';

/**
 * Example Form Page
 * 
 * Demonstrates the use of FormTemplate with form fields.
 */
export const ExampleForm: React.FC = () => {
  const [formData, setFormData] = React.useState({
    productName: '',
    sku: '',
    category: '',
    price: '',
    quantity: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <FormTemplate
      title="Add Product"
      description="Enter product details to add to inventory"
      twoColumn
      maxWidth="lg"
      actions={
        <>
          <Button variant="outline" size="md">
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit}>
            Save Product
          </Button>
        </>
      }
    >
      <FormField
        label="Product Name"
        type="text"
        placeholder="Enter product name"
        value={formData.productName}
        onChange={handleChange('productName')}
        required
      />

      <FormField
        label="SKU"
        type="text"
        placeholder="Enter SKU"
        value={formData.sku}
        onChange={handleChange('sku')}
        required
        helperText="Unique product identifier"
      />

      <FormField
        label="Category"
        type="text"
        placeholder="Select category"
        value={formData.category}
        onChange={handleChange('category')}
        required
      />

      <FormField
        label="Price"
        type="number"
        placeholder="0.00"
        value={formData.price}
        onChange={handleChange('price')}
        required
        helperText="Price in USD"
      />

      <FormField
        label="Quantity"
        type="number"
        placeholder="0"
        value={formData.quantity}
        onChange={handleChange('quantity')}
        required
        helperText="Initial stock quantity"
      />

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-dark-200 mb-1.5">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={handleChange('description')}
          placeholder="Enter product description"
          rows={4}
          className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        />
      </div>
    </FormTemplate>
  );
};

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from '@common/utils/toast';
import { useUpdateCustomerMutation } from '@domains/customer/hooks';
import type { Customer } from '../pages/CustomersPage';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCustomerUpdated: () => void;
}

export function EditCustomerModal({ isOpen, onClose, customer, onCustomerUpdated }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  });

  const updateCustomerMutation = useUpdateCustomerMutation();

  // Update form when customer changes
  useEffect(() => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        data: {
          name: formData.name || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        },
      });

      toast.success('Customer updated successfully');
      onCustomerUpdated();
      onClose();
    } catch (error: unknown) {
      // Preserve specific error information for better debugging
      let message = 'Failed to update customer';
      
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle API error responses with specific messages
        const apiError = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
        if (apiError.response?.data?.error) {
          message = apiError.response.data.error;
        } else if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
        } else if (apiError.message) {
          message = apiError.message;
        }
      }
      
      toast.error(message);
      console.error('Customer update error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-2 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Edit Customer</h2>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-3 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateCustomerMutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {updateCustomerMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

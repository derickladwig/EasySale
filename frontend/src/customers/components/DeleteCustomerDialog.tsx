import { AlertTriangle, X } from 'lucide-react';
import { toast } from '@common/utils/toast';
import { useDeleteCustomerMutation } from '@domains/customer/hooks';
import type { Customer } from '../pages/CustomersPage';

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCustomerDeleted: () => void;
}

export function DeleteCustomerDialog({ isOpen, onClose, customer, onCustomerDeleted }: DeleteCustomerDialogProps) {
  const deleteCustomerMutation = useDeleteCustomerMutation();

  const handleDelete = async () => {
    try {
      await deleteCustomerMutation.mutateAsync(customer.id);
      toast.success('Customer deleted successfully');
      onCustomerDeleted();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete customer';
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-base rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-error-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-error-500" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-white">Delete Customer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-white rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-text-secondary mb-2">
            Are you sure you want to delete <span className="font-semibold text-white">{customer.name}</span>?
          </p>
          <p className="text-text-tertiary text-sm">
            This action cannot be undone. All customer data and history will be permanently removed.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteCustomerMutation.isPending}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteCustomerMutation.isPending}
            className="px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-500 disabled:opacity-50 transition-colors"
          >
            {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

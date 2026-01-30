import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeleteProductMutation } from '@domains/product/hooks';
import { Product } from '@domains/product/types';
import { toast } from '@common/components/molecules/Toast';

interface DeleteProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onDeleted?: () => void;
}

export function DeleteProductDialog({ isOpen, onClose, product, onDeleted }: DeleteProductDialogProps) {
  const deleteMutation = useDeleteProductMutation();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(product.id);
      toast.success('Product deleted successfully');
      onDeleted?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-base rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error-500/20 rounded-lg">
              <AlertTriangle className="text-error-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-white">Delete Product</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <span className="font-semibold text-white">{product.name}</span>?
          </p>
          <p className="text-sm text-text-tertiary">
            This action cannot be undone. The product will be permanently removed from your inventory.
          </p>
          <div className="p-3 bg-surface-elevated rounded-lg">
            <div className="text-sm text-text-tertiary mb-1">Product Details</div>
            <div className="text-text-secondary">
              <div>SKU: {product.sku}</div>
              <div>Category: {product.category}</div>
              <div>Quantity: {product.quantityOnHand}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
            disabled={deleteMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-6 py-2 bg-error-600 hover:bg-error-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

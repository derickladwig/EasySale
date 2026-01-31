import React, { useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../organisms/Modal';
import { Button } from '../atoms/Button';
import { cn } from '../../utils/classNames';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string | React.ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Dialog variant - affects icon and confirm button color */
  variant?: ConfirmDialogVariant;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Whether to disable the confirm button */
  confirmDisabled?: boolean;
  /** Additional content to render below the message */
  children?: React.ReactNode;
}

/**
 * Icon mapping for each variant
 */
const variantIcons: Record<ConfirmDialogVariant, React.ReactNode> = {
  danger: <AlertCircle className="w-6 h-6 text-error-400" />,
  warning: <AlertTriangle className="w-6 h-6 text-warning-400" />,
  info: <Info className="w-6 h-6 text-primary-400" />,
  success: <CheckCircle className="w-6 h-6 text-success-400" />,
};

/**
 * Button variant mapping for each dialog variant
 */
const confirmButtonVariants: Record<ConfirmDialogVariant, 'primary' | 'danger' | 'outline'> = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
  success: 'primary',
};

/**
 * ConfirmDialog Component
 * 
 * A confirmation dialog with focus trap, keyboard navigation, and ARIA labels.
 * Used for destructive actions that require user confirmation.
 * 
 * Validates: Requirements 9.3, 14.4, 14.5
 * 
 * @example
 * // Danger confirmation
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Integration"
 *   message="Are you sure you want to disconnect this integration? This action cannot be undone."
 *   variant="danger"
 *   confirmText="Disconnect"
 * />
 * 
 * @example
 * // Warning confirmation
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleFullResync}
 *   title="Full Resync"
 *   message="This will resync all data and may take several minutes."
 *   variant="warning"
 *   confirmText="Start Resync"
 * />
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
  confirmDisabled = false,
  children,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Enter key to confirm (when confirm button is focused)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    // Enter confirms if confirm button is focused
    if (e.key === 'Enter' && document.activeElement === confirmButtonRef.current) {
      e.preventDefault();
      if (!isLoading && !confirmDisabled) {
        onConfirm();
      }
    }
  }, [isOpen, isLoading, confirmDisabled, onConfirm]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus cancel button when dialog opens (safer default for destructive actions)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="flex items-center gap-3 w-full justify-end">
          <Button
            ref={cancelButtonRef}
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            aria-label={cancelText}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={confirmButtonVariants[variant]}
            onClick={handleConfirm}
            disabled={confirmDisabled || isLoading}
            aria-label={confirmText}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {variantIcons[variant]}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-text-secondary text-sm leading-relaxed">
            {message}
          </p>
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

/**
 * Hook for managing confirm dialog state
 */
export interface UseConfirmDialogOptions {
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  variant?: ConfirmDialogVariant;
  confirmText?: string;
}

export interface UseConfirmDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dialogProps: Omit<ConfirmDialogProps, 'children'>;
}

export function useConfirmDialog(options: UseConfirmDialogOptions): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await options.onConfirm();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    isOpen,
    open,
    close,
    dialogProps: {
      isOpen,
      onClose: close,
      onConfirm: handleConfirm,
      title: options.title,
      message: options.message,
      variant: options.variant,
      confirmText: options.confirmText,
      isLoading,
    },
  };
}

export default ConfirmDialog;

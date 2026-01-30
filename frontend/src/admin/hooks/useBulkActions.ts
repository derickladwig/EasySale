import { useState } from 'react';

export interface BulkActionResult {
  success: boolean;
  message: string;
  successCount: number;
  failureCount: number;
  errors?: Array<{ id: string; error: string }>;
}

export function useBulkActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const executeBulkAction = async <T>(
    selectedIds: string[],
    action: (id: string) => Promise<T>,
    onProgress?: (current: number, total: number) => void
  ): Promise<BulkActionResult> => {
    setIsProcessing(true);
    setProgress(0);

    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    const total = selectedIds.length;

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      try {
        await action(id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({
          id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }

      const current = i + 1;
      setProgress((current / total) * 100);
      if (onProgress) {
        onProgress(current, total);
      }
    }

    setIsProcessing(false);
    setProgress(0);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const errors = results.filter((r) => !r.success).map((r) => ({ id: r.id, error: r.error! }));

    return {
      success: failureCount === 0,
      message:
        failureCount === 0
          ? `Successfully processed ${successCount} items`
          : `Processed ${successCount} items, ${failureCount} failed`,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  };

  return {
    isProcessing,
    progress,
    executeBulkAction,
  };
}

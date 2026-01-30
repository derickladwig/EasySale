import { Button } from '@common/components/atoms';

export interface BulkAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
  requiresConfirmation?: boolean;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  actions: BulkAction[];
  selectedIds: string[];
  onClearSelection?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  actions,
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-primary-900">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-sm text-primary-700 hover:text-primary-900 underline"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={() => action.onClick(selectedIds)}
            variant={action.variant === 'danger' ? 'danger' : 'secondary'}
            size="sm"
          >
            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { ConfirmDialog } from '@common/components/molecules/ConfirmDialog';
import { ArrowRight, Plus, Trash2, Eye, AlertCircle } from 'lucide-react';

interface FieldMapping {
  source: string;
  target: string;
  transformation?: string;
}

interface ValidationError {
  index: number;
  field: 'source' | 'target';
  message: string;
}

interface MappingEditorProps {
  sourcePlatform: string;
  targetPlatform: string;
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onPreview?: () => void;
}

// Validate field name format
// Validates: Requirements 6.4
function validateFieldName(fieldName: string): string | null {
  if (!fieldName.trim()) {
    return 'Field name is required';
  }
  // Check for valid dot notation and array syntax
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*|\[\])*$/;
  if (!validPattern.test(fieldName)) {
    return 'Invalid field name format. Use dot notation (e.g., billing.email) or array syntax (e.g., items[].name)';
  }
  return null;
}

export const MappingEditor: React.FC<MappingEditorProps> = ({
  sourcePlatform,
  targetPlatform,
  mappings,
  onMappingsChange,
  onPreview,
}) => {
  const [newMapping, setNewMapping] = useState<FieldMapping>({
    source: '',
    target: '',
    transformation: '',
  });

  // Delete confirmation state
  // Validates: Requirements 6.6
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<number | null>(null);

  // Compute validation errors for all mappings
  // Validates: Requirements 6.4
  const validationErrors = useMemo<ValidationError[]>(() => {
    const errors: ValidationError[] = [];
    mappings.forEach((mapping, index) => {
      const sourceError = validateFieldName(mapping.source);
      if (sourceError) {
        errors.push({ index, field: 'source', message: sourceError });
      }
      const targetError = validateFieldName(mapping.target);
      if (targetError) {
        errors.push({ index, field: 'target', message: targetError });
      }
    });
    return errors;
  }, [mappings]);

  // Get error for a specific field
  const getFieldError = (index: number, field: 'source' | 'target'): string | null => {
    const error = validationErrors.find(e => e.index === index && e.field === field);
    return error?.message || null;
  };

  const handleAddMapping = () => {
    if (newMapping.source && newMapping.target) {
      // Validate before adding
      const sourceError = validateFieldName(newMapping.source);
      const targetError = validateFieldName(newMapping.target);
      if (!sourceError && !targetError) {
        onMappingsChange([...mappings, newMapping]);
        setNewMapping({ source: '', target: '', transformation: '' });
      }
    }
  };

  // Open delete confirmation
  // Validates: Requirements 6.6
  const handleDeleteClick = (index: number) => {
    setMappingToDelete(index);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = () => {
    if (mappingToDelete !== null) {
      onMappingsChange(mappings.filter((_, i) => i !== mappingToDelete));
    }
    setDeleteConfirmOpen(false);
    setMappingToDelete(null);
  };

  const handleUpdateMapping = (index: number, field: keyof FieldMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    onMappingsChange(updated);
  };

  const transformationFunctions = [
    'dateFormat',
    'concat',
    'split',
    'lookup',
    'uppercase',
    'lowercase',
    'trim',
    'replace',
    'lookupQBOCustomer',
    'lookupQBOItem',
    'mapLineItems',
  ];

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Field Mapping</h3>
            <p className="text-sm text-text-tertiary mt-1">
              Map fields from {sourcePlatform} to {targetPlatform}
            </p>
          </div>
          {onPreview && (
            <Button
              onClick={onPreview}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          )}
        </div>

        {/* Existing Mappings */}
        <div className="space-y-3">
          {mappings.map((mapping, index) => {
            const sourceError = getFieldError(index, 'source');
            const targetError = getFieldError(index, 'target');
            const hasError = sourceError || targetError;
            
            return (
              <div 
                key={index} 
                className={`p-3 bg-surface-base rounded-lg ${
                  hasError ? 'border border-error-500/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={mapping.source}
                      onChange={(e) => handleUpdateMapping(index, 'source', e.target.value)}
                      placeholder="Source field"
                      size="sm"
                      className={sourceError ? 'border-error-500' : ''}
                    />
                    {/* Inline validation error */}
                    {/* Validates: Requirements 6.4 */}
                    {sourceError && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-error-400">
                        <AlertCircle className="w-3 h-3" />
                        {sourceError}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-text-disabled flex-shrink-0" />

                  <div className="flex-1">
                    <Input
                      value={mapping.target}
                      onChange={(e) => handleUpdateMapping(index, 'target', e.target.value)}
                      placeholder="Target field"
                      size="sm"
                      className={targetError ? 'border-error-500' : ''}
                    />
                    {/* Inline validation error */}
                    {/* Validates: Requirements 6.4 */}
                    {targetError && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-error-400">
                        <AlertCircle className="w-3 h-3" />
                        {targetError}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <select
                      value={mapping.transformation || ''}
                      onChange={(e) => handleUpdateMapping(index, 'transformation', e.target.value)}
                      className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label={`Transformation for ${mapping.source}`}
                    >
                      <option value="">No transformation</option>
                      {transformationFunctions.map((fn) => (
                        <option key={fn} value={fn}>
                          {fn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={() => handleDeleteClick(index)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    aria-label={`Delete mapping from ${mapping.source} to ${mapping.target}`}
                  >
                    <Trash2 className="w-4 h-4 text-error-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Mapping */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={newMapping.source}
                onChange={(e) => setNewMapping({ ...newMapping, source: e.target.value })}
                placeholder="Source field (e.g., billing.email)"
                size="sm"
              />
            </div>

            <ArrowRight className="w-4 h-4 text-text-disabled flex-shrink-0" />

            <div className="flex-1">
              <Input
                value={newMapping.target}
                onChange={(e) => setNewMapping({ ...newMapping, target: e.target.value })}
                placeholder="Target field (e.g., BillEmail.Address)"
                size="sm"
              />
            </div>

            <div className="flex-1">
              <select
                value={newMapping.transformation || ''}
                onChange={(e) => setNewMapping({ ...newMapping, transformation: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Transformation for new mapping"
              >
                <option value="">No transformation</option>
                {transformationFunctions.map((fn) => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleAddMapping}
              variant="primary"
              size="sm"
              className="flex-shrink-0"
              disabled={!newMapping.source || !newMapping.target}
              aria-label="Add new field mapping"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-text-tertiary space-y-1">
          <p>
            <strong>Dot notation:</strong> Use dots for nested fields (e.g.,{' '}
            <code className="px-1 py-0.5 bg-surface-base rounded">billing.email</code>)
          </p>
          <p>
            <strong>Arrays:</strong> Use brackets for arrays (e.g.,{' '}
            <code className="px-1 py-0.5 bg-surface-base rounded">line_items[].name</code>)
          </p>
          <p>
            <strong>Transformations:</strong> Apply functions to transform data during sync
          </p>
        </div>

        {/* Validation Summary */}
        {validationErrors.length > 0 && (
          <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error-400" />
            <span className="text-sm text-error-400">
              {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''} found. Please fix before saving.
            </span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {/* Validates: Requirements 6.6 */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setMappingToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Mapping"
        message="Are you sure you want to delete this field mapping? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Card>
  );
};

import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { ArrowRight, Plus, Trash2, Eye } from 'lucide-react';

interface FieldMapping {
  source: string;
  target: string;
  transformation?: string;
}

interface MappingEditorProps {
  sourcePlatform: string;
  targetPlatform: string;
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onPreview?: () => void;
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

  const handleAddMapping = () => {
    if (newMapping.source && newMapping.target) {
      onMappingsChange([...mappings, newMapping]);
      setNewMapping({ source: '', target: '', transformation: '' });
    }
  };

  const handleRemoveMapping = (index: number) => {
    onMappingsChange(mappings.filter((_, i) => i !== index));
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
          {mappings.map((mapping, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-surface-base rounded-lg">
              <div className="flex-1">
                <Input
                  value={mapping.source}
                  onChange={(e) => handleUpdateMapping(index, 'source', e.target.value)}
                  placeholder="Source field"
                  size="sm"
                />
              </div>

              <ArrowRight className="w-4 h-4 text-text-disabled flex-shrink-0" />

              <div className="flex-1">
                <Input
                  value={mapping.target}
                  onChange={(e) => handleUpdateMapping(index, 'target', e.target.value)}
                  placeholder="Target field"
                  size="sm"
                />
              </div>

              <div className="flex-1">
                <select
                  value={mapping.transformation || ''}
                  onChange={(e) => handleUpdateMapping(index, 'transformation', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                onClick={() => handleRemoveMapping(index)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-error-400" />
              </Button>
            </div>
          ))}
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
      </div>
    </Card>
  );
};

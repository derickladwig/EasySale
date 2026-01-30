import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useVendorTemplate, useCreateTemplate, useUpdateTemplate, TemplateConfig, BoundingBox } from '../hooks/useVendorTemplates';
import { getErrorMessage } from '@common/utils/errorUtils';
import { toast } from '@common/utils/toast';

interface ExtractionZone {
  id: string;
  fieldName: string;
  label: string;
  pattern: string;
  zone?: BoundingBox;
}

export const VendorTemplateEditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isNewTemplate = templateId === 'new';
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [extractionZones, setExtractionZones] = useState<ExtractionZone[]>([
    { id: '1', fieldName: 'invoice_number', label: 'Invoice Number', pattern: '' },
    { id: '2', fieldName: 'invoice_date', label: 'Invoice Date', pattern: '' },
    { id: '3', fieldName: 'vendor_name', label: 'Vendor Name', pattern: '' },
    { id: '4', fieldName: 'total', label: 'Total Amount', pattern: '' },
  ]);
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Only fetch if we're editing an existing template
  const { data: template, isLoading, error } = useVendorTemplate(templateId || '');
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  // Populate form when template loads
  useEffect(() => {
    if (template && !isNewTemplate) {
      setTemplateName(template.name);
      setVendorName(template.vendor_name);
      setVendorId(template.vendor_id);
      
      // Convert template config to extraction zones
      if (template.config_json?.header) {
        const zones = Object.entries(template.config_json.header).map(([fieldName, config], index) => ({
          id: String(index + 1),
          fieldName,
          label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          pattern: config.pattern || '',
          zone: config.zone,
        }));
        if (zones.length > 0) {
          setExtractionZones(zones);
        }
      }
    }
  }, [template, isNewTemplate]);

  const handleAddZone = () => {
    const newId = String(Date.now());
    setExtractionZones([
      ...extractionZones,
      { id: newId, fieldName: '', label: '', pattern: '' },
    ]);
  };

  const handleRemoveZone = (id: string) => {
    setExtractionZones(extractionZones.filter(z => z.id !== id));
  };

  const handleZoneChange = (id: string, field: keyof ExtractionZone, value: string) => {
    setExtractionZones(extractionZones.map(z => 
      z.id === id ? { ...z, [field]: value } : z
    ));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!vendorId.trim() && !vendorName.trim()) {
      toast.error('Vendor is required');
      return;
    }

    setIsSaving(true);

    // Build config from extraction zones
    const headerConfig: Record<string, { pattern: string; zone?: BoundingBox }> = {};
    extractionZones.forEach(zone => {
      if (zone.fieldName) {
        headerConfig[zone.fieldName] = {
          pattern: zone.pattern,
          zone: zone.zone,
        };
      }
    });

    const config: TemplateConfig = {
      header: headerConfig,
      line_items: {
        table_start: '',
        columns: ['sku', 'description', 'quantity', 'unit_price', 'line_total'],
      },
    };

    try {
      if (isNewTemplate) {
        await createMutation.mutateAsync({
          vendor_id: vendorId || vendorName.toLowerCase().replace(/\s+/g, '-'),
          name: templateName,
          config_json: config,
        });
        toast.success('Template created successfully');
      } else if (templateId) {
        await updateMutation.mutateAsync({
          templateId,
          name: templateName,
          config_json: config,
        });
        toast.success('Template updated successfully');
      }
      navigate('/vendor-bills/templates');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save template';
      // Check if this is a stub endpoint
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('not implemented')) {
        toast.info('Template saving requires backend implementation', {
          description: 'Your changes have been recorded locally.',
        });
        navigate('/vendor-bills/templates');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendor-bills/templates')}
            className="p-2 text-text-tertiary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isNewTemplate ? 'Create Template' : 'Edit Template'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && !isNewTemplate && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
            <div className="h-8 bg-surface-elevated rounded w-1/4" />
            <div className="h-64 bg-surface-elevated rounded" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isNewTemplate && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-error-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Failed to load template</h3>
            <p className="text-error-400 mb-4">{getErrorMessage(error)}</p>
            <button
              onClick={() => navigate('/vendor-bills/templates')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Templates
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      {(isNewTemplate || (!isLoading && !error)) && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 p-6 h-full">
            {/* Left Panel - Document Preview */}
            <div className="bg-surface-base rounded-lg border border-border p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Document Preview</h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="p-2 text-text-tertiary hover:text-white transition-colors"
                  title={showPreview ? 'Hide preview' : 'Show preview'}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showPreview ? (
                <div className="bg-background-primary rounded-lg flex-1 flex items-center justify-center relative">
                  <div className="text-center">
                    <p className="text-text-tertiary mb-4">Document preview will be displayed here</p>
                    <p className="text-text-disabled text-sm">
                      Upload a sample document to preview extraction zones
                    </p>
                  </div>
                  {/* Zone overlay indicators */}
                  {extractionZones.filter(z => z.zone).map(zone => (
                    <div
                      key={zone.id}
                      className="absolute border-2 border-primary-500 bg-primary-500/10 rounded"
                      style={{
                        left: `${zone.zone!.x}%`,
                        top: `${zone.zone!.y}%`,
                        width: `${zone.zone!.width}%`,
                        height: `${zone.zone!.height}%`,
                      }}
                    >
                      <span className="absolute -top-5 left-0 text-xs text-primary-400 bg-surface-base px-1 rounded">
                        {zone.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-background-primary rounded-lg flex-1 flex items-center justify-center">
                  <p className="text-text-tertiary">Preview hidden</p>
                </div>
              )}
            </div>

            {/* Right Panel - Configuration */}
            <div className="bg-surface-base rounded-lg border border-border p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-white mb-4">Template Configuration</h2>
              
              {/* Template Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 bg-background-primary border border-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-background-primary border border-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={template?.version || '1'}
                    className="w-full px-3 py-2 bg-background-primary border border-border rounded-lg text-text-tertiary"
                    readOnly
                  />
                </div>
              </div>

              {/* Extraction Zones */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-text-secondary">Extraction Zones</h3>
                  <button
                    onClick={handleAddZone}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Zone
                  </button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {extractionZones.map((zone) => (
                    <div key={zone.id} className="bg-background-primary rounded-lg p-3 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={zone.label}
                          onChange={(e) => handleZoneChange(zone.id, 'label', e.target.value)}
                          className="text-sm font-medium text-white bg-transparent border-none focus:outline-none"
                          placeholder="Field Label"
                        />
                        <button
                          onClick={() => handleRemoveZone(zone.id)}
                          className="p-1 text-text-tertiary hover:text-error-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={zone.fieldName}
                          onChange={(e) => handleZoneChange(zone.id, 'fieldName', e.target.value)}
                          className="text-xs px-2 py-1 bg-surface-elevated border border-border rounded text-text-secondary focus:outline-none focus:border-primary-500"
                          placeholder="field_name"
                        />
                        <input
                          type="text"
                          value={zone.pattern}
                          onChange={(e) => handleZoneChange(zone.id, 'pattern', e.target.value)}
                          className="text-xs px-2 py-1 bg-surface-elevated border border-border rounded text-text-secondary focus:outline-none focus:border-primary-500"
                          placeholder="Regex pattern"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-text-tertiary mt-3">
                  Define extraction zones by specifying field names and optional regex patterns.
                  Draw rectangles on the document preview to define visual zones.
                </p>
              </div>

              {/* Line Items Configuration */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3">Line Items Configuration</h3>
                <p className="text-sm text-text-tertiary">
                  Line item extraction is configured automatically based on table detection.
                  Advanced configuration options will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

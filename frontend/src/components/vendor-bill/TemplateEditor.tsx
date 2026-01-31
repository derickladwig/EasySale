/**
 * TemplateEditor Component
 *
 * Manage vendor bill parsing templates
 * Requirements: 4.7, 16.7
 */

import React, { useState } from 'react';

interface Template {
  id: string;
  vendor_id: string;
  name: string;
  version: number;
  active: boolean;
  config_json: Record<string, any>;
}

export const TemplateEditor: React.FC = () => {
  const [templates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      JSON.parse(configJson);
      alert('Template saved successfully! (Backend integration pending)');
      setError(null);
    } catch {
      setError('Invalid JSON format');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Vendor Bill Templates
      </h1>

      <div className="bg-surface-base rounded-lg shadow-md p-6 border border-border">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Template Configuration
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Templates define how to parse vendor bills. Configure field locations, patterns, and
            extraction rules.
          </p>
        </div>

        {/* Template List */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find((t) => t.id === e.target.value);
              setSelectedTemplate(template || null);
              if (template) {
                setConfigJson(JSON.stringify(template.config_json, null, 2));
              }
            }}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
          >
            <option value="">Create New Template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (v{template.version}) - {template.active ? 'Active' : 'Inactive'}
              </option>
            ))}
          </select>
        </div>

        {/* Template Fields */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Template Name
            </label>
            <input
              type="text"
              placeholder="e.g., ACME Supply Template"
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Vendor ID
            </label>
            <input
              type="text"
              placeholder="vendor-123"
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary"
            />
          </div>
        </div>

        {/* JSON Editor */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Template Configuration (JSON)
          </label>
          <textarea
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            placeholder={`{
  "header": {
    "invoice_no": {"pattern": "Invoice #: (\\\\d+)"},
    "invoice_date": {"pattern": "Date: (\\\\d{2}/\\\\d{2}/\\\\d{4})"},
    "total": {"pattern": "Total: \\\\$([\\\\d,]+\\\\.\\\\d{2})"}
  },
  "line_items": {
    "table_start": "Item\\\\s+Description\\\\s+Qty",
    "columns": ["sku", "description", "qty", "unit", "price"]
  }
}`}
            rows={20}
            className="w-full px-3 py-2 border border-border rounded-md font-mono text-sm bg-surface-elevated text-text-primary"
          />
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </div>

        {/* Example Configuration */}
        <div className="mb-6 p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-dark rounded-md">
          <h3 className="text-sm font-semibold text-info-900 dark:text-info-300 mb-2">
            Template Configuration Guide
          </h3>
          <ul className="text-xs text-info-dark dark:text-info space-y-1">
            <li>
              • <strong>header</strong>: Define patterns to extract invoice number, date, totals
            </li>
            <li>
              • <strong>line_items</strong>: Configure table detection and column mapping
            </li>
            <li>
              • <strong>patterns</strong>: Use regex patterns for field extraction
            </li>
            <li>
              • <strong>zones</strong>: Define coordinate-based extraction areas (optional)
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setConfigJson('');
              setSelectedTemplate(null);
              setError(null);
            }}
            className="px-4 py-2 border border-border text-text-secondary rounded-md hover:bg-surface-elevated"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover"
          >
            Save Template
          </button>
        </div>

        {/* Development Notice */}
        <div className="mt-6 p-4 bg-[var(--color-warning-50)] dark:bg-[var(--color-warning-900)]/20 border border-[var(--color-warning-200)] dark:border-[var(--color-warning-800)] rounded-md">
          <p className="text-sm text-[var(--color-warning-800)] dark:text-[var(--color-warning-400)]">
            <strong>Note:</strong> Template management is currently in development. The visual
            template editor and test functionality require backend implementation.
          </p>
        </div>
      </div>
    </div>
  );
};

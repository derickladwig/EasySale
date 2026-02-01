import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Stack } from '../../components/ui/Stack';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useConfig } from '../../config/ConfigProvider';

interface ReceiptTemplate {
  id: string;
  name: string;
  type: 'sale' | 'return' | 'layaway' | 'quote';
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showBarcode: boolean;
  showQRCode: boolean;
  paperWidth: '58mm' | '80mm';
}

const defaultTemplates: ReceiptTemplate[] = [
  {
    id: 'sale-default',
    name: 'Standard Sale Receipt',
    type: 'sale',
    headerText: 'Thank you for your purchase!',
    footerText: 'Returns accepted within 30 days with receipt.',
    showLogo: true,
    showBarcode: true,
    showQRCode: false,
    paperWidth: '80mm',
  },
  {
    id: 'return-default',
    name: 'Return Receipt',
    type: 'return',
    headerText: 'Return Processed',
    footerText: 'Refund will appear on your statement within 3-5 business days.',
    showLogo: true,
    showBarcode: true,
    showQRCode: false,
    paperWidth: '80mm',
  },
  {
    id: 'layaway-default',
    name: 'Layaway Receipt',
    type: 'layaway',
    headerText: 'Layaway Agreement',
    footerText: 'Items will be held for 30 days. Payments are non-refundable.',
    showLogo: true,
    showBarcode: true,
    showQRCode: false,
    paperWidth: '80mm',
  },
  {
    id: 'quote-default',
    name: 'Quote/Estimate',
    type: 'quote',
    headerText: 'Price Quote',
    footerText: 'Quote valid for 7 days. Prices subject to change.',
    showLogo: true,
    showBarcode: false,
    showQRCode: true,
    paperWidth: '80mm',
  },
];

/**
 * Receipt Templates Configuration Page
 * Allows customization of receipt layouts and content
 */
export function ReceiptsPage() {
  const { branding, brandConfig } = useConfig();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate>(templates[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get company info from config
  const companyName = branding?.company?.name || brandConfig?.company?.name || 'Your Store';
  const storeName = branding?.store?.name || brandConfig?.store?.name || '';

  const handleTemplateSelect = (template: ReceiptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleFieldChange = (field: keyof ReceiptTemplate, value: string | boolean) => {
    setSelectedTemplate((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setTemplates((prev) =>
      prev.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t))
    );
    setHasChanges(false);
    setIsSaving(false);
  };

  const handleReset = () => {
    const original = templates.find((t) => t.id === selectedTemplate.id);
    if (original) {
      setSelectedTemplate(original);
      setHasChanges(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Receipt Templates"
        helperText="Customize the appearance and content of your printed receipts"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Templates</h3>
          <Stack gap="2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedTemplate.id === template.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-overlay'
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm opacity-75 capitalize">{template.type}</div>
              </button>
            ))}
          </Stack>
        </Card>

        {/* Template Editor */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Edit Template</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <Stack gap="4">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Template Name
              </label>
              <Input
                value={selectedTemplate.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            {/* Header Text */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Header Text
              </label>
              <Input
                value={selectedTemplate.headerText}
                onChange={(e) => handleFieldChange('headerText', e.target.value)}
                placeholder="Text shown at the top of the receipt"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Footer Text
              </label>
              <Input
                value={selectedTemplate.footerText}
                onChange={(e) => handleFieldChange('footerText', e.target.value)}
                placeholder="Text shown at the bottom of the receipt"
              />
            </div>

            {/* Paper Width */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Paper Width
              </label>
              <select
                value={selectedTemplate.paperWidth}
                onChange={(e) => handleFieldChange('paperWidth', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary"
              >
                <option value="58mm">58mm (Narrow)</option>
                <option value="80mm">80mm (Standard)</option>
              </select>
            </div>

            {/* Toggle Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTemplate.showLogo}
                  onChange={(e) => handleFieldChange('showLogo', e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-border"
                />
                <span className="text-sm text-text-secondary">Show Logo</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTemplate.showBarcode}
                  onChange={(e) => handleFieldChange('showBarcode', e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-border"
                />
                <span className="text-sm text-text-secondary">Show Barcode</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTemplate.showQRCode}
                  onChange={(e) => handleFieldChange('showQRCode', e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-border"
                />
                <span className="text-sm text-text-secondary">Show QR Code</span>
              </label>
            </div>
          </Stack>
        </Card>
      </div>

      {/* Preview Section */}
      <Card padding="md">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Receipt Preview</h3>
        <div className="flex justify-center">
          <div
            className={`bg-white text-black p-4 shadow-lg ${
              selectedTemplate.paperWidth === '58mm' ? 'w-[220px]' : 'w-[300px]'
            }`}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          >
            {/* Logo Placeholder */}
            {selectedTemplate.showLogo && (
              <div className="text-center mb-2 pb-2 border-b border-border">
                <div className="text-lg font-bold">{storeName || companyName}</div>
                <div className="text-xs">Store Address</div>
                <div className="text-xs">City, Province/State</div>
              </div>
            )}

            {/* Header */}
            <div className="text-center font-bold mb-2">{selectedTemplate.headerText}</div>

            {/* Sample Items */}
            <div className="border-t border-b border-border py-2 my-2">
              <div className="flex justify-between">
                <span>Sample Item 1</span>
                <span>$19.99</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Item 2</span>
                <span>$29.99</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Item 3</span>
                <span>$9.99</span>
              </div>
            </div>

            {/* Totals */}
            <div className="py-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>$59.97</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%):</span>
                <span>$4.80</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-1 mt-1">
                <span>TOTAL:</span>
                <span>$64.77</span>
              </div>
            </div>

            {/* Barcode */}
            {selectedTemplate.showBarcode && (
              <div className="text-center my-2">
                <div className="bg-black h-10 mx-auto" style={{ width: '80%' }}></div>
                <div className="text-xs mt-1">*1234567890*</div>
              </div>
            )}

            {/* QR Code */}
            {selectedTemplate.showQRCode && (
              <div className="text-center my-2">
                <div
                  className="bg-black mx-auto"
                  style={{ width: '60px', height: '60px' }}
                ></div>
                <div className="text-xs mt-1">Scan for digital receipt</div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs mt-2 pt-2 border-t border-border">
              {selectedTemplate.footerText}
            </div>

            {/* Date/Time */}
            <div className="text-center text-xs mt-2">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

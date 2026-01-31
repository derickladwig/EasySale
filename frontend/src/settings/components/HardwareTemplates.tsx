import React, { useState } from 'react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { Package, CheckCircle } from 'lucide-react';

interface HardwareTemplate {
  id: string;
  name: string;
  description: string;
  devices: {
    receipt_printer?: any;
    label_printer?: any;
    scanner?: any;
    cash_drawer?: any;
    payment_terminal?: any;
  };
}

const templates: HardwareTemplate[] = [
  {
    id: 'retail-basic',
    name: 'Basic Retail Setup',
    description: 'Essential hardware for a small retail store',
    devices: {
      receipt_printer: {
        name: 'Receipt Printer',
        type: 'ESC/POS',
        connection: 'USB',
        port: '/dev/usb/lp0',
        width: '80mm',
      },
      scanner: {
        name: 'Barcode Scanner',
        type: 'USB HID',
        prefix: '',
        suffix: '\n',
      },
      cash_drawer: {
        name: 'Cash Drawer',
        type: 'RJ11 via Printer',
        connection: 'Receipt Printer',
        open_code: '\\x1B\\x70\\x00',
      },
    },
  },
  {
    id: 'retail-advanced',
    name: 'Advanced Retail Setup',
    description: 'Complete hardware setup with label printing and payment terminal',
    devices: {
      receipt_printer: {
        name: 'Main Receipt Printer',
        type: 'ESC/POS',
        connection: 'Network',
        port: '192.168.1.100:9100',
        width: '80mm',
      },
      label_printer: {
        name: 'Label Printer',
        type: 'Zebra ZPL',
        ip_address: '192.168.1.101',
        port: 9100,
      },
      scanner: {
        name: 'Wireless Scanner',
        type: 'USB HID',
        prefix: '',
        suffix: '\n',
      },
      cash_drawer: {
        name: 'Cash Drawer',
        type: 'RJ11 via Printer',
        connection: 'Main Receipt Printer',
        open_code: '\\x1B\\x70\\x00',
      },
      payment_terminal: {
        name: 'Payment Terminal',
        type: 'Stripe Terminal',
        connection_settings: 'tmr_123456',
      },
    },
  },
  {
    id: 'inventory',
    name: 'Inventory Setup',
    description: 'Label-focused setup for inventory operations',
    devices: {
      label_printer: {
        name: 'Inventory Label Printer',
        type: 'Zebra ZPL',
        ip_address: '192.168.1.100',
        port: 9100,
      },
      scanner: {
        name: 'Inventory Scanner',
        type: 'USB HID',
        prefix: '',
        suffix: '\n',
      },
    },
  },
];

interface HardwareTemplatesProps {
  onApplyTemplate: (template: HardwareTemplate) => void;
  onClose: () => void;
}

export const HardwareTemplates: React.FC<HardwareTemplatesProps> = ({
  onApplyTemplate,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<HardwareTemplate | null>(null);

  const handleApply = () => {
    if (!selectedTemplate) return;

    if (
      confirm(
        `Apply "${selectedTemplate.name}" template? This will replace your current hardware configuration.`
      )
    ) {
      onApplyTemplate(selectedTemplate);
      toast.success(`Applied ${selectedTemplate.name} template`);
      onClose();
    }
  };

  const getDeviceCount = (template: HardwareTemplate): number => {
    return Object.keys(template.devices).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">Hardware Templates</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Choose a pre-configured hardware setup for your business type
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-6 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/50'
                    : 'border-border bg-background-primary hover:border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-primary-400" />
                    <h3 className="font-semibold text-text-primary">{template.name}</h3>
                  </div>
                  {selectedTemplate?.id === template.id && (
                    <CheckCircle className="w-5 h-5 text-primary-400" />
                  )}
                </div>

                <p className="text-sm text-text-tertiary mb-4">{template.description}</p>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-text-disabled uppercase">Includes:</div>
                  <div className="flex flex-wrap gap-2">
                    {template.devices.receipt_printer && (
                      <span className="px-2 py-1 text-xs bg-surface-base text-text-secondary rounded border border-border">
                        Receipt Printer
                      </span>
                    )}
                    {template.devices.label_printer && (
                      <span className="px-2 py-1 text-xs bg-surface-base text-text-secondary rounded border border-border">
                        Label Printer
                      </span>
                    )}
                    {template.devices.scanner && (
                      <span className="px-2 py-1 text-xs bg-surface-base text-text-secondary rounded border border-border">
                        Scanner
                      </span>
                    )}
                    {template.devices.cash_drawer && (
                      <span className="px-2 py-1 text-xs bg-surface-base text-text-secondary rounded border border-border">
                        Cash Drawer
                      </span>
                    )}
                    {template.devices.payment_terminal && (
                      <span className="px-2 py-1 text-xs bg-surface-base text-text-secondary rounded border border-border">
                        Payment Terminal
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-disabled mt-2">
                    {getDeviceCount(template)} device{getDeviceCount(template) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-6 p-4 bg-background-primary border border-border rounded-lg">
              <h4 className="font-medium text-text-primary mb-3">Template Details</h4>
              <div className="space-y-3 text-sm">
                {Object.entries(selectedTemplate.devices).map(([key, device]) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5"></div>
                    <div>
                      <div className="font-medium text-text-secondary">{device.name}</div>
                      <div className="text-text-disabled">
                        {device.type || device.connection_settings}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedTemplate} variant="primary">
            Apply Template
          </Button>
        </div>
      </div>
    </div>
  );
};

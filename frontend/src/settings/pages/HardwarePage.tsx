import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import {
  Printer,
  Tag,
  Scan,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { HardwareTemplates } from '../components/HardwareTemplates';

type HardwareTab =
  | 'receipt-printers'
  | 'label-printers'
  | 'scanners'
  | 'cash-drawers'
  | 'payment-terminals';

interface ReceiptPrinter {
  id: number;
  name: string;
  type: 'ESC/POS' | 'Star';
  connection: 'USB' | 'Network' | 'Serial';
  port: string;
  width: '58mm' | '80mm';
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

interface LabelPrinter {
  id: number;
  name: string;
  type: 'Zebra ZPL' | 'Brother QL';
  ip_address: string;
  port: number;
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

interface Scanner {
  id: number;
  name: string;
  type: 'USB HID';
  prefix: string;
  suffix: string;
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

interface CashDrawer {
  id: number;
  name: string;
  type: 'RJ11 via Printer' | 'USB';
  connection: string;
  open_code: string;
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

interface PaymentTerminal {
  id: number;
  name: string;
  type: 'Stripe Terminal' | 'Square' | 'PAX' | 'Ingenico';
  connection_settings: string;
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

export const HardwarePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HardwareTab>('receipt-printers');
  const [showTemplates, setShowTemplates] = useState(false);

  const [receiptPrinters] = useState<ReceiptPrinter[]>([
    {
      id: 1,
      name: 'Main Counter Printer',
      type: 'ESC/POS',
      connection: 'USB',
      port: '/dev/usb/lp0',
      width: '80mm',
      status: 'connected',
      is_default: true,
    },
  ]);

  const [labelPrinters] = useState<LabelPrinter[]>([
    {
      id: 1,
      name: 'Zebra ZD420',
      type: 'Zebra ZPL',
      ip_address: '192.168.1.100',
      port: 9100,
      status: 'connected',
      is_default: true,
    },
  ]);

  const [scanners] = useState<Scanner[]>([
    {
      id: 1,
      name: 'Honeywell Scanner',
      type: 'USB HID',
      prefix: '',
      suffix: '\n',
      status: 'connected',
      is_default: true,
    },
  ]);

  const [cashDrawers] = useState<CashDrawer[]>([
    {
      id: 1,
      name: 'Main Cash Drawer',
      type: 'RJ11 via Printer',
      connection: 'Main Counter Printer',
      open_code: '\\x1B\\x70\\x00',
      status: 'connected',
      is_default: true,
    },
  ]);

  const [paymentTerminals] = useState<PaymentTerminal[]>([
    {
      id: 1,
      name: 'Stripe Reader',
      type: 'Stripe Terminal',
      connection_settings: 'tmr_123456',
      status: 'disconnected',
      is_default: true,
    },
  ]);

  const handleTestPrint = (printerId: number, type: 'receipt' | 'label') => {
    toast.info(`Sending test print to ${type} printer ${printerId}...`);
    setTimeout(() => {
      toast.success('Test print sent successfully');
    }, 1000);
  };

  const handleTestScan = () => {
    toast.info('Waiting for barcode scan...');
  };

  const handleTestDrawer = () => {
    toast.info('Opening cash drawer...');
    setTimeout(() => {
      toast.success('Cash drawer opened');
    }, 500);
  };

  const handleTestTerminal = () => {
    toast.info('Testing payment terminal connection...');
    setTimeout(() => {
      toast.success('Payment terminal connected');
    }, 1500);
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Hardware Configuration</h1>
            <p className="text-text-secondary mt-2">
              Configure printers, scanners, and payment terminals
            </p>
          </div>
          <Button
            onClick={() => setShowTemplates(true)}
            variant="outline"
            leftIcon={<Package className="w-4 h-4" />}
          >
            Use Template
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('receipt-printers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'receipt-printers'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Receipt Printers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('label-printers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'label-printers'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Label Printers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('scanners')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'scanners'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Scanners
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cash-drawers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'cash-drawers'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Cash Drawers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payment-terminals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'payment-terminals'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Terminals
              </div>
            </button>
          </nav>
        </div>

        {/* Receipt Printers Tab */}
        {activeTab === 'receipt-printers' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Receipt Printers</h2>
                <Button variant="primary">Add Printer</Button>
              </div>

              <div className="space-y-4">
                {receiptPrinters.map((printer) => (
                  <div
                    key={printer.id}
                    className="p-4 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-text-primary">{printer.name}</h3>
                          {printer.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                              Default
                            </span>
                          )}
                          {printer.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-text-tertiary">
                          <div>
                            <span className="font-medium">Type:</span> {printer.type}
                          </div>
                          <div>
                            <span className="font-medium">Connection:</span> {printer.connection}
                          </div>
                          <div>
                            <span className="font-medium">Port:</span> {printer.port}
                          </div>
                          <div>
                            <span className="font-medium">Width:</span> {printer.width}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleTestPrint(printer.id, 'receipt')}
                          variant="outline"
                          size="sm"
                        >
                          Test Print
                        </Button>
                        <Button variant="ghost" size="sm">
                          <div className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Label Printers Tab */}
        {activeTab === 'label-printers' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Label Printers</h2>
                <Button variant="primary">Add Printer</Button>
              </div>

              <div className="space-y-4">
                {labelPrinters.map((printer) => (
                  <div
                    key={printer.id}
                    className="p-4 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-text-primary">{printer.name}</h3>
                          {printer.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                              Default
                            </span>
                          )}
                          {printer.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-text-tertiary">
                          <div>
                            <span className="font-medium">Type:</span> {printer.type}
                          </div>
                          <div>
                            <span className="font-medium">IP Address:</span> {printer.ip_address}
                          </div>
                          <div>
                            <span className="font-medium">Port:</span> {printer.port}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleTestPrint(printer.id, 'label')}
                          variant="outline"
                          size="sm"
                        >
                          Test Print
                        </Button>
                        <Button variant="ghost" size="sm">
                          <div className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Scanners Tab */}
        {activeTab === 'scanners' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Barcode Scanners</h2>
                <Button variant="primary">Add Scanner</Button>
              </div>

              <div className="space-y-4">
                {scanners.map((scanner) => (
                  <div
                    key={scanner.id}
                    className="p-4 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-text-primary">{scanner.name}</h3>
                          {scanner.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                              Default
                            </span>
                          )}
                          {scanner.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-text-tertiary">
                          <div>
                            <span className="font-medium">Type:</span> {scanner.type}
                          </div>
                          <div>
                            <span className="font-medium">Prefix:</span>{' '}
                            {scanner.prefix || '(none)'}
                          </div>
                          <div>
                            <span className="font-medium">Suffix:</span>{' '}
                            {scanner.suffix === '\n' ? 'Enter' : scanner.suffix || '(none)'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button onClick={() => handleTestScan()} variant="outline" size="sm">
                          Test Scan
                        </Button>
                        <Button variant="ghost" size="sm">
                          <div className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Cash Drawers Tab */}
        {activeTab === 'cash-drawers' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Cash Drawers</h2>
                <Button variant="primary">Add Cash Drawer</Button>
              </div>

              <div className="space-y-4">
                {cashDrawers.map((drawer) => (
                  <div
                    key={drawer.id}
                    className="p-4 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-text-primary">{drawer.name}</h3>
                          {drawer.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                              Default
                            </span>
                          )}
                          {drawer.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-text-tertiary">
                          <div>
                            <span className="font-medium">Type:</span> {drawer.type}
                          </div>
                          <div>
                            <span className="font-medium">Connection:</span> {drawer.connection}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button onClick={() => handleTestDrawer()} variant="outline" size="sm">
                          Test Open
                        </Button>
                        <Button variant="ghost" size="sm">
                          <div className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Payment Terminals Tab */}
        {activeTab === 'payment-terminals' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Payment Terminals</h2>
                <Button variant="primary">Add Terminal</Button>
              </div>

              <div className="space-y-4">
                {paymentTerminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="p-4 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-text-primary">{terminal.name}</h3>
                          {terminal.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                              Default
                            </span>
                          )}
                          {terminal.status === 'connected' ? (
                            <CheckCircle className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-text-tertiary">
                          <div>
                            <span className="font-medium">Type:</span> {terminal.type}
                          </div>
                          <div>
                            <span className="font-medium">Connection:</span>{' '}
                            {terminal.connection_settings}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button onClick={() => handleTestTerminal()} variant="outline" size="sm">
                          Test Connection
                        </Button>
                        <Button variant="ghost" size="sm">
                          <div className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Hardware Templates Modal */}
      {showTemplates && (
        <HardwareTemplates
          onApplyTemplate={(template) => {
            // Apply template configuration to devices
            toast.success(`Applied ${template.name} template`);
            // In production, would update device states
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};

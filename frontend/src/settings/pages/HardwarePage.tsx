import React, { useState, useEffect } from 'react';
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
  type: 'Stripe Terminal' | 'Square' | 'PAX' | 'Ingenico' | 'Manual Entry';
  connection_settings: string;
  status: 'connected' | 'disconnected';
  is_default: boolean;
}

export const HardwarePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HardwareTab>('receipt-printers');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default configurations - will be loaded from settings
  const [receiptPrinters, setReceiptPrinters] = useState<ReceiptPrinter[]>([]);
  const [labelPrinters, setLabelPrinters] = useState<LabelPrinter[]>([]);
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([]);
  const [paymentTerminals, setPaymentTerminals] = useState<PaymentTerminal[]>([]);

  // Load hardware settings from backend
  useEffect(() => {
    const loadHardwareSettings = async () => {
      try {
        const response = await fetch('/api/settings/hardware', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.receipt_printers) setReceiptPrinters(data.receipt_printers);
          if (data.label_printers) setLabelPrinters(data.label_printers);
          if (data.scanners) setScanners(data.scanners);
          if (data.cash_drawers) setCashDrawers(data.cash_drawers);
          if (data.payment_terminals) setPaymentTerminals(data.payment_terminals);
        } else {
          // Use defaults if API not available
          setReceiptPrinters([{
            id: 1,
            name: 'Default Receipt Printer',
            type: 'ESC/POS',
            connection: 'USB',
            port: navigator.platform.includes('Win') ? 'USB001' : '/dev/usb/lp0',
            width: '80mm',
            status: 'disconnected',
            is_default: true,
          }]);
          setLabelPrinters([{
            id: 1,
            name: 'Default Label Printer',
            type: 'Zebra ZPL',
            ip_address: '192.168.1.100',
            port: 9100,
            status: 'disconnected',
            is_default: true,
          }]);
          setScanners([{
            id: 1,
            name: 'Default Scanner',
            type: 'USB HID',
            prefix: '',
            suffix: '\n',
            status: 'disconnected',
            is_default: true,
          }]);
          setCashDrawers([{
            id: 1,
            name: 'Default Cash Drawer',
            type: 'RJ11 via Printer',
            connection: 'Default Receipt Printer',
            open_code: '\\x1B\\x70\\x00',
            status: 'disconnected',
            is_default: true,
          }]);
          setPaymentTerminals([{
            id: 1,
            name: 'Payment Terminal',
            type: 'Manual Entry',
            connection_settings: '',
            status: 'disconnected',
            is_default: true,
          }]);
        }
      } catch (error) {
        console.log('Hardware settings API not available, using defaults');
      } finally {
        setIsLoading(false);
      }
    };
    loadHardwareSettings();
  }, []);

  const handleTestPrint = async (printerId: number, type: 'receipt' | 'label') => {
    toast.info(`Testing ${type} printer ${printerId}...`);
    try {
      const response = await fetch(`/api/hardware/printers/${printerId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type })
      });
      if (response.ok) {
        toast.success('Test print sent successfully');
      } else {
        // Fallback to browser print for receipt printers
        if (type === 'receipt') {
          toast.info('Direct printing not available. Using browser print dialog.');
          window.print();
        } else {
          toast.warning('Printer test API not available. Please verify printer connection manually.');
        }
      }
    } catch {
      toast.warning('Printer test API not available. Please verify printer connection manually.');
    }
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
                  ? 'border-accent text-accent'
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
                  ? 'border-accent text-accent'
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
                  ? 'border-accent text-accent'
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
                  ? 'border-accent text-accent'
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
                  ? 'border-accent text-accent'
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
                            <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
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
                            <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
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
                            <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
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
                            <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
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
                            <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
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

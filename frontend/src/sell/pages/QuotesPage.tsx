/**
 * QuotesPage Component
 * 
 * Manage saved quotes/estimates.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Trash2,
  ShoppingCart,
  Clock,
  User,
  ChevronRight,
  AlertCircle,
  Printer,
  Mail,
  X,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useConfig } from '../../config';
import { Button } from '@common/components/atoms/Button';
import { EmptyState } from '@common/components/molecules/EmptyState';

interface QuoteItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  items: QuoteItem[];
  customer: {
    id: string;
    name: string;
  } | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'converted' | 'expired';
}

export function QuotesPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load quotes from localStorage
  useEffect(() => {
    const loadQuotes = () => {
      const stored = JSON.parse(localStorage.getItem('EasySale_quotes') || '[]');
      // Update expired quotes
      const now = new Date();
      const updated = stored.map((q: Quote) => ({
        ...q,
        status: q.status === 'converted' ? 'converted' : 
                new Date(q.expiresAt) < now ? 'expired' : 'pending',
      }));
      setQuotes(updated);
    };
    loadQuotes();
  }, []);

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Delete quote
  const handleDeleteQuote = (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    
    const updated = quotes.filter(q => q.id !== quoteId);
    setQuotes(updated);
    localStorage.setItem('EasySale_quotes', JSON.stringify(updated));
    setSelectedQuote(null);
    setShowDetailModal(false);
  };

  // Convert quote to sale
  const handleConvertToSale = (quote: Quote) => {
    // Mark quote as converted
    const updated = quotes.map(q => 
      q.id === quote.id ? { ...q, status: 'converted' as const } : q
    );
    setQuotes(updated);
    localStorage.setItem('EasySale_quotes', JSON.stringify(updated));
    
    // Navigate to sell page with quote items
    navigate('/sell', { 
      state: { 
        quoteId: quote.id,
        quoteItems: quote.items,
        customerId: quote.customer?.id,
        customerName: quote.customer?.name,
      } 
    });
  };

  // Print quote
  const handlePrintQuote = (quote: Quote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote - ${quote.id}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .totals { text-align: right; }
          .totals .total { font-size: 1.2em; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PRICE QUOTE</h1>
          <p>Quote #: ${quote.id}</p>
        </div>
        <div class="info">
          <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${new Date(quote.expiresAt).toLocaleDateString()}</p>
          ${quote.customer ? `<p><strong>Customer:</strong> ${quote.customer.name}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.unitPrice * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p>Subtotal: ${formatCurrency(quote.subtotal)}</p>
          ${quote.discount > 0 ? `<p>Discount: -${formatCurrency(quote.discount)}</p>` : ''}
          <p>Tax: ${formatCurrency(quote.tax)}</p>
          <p class="total">Total: ${formatCurrency(quote.total)}</p>
        </div>
        <div class="footer">
          <p>This quote is valid for 7 days from the date of issue.</p>
          <p>Prices are subject to change without notice.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning';
      case 'converted': return 'bg-success/20 text-success';
      case 'expired': return 'bg-error/20 text-error';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Quotes</h1>
            <p className="text-text-tertiary text-sm">
              Manage saved quotes and estimates
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<FileText size={18} />}
            onClick={() => navigate('/sell')}
          >
            New Quote
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border-strong rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filteredQuotes.length === 0 ? (
          <EmptyState
            title="No quotes found"
            description={searchQuery ? "Try adjusting your search" : "Create a quote from the Point of Sale page"}
            icon={<FileText size={48} className="opacity-50" />}
            primaryAction={{
              label: 'Create Quote',
              onClick: () => navigate('/sell'),
              icon: <FileText size={18} />,
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-surface border border-border rounded-lg p-4 hover:border-accent transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedQuote(quote);
                  setShowDetailModal(true);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-text-primary">{quote.id}</div>
                    <div className="text-sm text-text-tertiary">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={cn('px-2 py-1 rounded text-xs font-medium', getStatusColor(quote.status))}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </span>
                </div>

                {quote.customer && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <User size={14} />
                    {quote.customer.name}
                  </div>
                )}

                <div className="text-sm text-text-tertiary mb-3">
                  {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Clock size={12} />
                    Expires {new Date(quote.expiresAt).toLocaleDateString()}
                  </div>
                  <div className="font-bold text-text-primary">
                    {formatCurrency(quote.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Detail Modal */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowDetailModal(false)}
          />
          <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Quote {selectedQuote.id}</h2>
                <div className="text-sm text-text-tertiary">
                  Created {new Date(selectedQuote.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Status */}
              <div className="mb-4">
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(selectedQuote.status))}>
                  {selectedQuote.status === 'pending' && 'Pending'}
                  {selectedQuote.status === 'converted' && 'Converted to Sale'}
                  {selectedQuote.status === 'expired' && 'Expired'}
                </span>
              </div>

              {/* Customer */}
              {selectedQuote.customer && (
                <div className="mb-4 p-3 bg-surface-2 rounded-lg">
                  <div className="text-sm text-text-tertiary">Customer</div>
                  <div className="font-medium text-text-primary">{selectedQuote.customer.name}</div>
                </div>
              )}

              {/* Expiration warning */}
              {selectedQuote.status === 'pending' && new Date(selectedQuote.expiresAt) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2">
                  <AlertCircle size={18} className="text-warning" />
                  <span className="text-sm text-warning">
                    Expires {new Date(selectedQuote.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Items */}
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-text-tertiary">Items</div>
                {selectedQuote.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-surface-2 rounded">
                    <div>
                      <div className="text-text-primary">{item.name}</div>
                      <div className="text-xs text-text-tertiary">{item.sku} × {item.quantity}</div>
                    </div>
                    <div className="text-text-primary font-medium">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-border space-y-1">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-error">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedQuote.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-secondary">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedQuote.tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-text-primary pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-surface-2">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => handlePrintQuote(selectedQuote)}
                  className="flex-1 py-2 bg-surface-3 hover:bg-surface-3/80 text-text-primary rounded-lg flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  onClick={() => handleDeleteQuote(selectedQuote.id)}
                  className="flex-1 py-2 bg-surface-3 hover:bg-error text-text-secondary hover:text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
              {selectedQuote.status === 'pending' && (
                <button
                  onClick={() => handleConvertToSale(selectedQuote)}
                  className="w-full py-3 bg-success hover:bg-success/90 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Convert to Sale
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

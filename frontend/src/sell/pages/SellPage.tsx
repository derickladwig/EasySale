import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Receipt,
  Percent,
  Tag,
  ShoppingCart,
  ChevronRight,
  Grid3X3,
  List,
  Scan,
  Check,
  RotateCcw,
  Pause,
  Play,
  Printer,
  Mail,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { toast } from '@common/components/molecules/Toast';
import { useConfig, DynamicIcon } from '../../config';
import { useBranding } from '../../config/brandingProvider';
import { useProductsQuery, Product } from '@domains/product';
import { Customer } from '@domains/customer';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { Alert } from '@common/components/organisms/Alert';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { Stack } from '../../components/ui/Stack';
import { PaymentModal } from '../components/PaymentModal';
import { DiscountModal } from '../components/DiscountModal';
import { CustomerSearchModal } from '../components/CustomerSearchModal';
import { CouponModal } from '../components/CouponModal';
import { ReturnModal } from '../components/ReturnModal';
import { HoldModal } from '../components/HoldModal';
import { useCreateSale } from '../hooks/useSales';
import { useTaxRulesQuery, getApplicableTaxRate } from '../../settings/hooks/useTaxRulesQuery';

interface CartItem {
  product: Product;
  quantity: number;
  priceOverride?: number; // Optional price override for this line item
  itemDiscount?: number; // Optional discount amount for this line item
  discountReason?: string; // Reason for the discount
}

export function SellPage() {
  const { categories, formatCurrency } = useConfig();
  const { branding } = useBranding();

  // Fetch products from API
  const { data: productsResponse, isLoading, error } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  // Fetch tax rules
  const { data: taxRules = [] } = useTaxRulesQuery();

  // Sale mutation
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState<{ 
    transactionNumber: string; 
    total: number; 
    subtotal: number;
    tax: number;
    discount: number;
    items: CartItem[]; 
    customer: Customer | null; 
    paymentMethod: string;
    amountTendered?: number;
  } | null>(null);
  
  // Check for customer passed from navigation
  const location = useLocation();
  useEffect(() => {
    const state = location.state as { customerId?: string; customerName?: string } | null;
    if (state?.customerId && state?.customerName) {
      setSelectedCustomer({
        id: state.customerId,
        name: state.customerName,
        email: null,
        phone: null,
        pricing_tier: 'retail',
        loyalty_points: 0,
        store_credit: 0,
        credit_limit: null,
        credit_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [location.state]);
  
  // Held transactions
  const [heldTransactions, setHeldTransactions] = useState<Array<{
    id: string;
    cart: CartItem[];
    customer: Customer | null;
    discount: number;
    couponCode: string | null;
    heldAt: Date;
    note: string;
  }>>([]);

  // Build category list from config
  const categoryOptions = ['All', ...categories.map((cat) => cat.id)];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart functions with stock validation
  const addToCart = (product: Product) => {
    const currentInCart = cart.find((item) => item.product.id === product.id)?.quantity || 0;
    const availableStock = product.quantityOnHand ?? Infinity;
    
    if (currentInCart >= availableStock) {
      toast.warning(`Only ${availableStock} ${product.name} available in stock`);
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item && delta > 0) {
        const availableStock = item.product.quantityOnHand ?? Infinity;
        if (item.quantity >= availableStock) {
          toast.warning(`Only ${availableStock} ${item.product.name} available in stock`);
          return prev;
        }
      }
      return prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Update line item price or discount
  const updateLineItem = (productId: string, updates: { priceOverride?: number; itemDiscount?: number; discountReason?: string }) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomer(null);
    setCouponCode(null);
  };

  // Calculate line item price (with override support)
  const getLineItemPrice = (item: CartItem): number => {
    const basePrice = item.priceOverride ?? item.product.unitPrice ?? 0;
    const lineDiscount = item.itemDiscount ?? 0;
    return Math.max(0, basePrice - lineDiscount);
  };

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + getLineItemPrice(item) * item.quantity,
    0
  );
  const discountedSubtotal = subtotal - discount;
  
  // Get applicable tax rate from configured rules
  const taxRate = getApplicableTaxRate(taxRules) / 100; // Convert percentage to decimal
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

  // Handle payment completion
  const handlePayment = async (paymentMethod: 'cash' | 'card' | 'other') => {
    try {
      const saleItems = [...cart]; // Store cart before clearing
      const saleCustomer = selectedCustomer;
      
      const result = await createSale.mutateAsync({
        customer_id: selectedCustomer?.id,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.unitPrice || 0,
        })),
        payment_method: paymentMethod,
        discount_amount: discount > 0 ? discount : undefined,
      });

      // Store sale info for receipt with full details
      setLastSale({ 
        transactionNumber: result.transaction_number, 
        total: result.total_amount,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        items: saleItems,
        customer: saleCustomer,
        paymentMethod,
      });
      setShowPaymentModal(false);
      setShowReceiptModal(true); // Show receipt modal
      clearCart();
    } catch {
      // Error is handled by React Query
    }
  };

  // Print receipt - uses branding API for store info
  const handlePrintReceipt = () => {
    if (!lastSale) return;
    
    // Get store info from branding API, fall back to localStorage, then defaults
    const storeName = branding?.company?.name || branding?.store?.name || localStorage.getItem('store_name') || 'Store';
    const storeAddress = localStorage.getItem('store_address') || '';
    const storePhone = localStorage.getItem('store_phone') || '';
    const receiptHeader = branding?.receipts?.header || '';
    const receiptFooter = branding?.receipts?.footer || localStorage.getItem('receipt_footer') || 'Thank you for your purchase!';
    const showLogo = branding?.receipts?.show_logo ?? false;
    const logoUrl = branding?.company?.logo_url || branding?.company?.logo_dark_url;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${lastSale.transactionNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; color: #000; background: #fff; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
          .logo { max-width: 150px; max-height: 60px; margin-bottom: 10px; }
          .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .store-info { font-size: 11px; color: #555; }
          .receipt-header { font-size: 10px; color: #555; margin-top: 5px; white-space: pre-line; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
          .item-details { font-size: 11px; color: #555; margin-left: 10px; }
          .subtotals { border-top: 1px dashed #333; margin-top: 10px; padding-top: 10px; }
          .total { font-weight: bold; font-size: 16px; margin-top: 5px; }
          .payment-info { margin-top: 10px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 1px dashed #333; padding-top: 10px; white-space: pre-line; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${storeName}" class="logo" />` : ''}
          <div class="store-name">${storeName}</div>
          ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
          ${storePhone ? `<div class="store-info">${storePhone}</div>` : ''}
          ${receiptHeader ? `<div class="receipt-header">${receiptHeader}</div>` : ''}
          <div style="margin-top: 10px;">
            <div>Transaction: ${lastSale.transactionNumber}</div>
            <div>${new Date().toLocaleString()}</div>
            ${lastSale.customer ? `<div>Customer: ${lastSale.customer.name}</div>` : ''}
          </div>
        </div>
        <div class="items">
          ${lastSale.items.map(item => {
            const attrs = item.product.attributes || {};
            const attrStr = Object.entries(attrs).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ');
            const lineTotal = (item.product.unitPrice || 0) * item.quantity;
            return `
              <div class="item">
                <span>${item.product.name}</span>
                <span>${formatCurrency(lineTotal)}</span>
              </div>
              <div class="item-details">
                ${item.quantity} x ${formatCurrency(item.product.unitPrice || 0)}
                ${attrStr ? ` | ${attrStr}` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="subtotals">
          <div class="item">
            <span>Subtotal</span>
            <span>${formatCurrency(lastSale.subtotal || lastSale.total)}</span>
          </div>
          ${lastSale.tax ? `
          <div class="item">
            <span>Tax</span>
            <span>${formatCurrency(lastSale.tax)}</span>
          </div>
          ` : ''}
          ${lastSale.discount ? `
          <div class="item">
            <span>Discount</span>
            <span>-${formatCurrency(lastSale.discount)}</span>
          </div>
          ` : ''}
          <div class="item total">
            <span>TOTAL</span>
            <span>${formatCurrency(lastSale.total)}</span>
          </div>
        </div>
        <div class="payment-info">
          <div class="item">
            <span>Payment Method</span>
            <span>${lastSale.paymentMethod.toUpperCase()}</span>
          </div>
          ${lastSale.amountTendered ? `
          <div class="item">
            <span>Amount Tendered</span>
            <span>${formatCurrency(lastSale.amountTendered)}</span>
          </div>
          <div class="item">
            <span>Change</span>
            <span>${formatCurrency(lastSale.amountTendered - lastSale.total)}</span>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>${receiptFooter}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Email receipt
  const handleEmailReceipt = async () => {
    if (!lastSale) return;
    
    // Check if customer has email
    if (!lastSale.customer?.email) {
      toast.warning('No customer email available. Please add a customer with email to send receipt.');
      return;
    }
    
    try {
      // In production, this would call an API to send email
      const response = await fetch('/api/receipts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          transaction_number: lastSale.transactionNumber,
          email: lastSale.customer.email,
          total: lastSale.total,
        }),
      });
      
      if (response.ok) {
        toast.success(`Receipt sent to ${lastSale.customer.email}`);
      } else {
        throw new Error('Failed to send email');
      }
    } catch {
      // Fallback message if API not available
      toast.info(`Email receipt to ${lastSale.customer.email} requires backend email service configuration.`);
    }
  };

  // Save as quote
  const handleSaveAsQuote = () => {
    if (cart.length === 0) return;
    
    const quote = {
      id: `Q-${Date.now()}`,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.unitPrice || 0,
      })),
      customer: selectedCustomer,
      subtotal,
      discount,
      tax,
      total,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending' as const,
    };
    
    // Save to localStorage (in production, this would be an API call)
    const quotes = JSON.parse(localStorage.getItem('EasySale_quotes') || '[]');
    quotes.push(quote);
    localStorage.setItem('EasySale_quotes', JSON.stringify(quotes));
    
    // Show success and clear cart
    toast.success(`Quote ${quote.id} saved successfully! Valid for 7 days.`);
    clearCart();
  };

  // Handle discount application
  const handleApplyDiscount = (amount: number) => {
    setDiscount(amount);
    setCouponCode(null); // Clear coupon if manual discount applied
  };

  // Handle coupon application
  const handleApplyCoupon = (discountAmount: number, code: string) => {
    setDiscount(discountAmount);
    setCouponCode(code);
  };

  // Hold/suspend transaction
  const handleHoldTransaction = (note: string) => {
    if (cart.length === 0) return;
    
    const heldTransaction = {
      id: `hold-${Date.now()}`,
      cart: [...cart],
      customer: selectedCustomer,
      discount,
      couponCode,
      heldAt: new Date(),
      note,
    };
    
    setHeldTransactions(prev => [...prev, heldTransaction]);
    
    // Save to localStorage for persistence
    const stored = JSON.parse(localStorage.getItem('EasySale_held_transactions') || '[]');
    stored.push(heldTransaction);
    localStorage.setItem('EasySale_held_transactions', JSON.stringify(stored));
    
    clearCart();
    setShowHoldModal(false);
  };

  // Resume held transaction
  const handleResumeTransaction = (heldId: string) => {
    const held = heldTransactions.find(h => h.id === heldId);
    if (!held) return;
    
    // If current cart has items, hold it first
    if (cart.length > 0) {
      handleHoldTransaction('Auto-held when resuming another transaction');
    }
    
    setCart(held.cart);
    setSelectedCustomer(held.customer);
    setDiscount(held.discount);
    setCouponCode(held.couponCode);
    
    // Remove from held list
    setHeldTransactions(prev => prev.filter(h => h.id !== heldId));
    
    // Update localStorage
    const stored = JSON.parse(localStorage.getItem('EasySale_held_transactions') || '[]');
    const updated = stored.filter((h: { id: string }) => h.id !== heldId);
    localStorage.setItem('EasySale_held_transactions', JSON.stringify(updated));
    
    setShowHoldModal(false);
  };

  // Delete held transaction
  const handleDeleteHeld = (heldId: string) => {
    setHeldTransactions(prev => prev.filter(h => h.id !== heldId));
    
    const stored = JSON.parse(localStorage.getItem('EasySale_held_transactions') || '[]');
    const updated = stored.filter((h: { id: string }) => h.id !== heldId);
    localStorage.setItem('EasySale_held_transactions', JSON.stringify(updated));
  };

  // Load held transactions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('EasySale_held_transactions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHeldTransactions(parsed.map((h: { heldAt: string }) => ({
          ...h,
          heldAt: new Date(h.heldAt),
        })));
      } catch {
        // Invalid data, clear it
        localStorage.removeItem('EasySale_held_transactions');
      }
    }
  }, []);

  // Cart persistence - load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('EasySale_current_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed.cart?.length > 0) {
          setCart(parsed.cart);
          setDiscount(parsed.discount || 0);
          setCouponCode(parsed.couponCode || null);
        }
      } catch {
        localStorage.removeItem('EasySale_current_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('EasySale_current_cart', JSON.stringify({
        cart,
        discount,
        couponCode,
        savedAt: new Date().toISOString(),
      }));
    } else {
      localStorage.removeItem('EasySale_current_cart');
    }
  }, [cart, discount, couponCode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" variant="primary" text="Loading products..." centered />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
        </div>
        <div className="max-w-md mx-auto py-8">
          <Alert
            variant="error"
            title="Failed to load products"
            description={
              error.message || 'An error occurred while loading products. Please try again.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Success Banner */}
      {lastSale && !showReceiptModal && (
        <div className="bg-success text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={20} />
            <span>
              Sale completed! Transaction #{lastSale.transactionNumber} - {formatCurrency(lastSale.total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-1"
            >
              <Receipt size={16} />
              View Receipt
            </button>
            <button
              onClick={() => setLastSale(null)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastSale && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowReceiptModal(false)}
          />
          <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold text-text-primary">Receipt</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-center mb-4 pb-4 border-b border-border">
                <div className="text-2xl font-bold text-success mb-1">
                  <Check className="inline mr-2" size={24} />
                  Sale Complete!
                </div>
                <div className="text-text-secondary">
                  Transaction #{lastSale.transactionNumber}
                </div>
                <div className="text-sm text-text-tertiary">
                  {new Date().toLocaleString()}
                </div>
              </div>
              
              {lastSale.customer && (
                <div className="mb-4 p-3 bg-surface-2 rounded-lg">
                  <div className="text-sm text-text-tertiary">Customer</div>
                  <div className="font-medium text-text-primary">{lastSale.customer.name}</div>
                </div>
              )}
              
              <div className="space-y-2 mb-4">
                {lastSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-text-secondary">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>{formatCurrency((item.product.unitPrice || 0) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-xl font-bold text-text-primary">
                  <span>Total</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-text-tertiary mt-1">
                  <span>Payment Method</span>
                  <span className="capitalize">{lastSale.paymentMethod}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-surface-2 flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={handleEmailReceipt}
                className="flex-1 py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Mail size={18} />
                Email
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setLastSale(null);
                }}
                className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-medium rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Point of Sale</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHoldModal(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              heldTransactions.length > 0
                ? "bg-warning/20 text-warning hover:bg-warning/30"
                : "bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary"
            )}
          >
            <Pause size={18} />
            <span>Hold{heldTransactions.length > 0 ? ` (${heldTransactions.length})` : ''}</span>
          </button>
          <button
            onClick={() => setShowReturnModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            <span>Returns</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Product Catalog */}
      <div className="flex-1 flex flex-col bg-bg-primary border-r border-border-subtle min-h-0">
        {/* Search and filters */}
        <div className="p-4 border-b border-border-subtle">
          <Stack gap="3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Category tabs and view toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryOptions.map((categoryId) => {
                  const category = categories.find((c) => c.id === categoryId);
                  const label = categoryId === 'All' ? 'All' : category?.name || categoryId;

                  return (
                    <button
                      key={categoryId}
                      onClick={() => setSelectedCategory(categoryId)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                        selectedCategory === categoryId
                          ? 'bg-accent text-white'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                      )}
                    >
                      {category?.icon && <DynamicIcon name={category.icon} size={16} />}
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'grid' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'list' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </Stack>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {products.length === 0 ? (
            <EmptyState
              title="Scan an item to begin"
              description="Use a barcode scanner or search for products to add them to the sale"
              icon={<Scan size={48} />}
              primaryAction={{
                label: 'Focus Search',
                onClick: () => {
                  const searchInput = document.querySelector(
                    'input[type="search"]'
                  ) as HTMLInputElement;
                  searchInput?.focus();
                },
                icon: <Search size={18} />,
              }}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description={
                searchQuery
                  ? `No products match "${searchQuery}"`
                  : `No products in ${selectedCategory} category`
              }
              icon={<Search size={48} />}
              primaryAction={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                },
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-surface-2 border border-border rounded-lg p-4 text-left hover:border-accent hover:bg-surface-3 transition-colors group"
                >
                  <div className="aspect-square bg-surface-3 rounded-lg mb-3 flex items-center justify-center">
                    {(() => {
                      const category = categories.find((c) => c.id === product.category);
                      return category?.icon ? (
                        <DynamicIcon
                          name={category.icon}
                          size={32}
                          className="text-text-muted group-hover:text-text-secondary"
                        />
                      ) : (
                        <DynamicIcon
                          name="Package"
                          size={32}
                          className="text-text-muted group-hover:text-text-secondary"
                        />
                      );
                    })()}
                  </div>
                  <h3 className="font-medium text-text-primary text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-text-secondary mb-2">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-accent">
                      {formatCurrency(product.unitPrice || 0)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        product.quantityOnHand > 20
                          ? 'bg-success/20 text-success'
                          : product.quantityOnHand > 5
                            ? 'bg-warning/20 text-warning'
                            : 'bg-error/20 text-error'
                      )}
                    >
                      {product.quantityOnHand} in stock
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-3 flex items-center gap-4 hover:border-accent hover:bg-surface-3 transition-colors"
                >
                  <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const category = categories.find((c) => c.id === product.category);
                      return category?.icon ? (
                        <DynamicIcon name={category.icon} size={20} className="text-text-muted" />
                      ) : (
                        <DynamicIcon name="Package" size={20} className="text-text-muted" />
                      );
                    })()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{product.name}</h3>
                    <p className="text-xs text-text-secondary">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">
                      {formatCurrency(product.unitPrice || 0)}
                    </div>
                    <div className="text-xs text-text-secondary">{product.quantityOnHand} in stock</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-[420px] flex flex-col bg-surface-2 min-h-0">
        {/* Customer selection */}
        <div className="p-4 border-b border-border-subtle">
          <button
            onClick={() => setShowCustomerModal(true)}
            className="w-full flex items-center gap-3 p-3 bg-surface-3 rounded-lg hover:bg-surface-3/80 transition-colors"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              selectedCustomer ? "bg-accent/20" : "bg-surface-2"
            )}>
              {selectedCustomer ? (
                <span className="text-accent font-medium">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="text-text-secondary" size={20} />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-text-primary">
                {selectedCustomer?.name || 'Walk-in Customer'}
              </div>
              <div className="text-xs text-text-secondary">
                {selectedCustomer ? selectedCustomer.email || selectedCustomer.phone || 'Tap to change' : 'Tap to select customer'}
              </div>
            </div>
            <ChevronRight className="text-text-secondary" size={20} />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Cart is empty</p>
              <p className="text-sm">Add products to start a sale</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                const effectivePrice = getLineItemPrice(item);
                const hasOverride = item.priceOverride !== undefined || item.itemDiscount !== undefined;
                const originalPrice = item.product.unitPrice || 0;
                
                return (
                  <div
                    key={item.product.id}
                    className="bg-surface-3 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">{item.product.name}</h4>
                        <div className="flex items-center gap-2 text-sm">
                          {hasOverride ? (
                            <>
                              <span className="text-text-muted line-through">{formatCurrency(originalPrice)}</span>
                              <span className="text-success">{formatCurrency(effectivePrice)}</span>
                            </>
                          ) : (
                            <span className="text-text-secondary">{formatCurrency(originalPrice)} each</span>
                          )}
                        </div>
                        {/* Display product attributes (size, color, brand, etc.) */}
                        {item.product.attributes && Object.keys(item.product.attributes).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.product.attributes).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="text-xs px-1.5 py-0.5 bg-surface-2 rounded text-text-tertiary">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.discountReason && (
                          <p className="text-xs text-warning mt-1">{item.discountReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 flex items-center justify-center text-text-primary transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-medium text-text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 flex items-center justify-center text-text-primary transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="w-20 text-right">
                        <div className="font-bold text-text-primary">
                          {formatCurrency(effectivePrice * item.quantity)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-text-secondary hover:text-error transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {/* Line item edit controls */}
                    <div className="mt-2 pt-2 border-t border-border-subtle flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newPrice = prompt(`Enter new price for ${item.product.name}:`, String(effectivePrice));
                          if (newPrice !== null) {
                            const parsed = parseFloat(newPrice);
                            if (!isNaN(parsed) && parsed >= 0) {
                              updateLineItem(item.product.id, { priceOverride: parsed });
                            }
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-surface-1 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Price Override
                      </button>
                      <button
                        onClick={() => {
                          const discountAmt = prompt(`Enter discount amount for ${item.product.name}:`, String(item.itemDiscount || 0));
                          if (discountAmt !== null) {
                            const parsed = parseFloat(discountAmt);
                            if (!isNaN(parsed) && parsed >= 0) {
                              const reason = parsed > 0 ? prompt('Reason for discount (optional):') || undefined : undefined;
                              updateLineItem(item.product.id, { 
                                itemDiscount: parsed > 0 ? parsed : undefined,
                                discountReason: reason 
                              });
                            }
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-surface-1 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Line Discount
                      </button>
                      {hasOverride && (
                        <button
                          onClick={() => updateLineItem(item.product.id, { 
                            priceOverride: undefined, 
                            itemDiscount: undefined, 
                            discountReason: undefined 
                          })}
                          className="text-xs px-2 py-1 rounded bg-error/20 hover:bg-error/30 text-error transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart actions */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border-subtle space-y-3">
            {/* Quick actions */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowDiscountModal(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors",
                  discount > 0 && !couponCode
                    ? "bg-accent text-white" 
                    : "bg-surface-3 text-text-secondary hover:bg-surface-3/80 hover:text-text-primary"
                )}
              >
                <Percent size={18} />
                <span className="text-sm">{discount > 0 && !couponCode ? formatCurrency(discount) : 'Discount'}</span>
              </button>
              <button 
                onClick={() => setShowCouponModal(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors",
                  couponCode
                    ? "bg-accent text-white" 
                    : "bg-surface-3 text-text-secondary hover:bg-surface-3/80 hover:text-text-primary"
                )}
              >
                <Tag size={18} />
                <span className="text-sm">{couponCode || 'Coupon'}</span>
              </button>
              <button
                onClick={clearCart}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-3 rounded-lg text-text-secondary hover:bg-error hover:text-white transition-colors"
              >
                <Trash2 size={18} />
                <span className="text-sm">Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Totals and payment */}
        <div className="p-4 bg-bg-primary border-t border-border-subtle">
          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-error">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-text-primary pt-2 border-t border-border-subtle">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment buttons */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-success hover:bg-success/90 disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-white font-medium transition-colors"
            >
              <Banknote size={24} />
              <span className="text-sm">Cash</span>
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-accent hover:bg-accent-hover disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-white font-medium transition-colors"
            >
              <CreditCard size={24} />
              <span className="text-sm">Card</span>
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-4 bg-surface-3 hover:bg-surface-3/80 disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-text-primary font-medium transition-colors"
            >
              <Receipt size={24} />
              <span className="text-sm">Other</span>
            </button>
          </div>
          
          {/* Save as Quote button */}
          <button
            onClick={handleSaveAsQuote}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-2 hover:bg-surface-3 disabled:bg-surface-3 disabled:text-text-muted rounded-lg text-text-secondary hover:text-text-primary font-medium transition-colors border border-border"
          >
            <FileText size={18} />
            <span>Save as Quote</span>
          </button>
        </div>
      </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onComplete={handlePayment}
        cart={cart}
        subtotal={discountedSubtotal}
        tax={tax}
        total={total}
        formatCurrency={formatCurrency}
        isProcessing={createSale.isPending}
      />

      {/* Discount Modal */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        subtotal={subtotal}
        formatCurrency={formatCurrency}
      />

      {/* Customer Search Modal */}
      <CustomerSearchModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={setSelectedCustomer}
        selectedCustomerId={selectedCustomer?.id}
      />

      {/* Coupon Modal */}
      <CouponModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        onApply={handleApplyCoupon}
        subtotal={subtotal}
        formatCurrency={formatCurrency}
      />

      {/* Return Modal */}
      <ReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onComplete={() => {
          // Show success notification after return is processed
          toast.success('Return processed successfully. Inventory has been restored.');
        }}
      />

      {/* Hold Modal */}
      <HoldModal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        onHold={handleHoldTransaction}
        onResume={handleResumeTransaction}
        onDelete={handleDeleteHeld}
        heldTransactions={heldTransactions}
        currentCartHasItems={cart.length > 0}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

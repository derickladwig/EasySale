/**
 * CustomerSearchModal Component
 * 
 * Modal for searching and selecting customers during checkout.
 */

import { useState } from 'react';
import { X, Search, User, Plus, Check, Loader2 } from 'lucide-react';
import { useCustomersQuery, Customer } from '@domains/customer';
import { EmptyState } from '@common/components/molecules/EmptyState';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
  selectedCustomerId?: string | null;
}

export function CustomerSearchModal({
  isOpen,
  onClose,
  onSelect,
  selectedCustomerId,
}: CustomerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: customersResponse, isLoading } = useCustomersQuery();
  const customers: Customer[] = Array.isArray(customersResponse) ? customersResponse : [];

  if (!isOpen) return null;

  // Filter customers
  const filteredCustomers = customers.filter((customer: Customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  });

  const handleSelectWalkIn = () => {
    onSelect(null);
    onClose();
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Select Customer</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>
        </div>

        {/* Walk-in option */}
        <div className="p-4 border-b border-border">
          <button
            onClick={handleSelectWalkIn}
            className="w-full flex items-center gap-3 p-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors"
          >
            <div className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center">
              <User className="text-text-secondary" size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-text-primary">Walk-in Customer</div>
              <div className="text-xs text-text-secondary">No customer record</div>
            </div>
            {!selectedCustomerId && (
              <Check className="text-accent" size={20} />
            )}
          </button>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-text-tertiary" size={32} />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <EmptyState
                title="No customers found"
                description={searchQuery ? `No customers match "${searchQuery}"` : 'No customers in database'}
                icon={<User size={48} className="opacity-50" />}
              />
              <button
                onClick={() => {
                  window.open('/customers?action=create', '_blank');
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Plus size={16} />
                Create New Customer
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.slice(0, 50).map((customer: Customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full flex items-center gap-3 p-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent font-medium">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">{customer.name}</div>
                    <div className="text-xs text-text-secondary truncate">
                      {customer.email || customer.phone || 'No contact info'}
                    </div>
                  </div>
                  {customer.pricing_tier && (
                    <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded">
                      {customer.pricing_tier}
                    </span>
                  )}
                  {selectedCustomerId === customer.id && (
                    <Check className="text-accent" size={20} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

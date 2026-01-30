import { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Star,
  DollarSign,
  Calendar,
  ChevronRight,
  User,
  Building,
  Tag,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { EmptyDetailPane } from '@common/components/molecules/EmptyDetailPane';
import { toast } from '@common/utils/toast';
import { useCustomersQuery, useCreateCustomerMutation, transformCustomer } from '@domains/customer/hooks';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { DeleteCustomerDialog } from '../components/DeleteCustomerDialog';
import { Button } from '@common/components/atoms/Button';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'individual' | 'business';
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  orderCount: number;
  lastOrder: string;
  address?: string;
  company?: string;
}

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

function CreateCustomerModal({ isOpen, onClose, onCustomerCreated }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const createCustomerMutation = useCreateCustomerMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await createCustomerMutation.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        // Store ID is determined by the backend based on user's session/tenant
      });
      
      // Transform backend response to frontend format
      const customer = transformCustomer(response);
      onCustomerCreated(customer);
      toast.success('Customer created successfully');
      onClose();
      setFormData({ name: '', email: '', phone: '', address: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create customer';
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Create New Customer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createCustomerMutation.isPending}
              loading={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const tierColors = {
  standard: 'bg-surface-overlay text-text-secondary',
  silver: 'bg-dark-400 text-dark-900',
  gold: 'bg-warning-500/20 text-warning-400',
  platinum: 'bg-primary-500/20 text-primary-400',
};

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'business'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch customers from backend
  const { data: customersData = [], isLoading, error } = useCustomersQuery();
  
  // Transform backend data to frontend format
  const customers = customersData.map(transformCustomer);

  const handleCustomerCreated = (_newCustomer: Customer) => {
    // React Query will automatically refetch the list
    // Just close the modal and show success
  };

  const handleCustomerUpdated = () => {
    // React Query will automatically refetch the list
    setIsEditModalOpen(false);
  };

  const handleCustomerDeleted = () => {
    // React Query will automatically refetch the list
    setSelectedCustomer(null);
    setIsDeleteDialogOpen(false);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-text-tertiary">Loading customers...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-error-500" />
          <h2 className="text-xl font-semibold text-text-secondary">Failed to load customers</h2>
          <p className="text-text-tertiary">{error?.message || 'An error occurred'}</p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);
    const matchesType = filterType === 'all' || customer.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: customers.length,
    business: customers.filter((c) => c.type === 'business').length,
    individual: customers.filter((c) => c.type === 'individual').length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
  };

  // Handle empty state - no customers at all
  if (customers.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background-primary">
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
              <p className="text-text-tertiary text-sm">Manage customer profiles and loyalty</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <EmptyState
            title="No customers found"
            description="Start building your customer base by creating your first customer profile"
            icon={<Users size={48} />}
            primaryAction={{
              label: 'Create customer',
              onClick: () => setIsCreateModalOpen(true),
              icon: <Plus size={18} />,
            }}
            secondaryAction={{
              label: 'Import customers',
              onClick: () => toast.info('Customer import is available through the Admin setup wizard. Contact your administrator for bulk imports.'),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background-primary">
      {/* Left Panel - Customer List */}
      <div className="flex-1 flex flex-col min-h-0 border-r border-border">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
              <p className="text-text-tertiary text-sm">Manage customer profiles and loyalty</p>
            </div>
            <Button 
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add Customer
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-surface-base rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                <Users size={14} />
                Total
              </div>
              <div className="text-xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                <Building size={14} />
                Business
              </div>
              <div className="text-xl font-bold text-white">{stats.business}</div>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                <User size={14} />
                Individual
              </div>
              <div className="text-xl font-bold text-white">{stats.individual}</div>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                <DollarSign size={14} />
                Revenue
              </div>
              <div className="text-xl font-bold text-white">
                ${stats.totalRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                size={20}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-1 bg-surface-base rounded-lg p-1">
              {(['all', 'individual', 'business'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize',
                    filterType === type
                      ? 'bg-surface-elevated text-white'
                      : 'text-text-tertiary hover:text-white'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={cn(
                'w-full p-4 flex items-center gap-4 border-b border-border text-left transition-colors',
                selectedCustomer?.id === customer.id ? 'bg-surface-base' : 'hover:bg-surface-base/50'
              )}
            >
              <div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center flex-shrink-0">
                {customer.type === 'business' ? (
                  <Building className="text-text-tertiary" size={20} />
                ) : (
                  <User className="text-text-tertiary" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-primary truncate">{customer.name}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      tierColors[customer.tier]
                    )}
                  >
                    {customer.tier}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-tertiary">
                  <span>{customer.orderCount} orders</span>
                  <span>•</span>
                  <span>${customer.totalSpent.toLocaleString()}</span>
                </div>
              </div>
              <ChevronRight className="text-text-disabled flex-shrink-0" size={20} />
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Customer Details */}
      <div className="w-full lg:w-[400px] bg-surface-base flex flex-col min-h-0">
        {selectedCustomer ? (
          <>
            {/* Customer header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center">
                  {selectedCustomer.type === 'business' ? (
                    <Building className="text-text-tertiary" size={28} />
                  ) : (
                    <User className="text-text-tertiary" size={28} />
                  )}
                </div>
                <button className="p-2 text-text-tertiary hover:text-white hover:bg-surface-elevated rounded-lg transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{selectedCustomer.name}</h2>
              {selectedCustomer.company && (
                <p className="text-text-tertiary text-sm mb-2">{selectedCustomer.company}</p>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    tierColors[selectedCustomer.tier]
                  )}
                >
                  <Star size={12} className="inline mr-1" />
                  {selectedCustomer.tier.charAt(0).toUpperCase() +
                    selectedCustomer.tier.slice(1)}{' '}
                  Member
                </span>
                <span className="px-2 py-1 bg-surface-elevated rounded text-xs text-text-secondary capitalize">
                  {selectedCustomer.type}
                </span>
              </div>
            </div>

            {/* Customer details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                  Contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <Mail size={18} className="text-text-tertiary" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-secondary">
                    <Phone size={18} className="text-text-tertiary" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <MapPin size={18} className="text-text-tertiary" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                  Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-elevated rounded-lg p-3">
                    <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                      <DollarSign size={14} />
                      Total Spent
                    </div>
                    <div className="text-lg font-bold text-white">
                      ${selectedCustomer.totalSpent.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-3">
                    <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                      <ShoppingBag size={14} />
                      Orders
                    </div>
                    <div className="text-lg font-bold text-white">
                      {selectedCustomer.orderCount}
                    </div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-3">
                    <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                      <Tag size={14} />
                      Avg. Order
                    </div>
                    <div className="text-lg font-bold text-white">
                      ${(selectedCustomer.totalSpent / selectedCustomer.orderCount).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-3">
                    <div className="flex items-center gap-2 text-text-tertiary text-xs mb-1">
                      <Calendar size={14} />
                      Last Order
                    </div>
                    <div className="text-lg font-bold text-white">
                      {new Date(selectedCustomer.lastOrder).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent orders placeholder */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                  Recent Orders
                </h3>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-surface-elevated rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-text-secondary font-medium">Order #{1000 + i}</div>
                        <div className="text-xs text-text-tertiary">Jan {10 - i}, 2026</div>
                      </div>
                      <div className="text-right">
                        <div className="text-text-secondary font-medium">
                          ${(150 - i * 10).toFixed(2)}
                        </div>
                        <div className="text-xs text-success-400">Completed</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary"
                  leftIcon={<Edit2 size={16} />}
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit
                </Button>
                <Button 
                  variant="danger"
                  leftIcon={<Trash2 size={16} />}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              </div>
              <Button variant="primary" fullWidth>
                New Sale
              </Button>
            </div>
          </>
        ) : (
          <EmptyDetailPane
            message="Select a customer to view details"
            shortcuts={[
              { key: 'F3', description: 'Search customers' },
              { key: 'Ctrl+N', description: 'Create new customer' },
              { key: '↑↓', description: 'Navigate list' },
            ]}
          />
        )}
        
        <CreateCustomerModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCustomerCreated={handleCustomerCreated}
        />

        {selectedCustomer && (
          <>
            <EditCustomerModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              customer={selectedCustomer}
              onCustomerUpdated={handleCustomerUpdated}
            />

            <DeleteCustomerDialog
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              customer={selectedCustomer}
              onCustomerDeleted={handleCustomerDeleted}
            />
          </>
        )}
      </div>
    </div>
  );
}

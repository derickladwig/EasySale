import React, { useState, useMemo } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  Package, 
  Plus, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { useLayaways, useOverdueLayaways, useCompleteLayaway, useCancelLayaway, useCreateLayaway, useLayawayPayment } from '../hooks';

// Helper to get default due date (30 days from now)
const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

const LayawayTab: React.FC = () => {
  const defaultDueDate = useMemo(() => getDefaultDueDate(), []);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [newLayaway, setNewLayaway] = useState({
    customerId: '',
    customerName: '',
    items: [] as Array<{ productId: string; name: string; quantity: number; price: number }>,
    depositAmount: '',
    dueDate: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data: layaways, isLoading, refetch } = useLayaways({ status: statusFilter || undefined });
  const { data: overdueLayaways } = useOverdueLayaways();
  const completeMutation = useCompleteLayaway();
  const cancelMutation = useCancelLayaway();
  const createMutation = useCreateLayaway();
  const paymentMutation = useLayawayPayment();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-error" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Clock className="w-4 h-4 text-primary-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success';
      case 'cancelled': return 'bg-error/20 text-error';
      case 'overdue': return 'bg-warning/20 text-warning';
      default: return 'bg-primary-500/20 text-primary-400';
    }
  };

  const handleCreateLayaway = () => {
    if (!newLayaway.customerName || !newLayaway.depositAmount) return;
    
    createMutation.mutate({
      customerId: newLayaway.customerId || `cust-${Date.now()}`,
      customerName: newLayaway.customerName,
      items: newLayaway.items.length > 0 ? newLayaway.items : [
        { productId: 'placeholder', name: 'Items to be added', quantity: 1, price: 0 }
      ],
      depositAmount: parseFloat(newLayaway.depositAmount),
      dueDate: newLayaway.dueDate || defaultDueDate,
    }, {
      onSuccess: () => {
        setShowCreateForm(false);
        setNewLayaway({
          customerId: '',
          customerName: '',
          items: [],
          depositAmount: '',
          dueDate: '',
        });
      }
    });
  };

  const handlePayment = (layawayId: string) => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;
    
    paymentMutation.mutate({
      id: layawayId,
      amount,
      paymentMethod,
    }, {
      onSuccess: () => {
        setShowPaymentForm(null);
        setPaymentAmount('');
        setPaymentMethod('cash');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {overdueLayaways && overdueLayaways.length > 0 && (
        <Card>
          <div className="p-4 bg-warning/10 border-l-4 border-warning">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  {overdueLayaways.length} Overdue Layaway{overdueLayaways.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-text-secondary">
                  Total balance due: ${overdueLayaways.reduce((sum, l) => sum + l.balanceDue, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">New Layaway Plan</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newLayaway.customerName}
                  onChange={(e) => setNewLayaway(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Customer ID (optional)</label>
                <input
                  type="text"
                  value={newLayaway.customerId}
                  onChange={(e) => setNewLayaway(prev => ({ ...prev, customerId: e.target.value }))}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Initial Deposit *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="number"
                    value={newLayaway.depositAmount}
                    onChange={(e) => setNewLayaway(prev => ({ ...prev, depositAmount: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Due Date</label>
                <input
                  type="date"
                  value={newLayaway.dueDate || defaultDueDate}
                  onChange={(e) => setNewLayaway(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleCreateLayaway}
                disabled={createMutation.isPending || !newLayaway.customerName || !newLayaway.depositAmount}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Layaway'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Layaway Plans</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="overdue">Overdue</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4" />
              New Layaway
            </Button>
          </div>
        </div>
      </Card>

      {/* Layaway List */}
      <Card>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !layaways || layaways.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No layaway plans found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                Create your first layaway
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {layaways.map((layaway) => (
                <div key={layaway.id}>
                  <div className="p-4 bg-surface-elevated rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(layaway.status)}
                      <div>
                        <div className="font-medium text-text-primary">{layaway.customerName}</div>
                        <div className="text-sm text-text-tertiary">
                          {layaway.items.length} item{layaway.items.length > 1 ? 's' : ''} • 
                          Due: {new Date(layaway.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-text-primary">
                          ${layaway.balanceDue.toFixed(2)}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          of ${layaway.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(layaway.status)}`}>
                        {layaway.status}
                      </span>
                      {layaway.status === 'active' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowPaymentForm(layaway.id)}
                            title="Make Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => completeMutation.mutate(layaway.id)}
                            title="Complete Layaway"
                          >
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => cancelMutation.mutate(layaway.id)}
                            title="Cancel Layaway"
                          >
                            <XCircle className="w-4 h-4 text-error" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Payment Form */}
                  {showPaymentForm === layaway.id && (
                    <div className="mt-2 p-4 bg-surface-base border border-border rounded-lg">
                      <h4 className="text-sm font-medium text-text-primary mb-3">Record Payment</h4>
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <label className="block text-xs text-text-tertiary mb-1">Amount</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                              type="number"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              max={layaway.balanceDue}
                              className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-text-tertiary mb-1">Payment Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Credit/Debit Card</option>
                            <option value="check">Check</option>
                            <option value="store_credit">Store Credit</option>
                          </select>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(null)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handlePayment(layaway.id)}
                          disabled={paymentMutation.isPending || !paymentAmount}
                        >
                          {paymentMutation.isPending ? 'Processing...' : 'Apply Payment'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LayawayTab;

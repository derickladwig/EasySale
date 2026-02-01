import React, { useState, useMemo } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  Wrench, 
  Plus, 
  RefreshCw, 
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  X,
  DollarSign,
  FileText
} from 'lucide-react';
import { useWorkOrders, useCompleteWorkOrder, useCreateWorkOrder, useAddWorkOrderLine, useCreateInvoiceFromWorkOrder } from '../hooks';

// Helper to get default estimated completion (7 days from now)
const getDefaultEstimatedCompletion = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

const WorkOrdersTab: React.FC = () => {
  const defaultEstimatedCompletion = useMemo(() => getDefaultEstimatedCompletion(), []);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddLineForm, setShowAddLineForm] = useState<string | null>(null);
  const [newWorkOrder, setNewWorkOrder] = useState({
    customerId: '',
    customerName: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    estimatedCompletion: '',
  });
  const [newLine, setNewLine] = useState({
    description: '',
    quantity: '1',
    unitPrice: '',
    type: 'labor' as 'labor' | 'parts' | 'other',
  });

  const { data: workOrders, isLoading, refetch } = useWorkOrders({ status: statusFilter || undefined });
  const completeMutation = useCompleteWorkOrder();
  const createMutation = useCreateWorkOrder();
  const addLineMutation = useAddWorkOrderLine();
  const createInvoiceMutation = useCreateInvoiceFromWorkOrder();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in_progress': return <Play className="w-4 h-4 text-primary-400" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-error" />;
      default: return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-error/20 text-error';
      case 'high': return 'bg-warning/20 text-warning';
      case 'normal': return 'bg-primary-500/20 text-primary-400';
      default: return 'bg-surface-elevated text-text-tertiary';
    }
  };

  const handleCreateWorkOrder = () => {
    if (!newWorkOrder.customerName || !newWorkOrder.description) return;
    
    createMutation.mutate({
      customerId: newWorkOrder.customerId || `cust-${Date.now()}`,
      description: newWorkOrder.description,
      priority: newWorkOrder.priority,
      estimatedCompletion: newWorkOrder.estimatedCompletion || defaultEstimatedCompletion,
    }, {
      onSuccess: () => {
        setShowCreateForm(false);
        setNewWorkOrder({
          customerId: '',
          customerName: '',
          description: '',
          priority: 'normal',
          estimatedCompletion: '',
        });
      }
    });
  };

  const handleAddLine = (workOrderId: string) => {
    if (!newLine.description || !newLine.unitPrice) return;
    
    addLineMutation.mutate({
      id: workOrderId,
      line: {
        description: newLine.description,
        quantity: parseInt(newLine.quantity) || 1,
        unitPrice: parseFloat(newLine.unitPrice),
        type: newLine.type,
      },
    }, {
      onSuccess: () => {
        setShowAddLineForm(null);
        setNewLine({
          description: '',
          quantity: '1',
          unitPrice: '',
          type: 'labor',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">New Work Order</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newWorkOrder.customerName}
                  onChange={(e) => setNewWorkOrder(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Priority</label>
                <select
                  value={newWorkOrder.priority}
                  onChange={(e) => setNewWorkOrder(prev => ({ ...prev, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-text-tertiary mb-1">Description *</label>
                <textarea
                  value={newWorkOrder.description}
                  onChange={(e) => setNewWorkOrder(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work to be done"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Estimated Completion</label>
                <input
                  type="date"
                  value={newWorkOrder.estimatedCompletion || defaultEstimatedCompletion}
                  onChange={(e) => setNewWorkOrder(prev => ({ ...prev, estimatedCompletion: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleCreateWorkOrder}
                disabled={createMutation.isPending || !newWorkOrder.customerName || !newWorkOrder.description}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Work Orders</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
              New Work Order
            </Button>
          </div>
        </div>
      </Card>

      {/* Work Orders List */}
      <Card>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !workOrders || workOrders.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No work orders found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                Create your first work order
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((order) => (
                <div key={order.id}>
                  <div className="p-4 bg-surface-elevated rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <div className="font-medium text-text-primary">{order.customerName}</div>
                          <div className="text-sm text-text-tertiary">{order.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                        <span className="text-lg font-semibold text-text-primary">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    {order.lines.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-text-tertiary mb-2">Line Items:</div>
                        <div className="space-y-1">
                          {order.lines.slice(0, 3).map((line) => (
                            <div key={line.id} className="flex justify-between text-sm">
                              <span className="text-text-secondary">{line.description}</span>
                              <span className="text-text-primary">${line.total.toFixed(2)}</span>
                            </div>
                          ))}
                          {order.lines.length > 3 && (
                            <div className="text-xs text-text-disabled">
                              +{order.lines.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Invoice Information */}
                    {order.status === 'completed' && order.invoiceNumber && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-success" />
                          <span className="text-text-tertiary">Invoice:</span>
                          <span className="font-medium text-text-primary">{order.invoiceNumber}</span>
                          <span className="text-xs text-text-disabled">
                            (Created {new Date(order.invoicedAt!).toLocaleDateString()})
                          </span>
                        </div>
                      </div>
                    )}

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="mt-3 pt-3 border-t border-border flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddLineForm(order.id)}
                        >
                          Add Line
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => completeMutation.mutate(order.id)}
                        >
                          Complete
                        </Button>
                      </div>
                    )}

                    {/* Create Invoice Button - Show only if completed and not yet invoiced */}
                    {order.status === 'completed' && !order.invoiceNumber && (
                      <div className="mt-3 pt-3 border-t border-border flex justify-end gap-2">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => createInvoiceMutation.mutate(order.id)}
                          disabled={createInvoiceMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {createInvoiceMutation.isPending ? 'Creating Invoice...' : 'Create Invoice'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Add Line Form */}
                  {showAddLineForm === order.id && (
                    <div className="mt-2 p-4 bg-surface-base border border-border rounded-lg">
                      <h4 className="text-sm font-medium text-text-primary mb-3">Add Line Item</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-text-tertiary mb-1">Description *</label>
                          <input
                            type="text"
                            value={newLine.description}
                            onChange={(e) => setNewLine(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Labor, parts, etc."
                            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">Type</label>
                          <select
                            value={newLine.type}
                            onChange={(e) => setNewLine(prev => ({ ...prev, type: e.target.value as 'labor' | 'parts' | 'other' }))}
                            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="labor">Labor</option>
                            <option value="parts">Parts</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">Qty</label>
                          <input
                            type="number"
                            value={newLine.quantity}
                            onChange={(e) => setNewLine(prev => ({ ...prev, quantity: e.target.value }))}
                            min="1"
                            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">Unit Price *</label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
                            <input
                              type="number"
                              value={newLine.unitPrice}
                              onChange={(e) => setNewLine(prev => ({ ...prev, unitPrice: e.target.value }))}
                              placeholder="0.00"
                              step="0.01"
                              className="w-full pl-7 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <div className="col-span-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowAddLineForm(null)}>
                            Cancel
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleAddLine(order.id)}
                            disabled={addLineMutation.isPending || !newLine.description || !newLine.unitPrice}
                          >
                            {addLineMutation.isPending ? 'Adding...' : 'Add Line'}
                          </Button>
                        </div>
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

export default WorkOrdersTab;

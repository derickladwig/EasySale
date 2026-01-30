import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  CreditCard, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  FileText,
  X,
  DollarSign
} from 'lucide-react';
import { useAgingReport, usePendingVerifications, useVerifyOfflineTransactions, useCreateCreditAccount } from '../hooks';

const CreditAccountsTab: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    customerId: '',
    customerName: '',
    creditLimit: '',
    paymentTerms: '30',
  });

  const { data: agingReport, isLoading: agingLoading, refetch } = useAgingReport();
  const { data: pendingVerifications } = usePendingVerifications();
  const verifyMutation = useVerifyOfflineTransactions();
  const createMutation = useCreateCreditAccount();

  const totalAR = agingReport?.reduce((sum, acc) => sum + acc.total, 0) || 0;
  const totalOverdue = agingReport?.reduce((sum, acc) => sum + acc.days30 + acc.days60 + acc.days90 + acc.over90, 0) || 0;

  const handleVerifyAll = () => {
    if (pendingVerifications && pendingVerifications.length > 0) {
      verifyMutation.mutate(pendingVerifications.map(v => v.transactionId));
    }
  };

  const handleCreateAccount = () => {
    if (!newAccount.customerId || !newAccount.creditLimit) return;
    
    createMutation.mutate({
      customerId: newAccount.customerId,
      creditLimit: parseFloat(newAccount.creditLimit),
      paymentTerms: parseInt(newAccount.paymentTerms),
    }, {
      onSuccess: () => {
        setShowCreateForm(false);
        setNewAccount({
          customerId: '',
          customerName: '',
          creditLimit: '',
          paymentTerms: '30',
        });
        refetch();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending Verifications Alert */}
      {pendingVerifications && pendingVerifications.length > 0 && (
        <Card>
          <div className="p-4 bg-warning/10 border-l-4 border-warning">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">
                    {pendingVerifications.length} Pending Offline Verification{pendingVerifications.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Credit transactions made offline need verification
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVerifyAll}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify All'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="text-sm text-text-tertiary mb-1">Total A/R</div>
            <div className="text-2xl font-bold text-text-primary">${totalAR.toFixed(2)}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-sm text-text-tertiary mb-1">Overdue</div>
            <div className="text-2xl font-bold text-error">${totalOverdue.toFixed(2)}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-sm text-text-tertiary mb-1">Accounts</div>
            <div className="text-2xl font-bold text-text-primary">{agingReport?.length || 0}</div>
          </div>
        </Card>
      </div>

      {/* Create Account Form */}
      {showCreateForm && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">New Credit Account</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Customer ID *</label>
                <input
                  type="text"
                  value={newAccount.customerId}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, customerId: e.target.value }))}
                  placeholder="Enter customer ID"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Customer Name</label>
                <input
                  type="text"
                  value={newAccount.customerName}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="For reference"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Credit Limit *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="number"
                    value={newAccount.creditLimit}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, creditLimit: e.target.value }))}
                    placeholder="1000.00"
                    min="0"
                    step="100"
                    className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Payment Terms (days)</label>
                <select
                  value={newAccount.paymentTerms}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="15">Net 15</option>
                  <option value="30">Net 30</option>
                  <option value="45">Net 45</option>
                  <option value="60">Net 60</option>
                  <option value="90">Net 90</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleCreateAccount}
                disabled={createMutation.isPending || !newAccount.customerId || !newAccount.creditLimit}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Credit Accounts</h2>
          </div>
          <div className="flex items-center gap-3">
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
              New Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Aging Report */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Aging Report</h3>
          
          {agingLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !agingReport || agingReport.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No credit accounts found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                Create your first credit account
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-tertiary text-sm border-b border-border">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Current</th>
                    <th className="pb-2 text-right">1-30 Days</th>
                    <th className="pb-2 text-right">31-60 Days</th>
                    <th className="pb-2 text-right">61-90 Days</th>
                    <th className="pb-2 text-right">90+ Days</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {agingReport.map((account) => (
                    <tr key={account.accountId} className="border-b border-border/50">
                      <td className="py-3 text-text-primary">{account.customerName}</td>
                      <td className="py-3 text-right text-text-secondary">${account.current.toFixed(2)}</td>
                      <td className="py-3 text-right text-warning">
                        {account.days30 > 0 ? `$${account.days30.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right text-warning-dark">
                        {account.days60 > 0 ? `$${account.days60.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right text-error">
                        {account.days90 > 0 ? `$${account.days90.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right text-error-dark">
                        {account.over90 > 0 ? `$${account.over90.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 text-right font-medium text-text-primary">
                        ${account.total.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" title="View Statement">
                          <FileText className="w-4 h-4 text-text-tertiary" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreditAccountsTab;

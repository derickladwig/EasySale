import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { 
  Gift, 
  Plus, 
  Search,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { useGiftCardBalance, useIssueGiftCard, useReloadGiftCard } from '../hooks';
import { Button } from '@common/components/atoms/Button';

const GiftCardsTab: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [issueAmount, setIssueAmount] = useState('');
  const [reloadAmount, setReloadAmount] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showReloadForm, setShowReloadForm] = useState(false);
  
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useGiftCardBalance(searchCode);
  const issueMutation = useIssueGiftCard();
  const reloadMutation = useReloadGiftCard();

  const handleIssue = () => {
    const amount = parseFloat(issueAmount);
    if (amount > 0) {
      issueMutation.mutate({ amount }, {
        onSuccess: () => {
          setIssueAmount('');
          setShowIssueForm(false);
        }
      });
    }
  };

  const handleReload = () => {
    const amount = parseFloat(reloadAmount);
    if (amount > 0 && searchCode) {
      reloadMutation.mutate({ code: searchCode, amount }, {
        onSuccess: () => {
          setReloadAmount('');
          setShowReloadForm(false);
          refetchBalance();
        }
      });
    }
  };

  const handleQuickIssue = (amount: number) => {
    issueMutation.mutate({ amount });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Gift Cards</h2>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setShowIssueForm(true)}
          >
            <Plus className="w-4 h-4" />
            Issue Gift Card
          </Button>
        </div>
      </Card>

      {/* Issue Form */}
      {showIssueForm && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Issue New Gift Card</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm text-text-tertiary mb-1">Amount *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="number"
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowIssueForm(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleIssue}
                disabled={issueMutation.isPending || !issueAmount || parseFloat(issueAmount) <= 0}
              >
                {issueMutation.isPending ? 'Issuing...' : 'Issue Card'}
              </Button>
            </div>
            {issueMutation.isSuccess && issueMutation.data && (
              <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-success font-medium">Gift card issued successfully!</p>
                <p className="text-text-secondary text-sm mt-1">
                  Code: <span className="font-mono font-bold">{issueMutation.data.code}</span>
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Balance Lookup */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Check Balance</h3>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Enter gift card code (min 8 characters)..."
                className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {searchCode.length >= 8 && (
            <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
              {balanceLoading ? (
                <div className="flex items-center gap-2 text-text-tertiary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking balance...
                </div>
              ) : balance ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-text-tertiary">Current Balance</div>
                      <div className="text-3xl font-bold text-success">
                        ${balance.balance.toFixed(2)}
                      </div>
                      <div className={`text-sm mt-1 ${
                        balance.status === 'active' ? 'text-success' : 'text-error'
                      }`}>
                        Status: {balance.status}
                      </div>
                    </div>
                    {balance.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowReloadForm(true)}
                      >
                        Reload
                      </Button>
                    )}
                  </div>

                  {/* Reload Form */}
                  {showReloadForm && balance.status === 'active' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-medium text-text-primary mb-3">Reload Gift Card</h4>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-text-tertiary mb-1">Amount to Add</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                              type="number"
                              value={reloadAmount}
                              onChange={(e) => setReloadAmount(e.target.value)}
                              placeholder="0.00"
                              min="1"
                              step="0.01"
                              className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowReloadForm(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={handleReload}
                          disabled={reloadMutation.isPending || !reloadAmount || parseFloat(reloadAmount) <= 0}
                        >
                          {reloadMutation.isPending ? 'Reloading...' : 'Reload'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-text-tertiary">Gift card not found. Please check the code and try again.</div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Issue Amounts</h3>
          <div className="grid grid-cols-4 gap-3">
            {[25, 50, 100, 250].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => handleQuickIssue(amount)}
                disabled={issueMutation.isPending}
                className="py-4"
              >
                <div className="text-center">
                  <div className="text-lg font-bold">${amount}</div>
                  <div className="text-xs text-text-tertiary">Gift Card</div>
                </div>
              </Button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Click any amount to instantly issue a new gift card with that value.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GiftCardsTab;

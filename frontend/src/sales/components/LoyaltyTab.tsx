import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  Star, 
  Plus, 
  RefreshCw,
  Search,
  Award,
  Wallet,
  X,
  DollarSign
} from 'lucide-react';
import { usePriceLevels, useCreatePriceLevel, useLoyaltyBalance, useIssueStoreCredit, useAdjustLoyaltyPoints } from '../hooks';

const LoyaltyTab: React.FC = () => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchedCustomerId, setSearchedCustomerId] = useState('');
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [showIssueCredit, setShowIssueCredit] = useState(false);
  const [showAdjustPoints, setShowAdjustPoints] = useState(false);
  
  const [newLevel, setNewLevel] = useState({
    name: '',
    discountPercentage: '',
    minPurchaseAmount: '',
    isDefault: false,
  });
  const [creditForm, setCreditForm] = useState({
    customerId: '',
    amount: '',
    reason: '',
  });
  const [pointsForm, setPointsForm] = useState({
    customerId: '',
    points: '',
    reason: '',
  });

  const { data: priceLevels, isLoading: levelsLoading, refetch } = usePriceLevels();
  const createLevelMutation = useCreatePriceLevel();
  const { data: loyaltyBalance, isLoading: balanceLoading } = useLoyaltyBalance(searchedCustomerId);
  const issueCreditMutation = useIssueStoreCredit();
  const adjustPointsMutation = useAdjustLoyaltyPoints();

  const handleSearch = () => {
    if (customerSearch.trim()) {
      setSearchedCustomerId(customerSearch.trim());
    }
  };

  const handleCreateLevel = () => {
    if (!newLevel.name || !newLevel.discountPercentage) return;
    
    createLevelMutation.mutate({
      name: newLevel.name,
      discountPercentage: parseFloat(newLevel.discountPercentage),
      minPurchaseAmount: newLevel.minPurchaseAmount ? parseFloat(newLevel.minPurchaseAmount) : undefined,
      isDefault: newLevel.isDefault,
    }, {
      onSuccess: () => {
        setShowAddLevel(false);
        setNewLevel({
          name: '',
          discountPercentage: '',
          minPurchaseAmount: '',
          isDefault: false,
        });
      }
    });
  };

  const handleIssueCredit = () => {
    if (!creditForm.customerId || !creditForm.amount || !creditForm.reason) return;
    
    issueCreditMutation.mutate({
      customerId: creditForm.customerId,
      amount: parseFloat(creditForm.amount),
      reason: creditForm.reason,
    }, {
      onSuccess: () => {
        setShowIssueCredit(false);
        setCreditForm({ customerId: '', amount: '', reason: '' });
      }
    });
  };

  const handleAdjustPoints = () => {
    if (!pointsForm.customerId || !pointsForm.points || !pointsForm.reason) return;
    
    adjustPointsMutation.mutate({
      customerId: pointsForm.customerId,
      points: parseInt(pointsForm.points),
      reason: pointsForm.reason,
    }, {
      onSuccess: () => {
        setShowAdjustPoints(false);
        setPointsForm({ customerId: '', points: '', reason: '' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Loyalty Program</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Customer Lookup */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Customer Lookup</h3>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter customer ID to view loyalty status..."
                className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button variant="primary" onClick={handleSearch}>Search</Button>
          </div>

          {/* Customer Results */}
          {searchedCustomerId ? (
            <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
              {balanceLoading ? (
                <div className="flex items-center gap-2 text-text-tertiary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading customer data...
                </div>
              ) : loyaltyBalance ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-text-tertiary">Points Balance</div>
                    <div className="text-2xl font-bold text-primary-400">{loyaltyBalance.points}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-tertiary">Current Tier</div>
                    <div className="text-2xl font-bold text-text-primary">{loyaltyBalance.tier}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-tertiary">Store Credit</div>
                    <div className="text-2xl font-bold text-success">${loyaltyBalance.storeCredit?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-text-tertiary">Customer not found or no loyalty data available.</div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-8 bg-surface-elevated rounded-lg text-center text-text-tertiary">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Enter a customer ID to view their loyalty status</p>
            </div>
          )}
        </div>
      </Card>

      {/* Price Levels */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Price Levels</h3>
            <Button 
              variant="primary" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowAddLevel(true)}
            >
              <Plus className="w-4 h-4" />
              Add Level
            </Button>
          </div>

          {/* Add Level Form */}
          {showAddLevel && (
            <div className="mb-4 p-4 bg-surface-base border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-text-primary">New Price Level</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowAddLevel(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Name *</label>
                  <input
                    type="text"
                    value={newLevel.name}
                    onChange={(e) => setNewLevel(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VIP"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Discount % *</label>
                  <input
                    type="number"
                    value={newLevel.discountPercentage}
                    onChange={(e) => setNewLevel(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    placeholder="10"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Min Purchase</label>
                  <input
                    type="number"
                    value={newLevel.minPurchaseAmount}
                    onChange={(e) => setNewLevel(prev => ({ ...prev, minPurchaseAmount: e.target.value }))}
                    placeholder="Optional"
                    min="0"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={newLevel.isDefault}
                      onChange={(e) => setNewLevel(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="rounded border-border bg-surface-base"
                    />
                    Default
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowAddLevel(false)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleCreateLevel}
                  disabled={createLevelMutation.isPending || !newLevel.name || !newLevel.discountPercentage}
                >
                  {createLevelMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {levelsLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !priceLevels || priceLevels.length === 0 ? (
            <div className="text-center py-4 text-text-tertiary">No price levels configured</div>
          ) : (
            <div className="space-y-2">
              {priceLevels.map((level) => (
                <div
                  key={level.id}
                  className="p-3 bg-surface-elevated rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Award className={`w-5 h-5 ${level.isDefault ? 'text-primary-400' : 'text-text-tertiary'}`} />
                    <div>
                      <div className="font-medium text-text-primary">{level.name}</div>
                      <div className="text-sm text-text-tertiary">
                        {level.discountPercentage}% discount
                        {level.minPurchaseAmount && ` • Min $${level.minPurchaseAmount}`}
                      </div>
                    </div>
                  </div>
                  {level.isDefault && (
                    <span className="px-2 py-1 text-xs bg-primary-500/20 text-primary-400 rounded">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Store Credit Section */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-5 h-5 text-success" />
            <h3 className="text-lg font-semibold text-text-primary">Store Credit & Points</h3>
          </div>
          
          {/* Issue Credit Form */}
          {showIssueCredit && (
            <div className="mb-4 p-4 bg-surface-base border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-text-primary">Issue Store Credit</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowIssueCredit(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Customer ID *</label>
                  <input
                    type="text"
                    value={creditForm.customerId}
                    onChange={(e) => setCreditForm(prev => ({ ...prev, customerId: e.target.value }))}
                    placeholder="cust-123"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Amount *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
                    <input
                      type="number"
                      value={creditForm.amount}
                      onChange={(e) => setCreditForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-7 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Reason *</label>
                  <select
                    value={creditForm.reason}
                    onChange={(e) => setCreditForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select reason</option>
                    <option value="return">Return/Refund</option>
                    <option value="promotion">Promotional</option>
                    <option value="loyalty">Loyalty Reward</option>
                    <option value="compensation">Customer Compensation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowIssueCredit(false)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleIssueCredit}
                  disabled={issueCreditMutation.isPending || !creditForm.customerId || !creditForm.amount || !creditForm.reason}
                >
                  {issueCreditMutation.isPending ? 'Issuing...' : 'Issue Credit'}
                </Button>
              </div>
            </div>
          )}

          {/* Adjust Points Form */}
          {showAdjustPoints && (
            <div className="mb-4 p-4 bg-surface-base border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-text-primary">Adjust Loyalty Points</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowAdjustPoints(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Customer ID *</label>
                  <input
                    type="text"
                    value={pointsForm.customerId}
                    onChange={(e) => setPointsForm(prev => ({ ...prev, customerId: e.target.value }))}
                    placeholder="cust-123"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Points * (negative to deduct)</label>
                  <input
                    type="number"
                    value={pointsForm.points}
                    onChange={(e) => setPointsForm(prev => ({ ...prev, points: e.target.value }))}
                    placeholder="100 or -50"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Reason *</label>
                  <select
                    value={pointsForm.reason}
                    onChange={(e) => setPointsForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select reason</option>
                    <option value="bonus">Bonus Points</option>
                    <option value="correction">Correction</option>
                    <option value="promotion">Promotional</option>
                    <option value="expiration">Expiration Adjustment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowAdjustPoints(false)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleAdjustPoints}
                  disabled={adjustPointsMutation.isPending || !pointsForm.customerId || !pointsForm.points || !pointsForm.reason}
                >
                  {adjustPointsMutation.isPending ? 'Adjusting...' : 'Adjust Points'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-elevated rounded-lg">
              <div className="text-sm text-text-tertiary mb-1">Issue Store Credit</div>
              <p className="text-text-secondary text-sm">
                Award store credit to customers for returns, promotions, or loyalty rewards.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowIssueCredit(true)}
              >
                Issue Credit
              </Button>
            </div>
            <div className="p-4 bg-surface-elevated rounded-lg">
              <div className="text-sm text-text-tertiary mb-1">Adjust Points</div>
              <p className="text-text-secondary text-sm">
                Manually adjust loyalty points for special circumstances or corrections.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowAdjustPoints(true)}
              >
                Adjust Points
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Loyalty Tiers */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Loyalty Tiers</h3>
          <div className="grid grid-cols-4 gap-4">
            {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier, idx) => (
              <div key={tier} className="p-4 bg-surface-elevated rounded-lg text-center">
                <Star className={`w-8 h-8 mx-auto mb-2 ${
                  idx === 0 ? 'text-amber-600' :
                  idx === 1 ? 'text-gray-400' :
                  idx === 2 ? 'text-yellow-400' :
                  'text-cyan-400'
                }`} />
                <div className="font-medium text-text-primary">{tier}</div>
                <div className="text-xs text-text-tertiary mt-1">
                  {idx === 0 ? '0-499 pts' :
                   idx === 1 ? '500-999 pts' :
                   idx === 2 ? '1000-2499 pts' :
                   '2500+ pts'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoyaltyTab;

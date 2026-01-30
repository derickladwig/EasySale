import React, { useState, useMemo } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  Tag, 
  Plus, 
  RefreshCw,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { usePromotions, useGroupMarkdowns, useUpdatePromotion, useDeactivateGroupMarkdown, useCreatePromotion, useCreateGroupMarkdown } from '../hooks';

// Helper to get default dates
const getDefaultStartDate = () => new Date().toISOString().split('T')[0];
const getDefaultEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

const PromotionsTab: React.FC = () => {
  const defaultStartDate = useMemo(() => getDefaultStartDate(), []);
  const defaultEndDate = useMemo(() => getDefaultEndDate(), []);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [showCreateMarkdown, setShowCreateMarkdown] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'bogo' | 'bundle',
    value: '',
    startDate: '',
    endDate: '',
    maxUsage: '',
    minPurchase: '',
    isActive: true,
  });
  const [newMarkdown, setNewMarkdown] = useState({
    name: '',
    percentage: '',
    categoryIds: '',
    isActive: true,
  });

  const { data: promotions, isLoading: promoLoading, refetch } = usePromotions({ isActive: showActiveOnly ? true : undefined });
  const { data: markdowns, isLoading: markdownLoading } = useGroupMarkdowns();
  const updateMutation = useUpdatePromotion();
  const deactivateMutation = useDeactivateGroupMarkdown();
  const createPromoMutation = useCreatePromotion();
  const createMarkdownMutation = useCreateGroupMarkdown();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Percentage Off';
      case 'fixed': return 'Fixed Amount';
      case 'bogo': return 'Buy One Get One';
      case 'bundle': return 'Bundle Deal';
      default: return type;
    }
  };

  const handleCreatePromo = () => {
    if (!newPromo.name || !newPromo.value) return;
    
    createPromoMutation.mutate({
      name: newPromo.name,
      description: newPromo.description,
      type: newPromo.type,
      value: parseFloat(newPromo.value),
      startDate: newPromo.startDate || defaultStartDate,
      endDate: newPromo.endDate || defaultEndDate,
      maxUsage: newPromo.maxUsage ? parseInt(newPromo.maxUsage) : undefined,
      conditions: {
        minPurchase: newPromo.minPurchase ? parseFloat(newPromo.minPurchase) : undefined,
      },
      isActive: newPromo.isActive,
    }, {
      onSuccess: () => {
        setShowCreatePromo(false);
        setNewPromo({
          name: '',
          description: '',
          type: 'percentage',
          value: '',
          startDate: '',
          endDate: '',
          maxUsage: '',
          minPurchase: '',
          isActive: true,
        });
      }
    });
  };

  const handleCreateMarkdown = () => {
    if (!newMarkdown.name || !newMarkdown.percentage) return;
    
    createMarkdownMutation.mutate({
      name: newMarkdown.name,
      percentage: parseFloat(newMarkdown.percentage),
      categoryIds: newMarkdown.categoryIds.split(',').map(s => s.trim()).filter(Boolean),
      startDate: new Date().toISOString(),
      isActive: newMarkdown.isActive,
    }, {
      onSuccess: () => {
        setShowCreateMarkdown(false);
        setNewMarkdown({
          name: '',
          percentage: '',
          categoryIds: '',
          isActive: true,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Promotions</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-border bg-surface-base"
              />
              Active only
            </label>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowCreatePromo(true)}
            >
              <Plus className="w-4 h-4" />
              New Promotion
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Promotion Form */}
      {showCreatePromo && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">New Promotion</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreatePromo(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Name *</label>
                <input
                  type="text"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Summer Sale"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Type</label>
                <select
                  value={newPromo.type}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' | 'bogo' | 'bundle' }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="percentage">Percentage Off</option>
                  <option value="fixed">Fixed Amount Off</option>
                  <option value="bogo">Buy One Get One</option>
                  <option value="bundle">Bundle Deal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">
                  Value * {newPromo.type === 'percentage' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  value={newPromo.value}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, value: e.target.value }))}
                  placeholder={newPromo.type === 'percentage' ? '10' : '5.00'}
                  min="0"
                  step={newPromo.type === 'percentage' ? '1' : '0.01'}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Min Purchase ($)</label>
                <input
                  type="number"
                  value={newPromo.minPurchase}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, minPurchase: e.target.value }))}
                  placeholder="Optional"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">Start Date</label>
                <input
                  type="date"
                  value={newPromo.startDate || defaultStartDate}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-text-tertiary mb-1">End Date</label>
                <input
                  type="date"
                  value={newPromo.endDate || defaultEndDate}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-text-tertiary mb-1">Description</label>
                <textarea
                  value={newPromo.description}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreatePromo(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleCreatePromo}
                disabled={createPromoMutation.isPending || !newPromo.name || !newPromo.value}
              >
                {createPromoMutation.isPending ? 'Creating...' : 'Create Promotion'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Promotions List */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Active Promotions</h3>
          
          {promoLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !promotions || promotions.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No promotions found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowCreatePromo(true)}
              >
                Create your first promotion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className={`p-4 rounded-lg border ${
                    promo.isActive 
                      ? 'bg-surface-elevated border-border' 
                      : 'bg-surface-elevated/50 border-border/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{promo.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded">
                          {getTypeLabel(promo.type)}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-sm text-text-tertiary mt-1">{promo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-disabled">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                        </span>
                        <span>Used: {promo.usageCount}{promo.maxUsage ? `/${promo.maxUsage}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-success">
                          {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                        </div>
                        <div className="text-xs text-text-tertiary">discount</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateMutation.mutate({ 
                          id: promo.id, 
                          data: { isActive: !promo.isActive } 
                        })}
                        title={promo.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {promo.isActive ? (
                          <XCircle className="w-5 h-5 text-error" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Group Markdowns */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Group Markdowns</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowCreateMarkdown(true)}
            >
              <Plus className="w-4 h-4" />
              Add Markdown
            </Button>
          </div>

          {/* Create Markdown Form */}
          {showCreateMarkdown && (
            <div className="mb-4 p-4 bg-surface-base border border-border rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-3">New Group Markdown</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Name *</label>
                  <input
                    type="text"
                    value={newMarkdown.name}
                    onChange={(e) => setNewMarkdown(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Clearance Sale"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Percentage Off *</label>
                  <input
                    type="number"
                    value={newMarkdown.percentage}
                    onChange={(e) => setNewMarkdown(prev => ({ ...prev, percentage: e.target.value }))}
                    placeholder="20"
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Category IDs (comma-separated)</label>
                  <input
                    type="text"
                    value={newMarkdown.categoryIds}
                    onChange={(e) => setNewMarkdown(prev => ({ ...prev, categoryIds: e.target.value }))}
                    placeholder="cat1, cat2"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowCreateMarkdown(false)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleCreateMarkdown}
                  disabled={createMarkdownMutation.isPending || !newMarkdown.name || !newMarkdown.percentage}
                >
                  {createMarkdownMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {markdownLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !markdowns || markdowns.length === 0 ? (
            <div className="text-center py-4 text-text-tertiary">No group markdowns configured</div>
          ) : (
            <div className="space-y-2">
              {markdowns.map((markdown) => (
                <div
                  key={markdown.id}
                  className="p-3 bg-surface-elevated rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-warning" />
                    <div>
                      <div className="font-medium text-text-primary">{markdown.name}</div>
                      <div className="text-sm text-text-tertiary">
                        {markdown.categoryIds.length} categories • {markdown.percentage}% off
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      markdown.isActive ? 'bg-success/20 text-success' : 'bg-surface-overlay text-text-disabled'
                    }`}>
                      {markdown.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {markdown.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivateMutation.mutate(markdown.id)}
                        title="Deactivate"
                      >
                        <XCircle className="w-4 h-4 text-error" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PromotionsTab;

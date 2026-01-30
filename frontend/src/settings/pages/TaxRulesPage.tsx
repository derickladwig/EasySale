import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { Receipt, Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { useTaxRulesQuery, type TaxRule } from '../hooks/useTaxRulesQuery';
import { useStores } from '../../admin/hooks/useStores';

export const TaxRulesPage: React.FC = () => {
  const { data: taxRules = [], isLoading, error } = useTaxRulesQuery();
  const { stores, isLoading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [testAmount, setTestAmount] = useState('100.00');
  const [testCategory, setTestCategory] = useState('');

  const handleAddTaxRule = () => {
    toast.info('Tax rule configuration requires admin privileges. Contact your administrator to add or modify tax rules.');
  };

  const handleEditTaxRule = (rule: TaxRule) => {
    toast.info(`Edit tax rule: ${rule.name}`);
  };

  const handleDeleteTaxRule = (rule: TaxRule) => {
    if (rule.is_default) {
      toast.error('Cannot delete default tax rule');
      return;
    }
    toast.info(`Delete tax rule: ${rule.name}`);
  };

  const calculateTax = () => {
    const amount = parseFloat(testAmount);
    if (isNaN(amount)) {
      toast.error('Invalid amount');
      return;
    }

    // Find applicable tax rule
    const applicableRule = testCategory
      ? taxRules.find((r) => r.category === testCategory) || taxRules.find((r) => r.is_default)
      : taxRules.find((r) => r.is_default);

    if (!applicableRule) {
      toast.error('No applicable tax rule found');
      return;
    }

    const taxAmount = amount * (applicableRule.rate / 100);
    const total = amount + taxAmount;

    toast.success(
      `Tax: ${taxAmount.toFixed(2)} (${applicableRule.rate}% - ${applicableRule.name})\nTotal: ${total.toFixed(2)}`,
      { duration: 5000 }
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-auto bg-background-primary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-text-secondary">Loading tax rules...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full overflow-auto bg-background-primary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-error-500 mb-2">Error loading tax rules</div>
              <div className="text-text-tertiary text-sm">Please try again later</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (taxRules.length === 0) {
    return (
      <div className="h-full overflow-auto bg-background-primary p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Tax Rules</h1>
            <p className="text-text-secondary mt-2">Configure tax rates per store and category</p>
          </div>

          {/* Empty State */}
          <Card>
            <EmptyState
              title="No tax rules configured"
              description="Start by adding your first tax rule to calculate taxes on sales"
              primaryAction={{
                label: 'Add tax rule',
                onClick: handleAddTaxRule,
                icon: <Plus className="w-4 h-4" />,
              }}
              icon={<Receipt className="w-16 h-16" />}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Tax Rules</h1>
          <p className="text-text-secondary mt-2">Configure tax rates per store and category</p>
        </div>

        {/* Store Selector */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Store Selection</h2>
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Configure Tax Rules For
              </label>
              <select 
                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                disabled={storesLoading}
              >
                {storesLoading ? (
                  <option value="">Loading stores...</option>
                ) : stores.length === 0 ? (
                  <option value="">No stores configured</option>
                ) : (
                  <>
                    <option value="">Select a store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <p className="text-sm text-text-tertiary mt-2">
                Tax rules are store-specific. Select a store to view and edit its tax configuration.
              </p>
            </div>
          </div>
        </Card>

        {/* Tax Rules Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Tax Rules</h2>
              </div>
              <Button
                onClick={handleAddTaxRule}
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Tax Rule
              </Button>
            </div>

            <div className="space-y-3">
              {taxRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-surface-base rounded-lg border border-border hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{rule.name}</span>
                        {rule.is_default && (
                          <span className="px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-tertiary mt-1">
                        {rule.rate}% {rule.category ? `• ${rule.category}` : '• All categories'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleEditTaxRule(rule)} variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteTaxRule(rule)}
                      variant="ghost"
                      size="sm"
                      disabled={rule.is_default}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-surface-base rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Tax Rule Priority</h3>
              <ol className="space-y-2 text-sm text-text-tertiary">
                <li>1. Category-specific tax rules (if product has a category)</li>
                <li>2. Default tax rule (applies to all products)</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Tax Calculator Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Tax Calculator</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Amount"
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="100.00"
                step="0.01"
              />

              <div>
                <label htmlFor="category-select" className="block text-sm font-medium text-text-secondary mb-2">
                  Category (Optional)
                </label>
                <select
                  id="category-select"
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Default (All Categories)</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={calculateTax}
                  variant="primary"
                  className="w-full"
                  leftIcon={<Calculator className="w-4 h-4" />}
                >
                  Calculate
                </Button>
              </div>
            </div>

            <p className="text-sm text-text-tertiary">
              Test tax calculations with sample amounts and categories to verify your tax rules are
              configured correctly.
            </p>
          </div>
        </Card>

        {/* Validation Rules */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Validation Rules</h2>
            </div>

            <div className="space-y-3 text-sm text-text-tertiary">
              <div className="flex items-start gap-2">
                <div className="text-success-400 mt-0.5">✓</div>
                <div>Tax rates must be between 0% and 100%</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-success-400 mt-0.5">✓</div>
                <div>Each store must have exactly one default tax rule</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-success-400 mt-0.5">✓</div>
                <div>Category-specific rules override the default rule</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-success-400 mt-0.5">✓</div>
                <div>Tax rule names must be unique within a store</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

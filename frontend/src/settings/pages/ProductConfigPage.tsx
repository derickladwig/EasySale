import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Package, Ruler, Tag, DollarSign } from 'lucide-react';
import { CategoryManagement } from '../../admin/components/CategoryManagement';
import { UnitsManagement } from '../../admin/components/UnitsManagement';
import { PricingTiersManagement } from '../../admin/components/PricingTiersManagement';

type TabType = 'categories' | 'units' | 'pricing' | 'core-charges';

export const ProductConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('categories');

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Product Configuration</h1>
          <p className="text-text-secondary mt-2">Manage product categories, units, and pricing tiers</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Categories
              </div>
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'units'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Units
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'pricing'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Pricing Tiers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('core-charges')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'core-charges'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Core Charges
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'categories' && (
          <Card>
            <div className="p-6">
              <CategoryManagement />
            </div>
          </Card>
        )}

        {activeTab === 'units' && (
          <Card>
            <div className="p-6">
              <UnitsManagement />
            </div>
          </Card>
        )}

        {activeTab === 'pricing' && (
          <Card>
            <div className="p-6">
              <PricingTiersManagement />
            </div>
          </Card>
        )}

        {activeTab === 'core-charges' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Core Charges</h2>
              </div>

              <div className="p-4 bg-surface-base rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium text-text-primary">Enable Core Charges</div>
                    <div className="text-sm text-text-tertiary">
                      Track refundable deposits for returnable parts
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={true} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <p className="text-sm text-text-tertiary">
                  Core charges can be configured per product. When enabled, customers pay a
                  refundable deposit that is returned when they bring back the old part.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

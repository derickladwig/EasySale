import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import {
  Package,
  Wrench,
  DollarSign,
  Gift,
  Tag,
  CreditCard,
  Star,
  ChevronRight,
} from 'lucide-react';

type TabId = 'layaway' | 'work-orders' | 'commissions' | 'gift-cards' | 'promotions' | 'credit' | 'loyalty';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'layaway', label: 'Layaway', icon: <Package className="w-5 h-5" />, description: 'Manage customer layaway plans' },
  { id: 'work-orders', label: 'Work Orders', icon: <Wrench className="w-5 h-5" />, description: 'Track service and repair orders' },
  { id: 'commissions', label: 'Commissions', icon: <DollarSign className="w-5 h-5" />, description: 'Employee commission rules and reports' },
  { id: 'gift-cards', label: 'Gift Cards', icon: <Gift className="w-5 h-5" />, description: 'Issue and manage gift cards' },
  { id: 'promotions', label: 'Promotions', icon: <Tag className="w-5 h-5" />, description: 'Discounts and promotional offers' },
  { id: 'credit', label: 'Credit Accounts', icon: <CreditCard className="w-5 h-5" />, description: 'Customer credit and AR management' },
  { id: 'loyalty', label: 'Loyalty', icon: <Star className="w-5 h-5" />, description: 'Points, tiers, and store credit' },
];

// Lazy load tab content components
const LayawayTab = React.lazy(() => import('../components/LayawayTab'));
const WorkOrdersTab = React.lazy(() => import('../components/WorkOrdersTab'));
const CommissionsTab = React.lazy(() => import('../components/CommissionsTab'));
const GiftCardsTab = React.lazy(() => import('../components/GiftCardsTab'));
const PromotionsTab = React.lazy(() => import('../components/PromotionsTab'));
const CreditAccountsTab = React.lazy(() => import('../components/CreditAccountsTab'));
const LoyaltyTab = React.lazy(() => import('../components/LoyaltyTab'));

export const SalesManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('layaway');

  const renderTabContent = () => {
    return (
      <React.Suspense fallback={<div className="p-8 text-center text-text-tertiary">Loading...</div>}>
        {activeTab === 'layaway' && <LayawayTab />}
        {activeTab === 'work-orders' && <WorkOrdersTab />}
        {activeTab === 'commissions' && <CommissionsTab />}
        {activeTab === 'gift-cards' && <GiftCardsTab />}
        {activeTab === 'promotions' && <PromotionsTab />}
        {activeTab === 'credit' && <CreditAccountsTab />}
        {activeTab === 'loyalty' && <LoyaltyTab />}
      </React.Suspense>
    );
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Sales Management</h1>
          <p className="text-text-secondary mt-2">
            Manage layaways, work orders, commissions, gift cards, promotions, and customer accounts
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <nav className="p-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                    }`}
                  >
                    <span className={activeTab === tab.id ? 'text-primary-400' : 'text-text-tertiary'}>
                      {tab.icon}
                    </span>
                    <span className="flex-1 font-medium">{tab.label}</span>
                    {activeTab === tab.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesManagementPage;

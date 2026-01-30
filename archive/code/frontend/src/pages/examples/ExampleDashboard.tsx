import React from 'react';
import { DashboardTemplate } from '../../common/components/templates';
import { StatCard } from '../../common/components/organisms/StatCard';
import { Card } from '../../common/components/organisms/Card';
import { Button } from '../../common/components/atoms/Button';
import { Icon } from '../../common/components/atoms/Icon';
import { Download, RefreshCw, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';

/**
 * Example Dashboard Page
 * 
 * Demonstrates the use of DashboardTemplate with stat cards and content.
 */
export const ExampleDashboard: React.FC = () => {
  const stats = [
    <StatCard
      key="sales"
      label="Total Sales"
      value="$12,345"
      trend="up"
      trendValue={5.2}
      icon={DollarSign}
      variant="success"
    />,
    <StatCard
      key="orders"
      label="Orders"
      value="156"
      trend="down"
      trendValue={2.1}
      icon={ShoppingCart}
      variant="error"
    />,
    <StatCard
      key="customers"
      label="Customers"
      value="1,234"
      trend="up"
      trendValue={12.5}
      icon={Users}
      variant="success"
    />,
    <StatCard
      key="inventory"
      label="Low Stock Items"
      value="23"
      icon={Package}
      variant="warning"
    />,
  ];

  return (
    <DashboardTemplate
      title="Sales Dashboard"
      description="Overview of today's sales performance"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon icon={RefreshCw} size="sm" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon icon={Download} size="sm" />}
          >
            Export
          </Button>
        </>
      }
      stats={stats}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          header={<h2 className="text-lg font-semibold text-dark-50">Recent Orders</h2>}
        >
          <div className="space-y-4">
            <p className="text-dark-300">Order list would go here...</p>
          </div>
        </Card>

        <Card
          header={<h2 className="text-lg font-semibold text-dark-50">Top Products</h2>}
        >
          <div className="space-y-4">
            <p className="text-dark-300">Product list would go here...</p>
          </div>
        </Card>
      </div>
    </DashboardTemplate>
  );
};















import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Package,
  Users,
  BarChart3,
  Settings,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { usePermissions, Permission } from '@common/contexts/PermissionsContext';
import { cn } from '@common/utils/classNames';
import { StatCard } from '@common/components/organisms/StatCard';
import { apiClient } from '@common/utils/apiClient';
// AppShell and Navigation removed - AppLayout provides navigation
// import { AppShell } from '../../components/AppShell';
// import { PageHeader } from '../../components/PageHeader';
// import { Navigation } from '@common/components/Navigation';
import { Stack } from '../../components/ui/Stack';
import { Grid } from '../../components/ui/Grid';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface QuickAction {
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  permission?: Permission;
}

const quickActions: QuickAction[] = [
  {
    path: '/sell',
    label: 'New Sale',
    description: 'Start a new transaction',
    icon: ShoppingCart,
    color: 'bg-primary-600 hover:bg-primary-500',
    permission: 'access_sell',
  },
  {
    path: '/lookup',
    label: 'Product Lookup',
    description: 'Search inventory',
    icon: Search,
    color: 'bg-info-600 hover:bg-info-500',
    permission: 'access_sell',
  },
  {
    path: '/inventory',
    label: 'Inventory',
    description: 'Manage stock',
    icon: Package,
    color: 'bg-warning-600 hover:bg-warning-500',
    permission: 'access_inventory',
  },
  {
    path: '/customers',
    label: 'Customers',
    description: 'Customer management',
    icon: Users,
    color: 'bg-success-600 hover:bg-success-500',
    permission: 'access_sell',
  },
  {
    path: '/reporting',
    label: 'Reports',
    description: 'View analytics',
    icon: BarChart3,
    color: 'bg-surface-overlay hover:bg-surface-elevated',
    permission: 'access_admin',
  },
  {
    path: '/admin',
    label: 'Settings',
    description: 'System configuration',
    icon: Settings,
    color: 'bg-surface-overlay hover:bg-surface-overlay',
    permission: 'access_admin',
  },
];

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  time: string;
}

interface RecentTransaction {
  id: string;
  customer: string;
  amount: number;
  items: number;
  time: string;
  status: 'completed' | 'pending' | 'refunded';
}

interface DashboardStats {
  daily_sales: number;
  transactions: number;
  avg_transaction: number;
  items_sold: number;
}

export function HomePage() {
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all dashboard data in parallel
        const [statsData, alertsData, transactionsData] = await Promise.all([
          apiClient.get<DashboardStats>('/api/stats/dashboard'),
          apiClient.get<Alert[]>('/api/alerts/recent?limit=5'),
          apiClient.get<RecentTransaction[]>('/api/transactions/recent?limit=10'),
        ]);

        setStats(statsData);
        setAlerts(alertsData);
        setTransactions(transactionsData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const filteredActions = quickActions.filter(
    (action) => !action.permission || hasPermission(action.permission)
  );

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>
      
      <Stack gap="6">
        {/* Welcome Message */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-text-secondary">Welcome back! Here's what's happening today.</p>
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock size={18} />
            <span className="text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card padding="md" className="bg-error-500/10 border-error-500">
            <p className="text-error-400">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-accent" size={48} />
          </div>
        ) : (
          <Stack gap="6">
            {/* Stats Grid */}
            <Grid columns="4" gap="4" className="grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Today's Sales"
                value={stats ? `$${stats.daily_sales.toFixed(2)}` : '$0.00'}
                trend={stats && stats.daily_sales > 0 ? 'up' : undefined}
                trendValue={stats && stats.daily_sales > 0 ? 12.5 : undefined}
                icon={DollarSign}
                variant="default"
              />
              <StatCard
                label="Transactions"
                value={stats ? stats.transactions.toString() : '0'}
                trend={stats && stats.transactions > 0 ? 'up' : undefined}
                trendValue={stats && stats.transactions > 0 ? 8.2 : undefined}
                icon={ShoppingCart}
                variant="success"
              />
              <StatCard
                label="Avg. Transaction"
                value={stats ? `$${stats.avg_transaction.toFixed(2)}` : '$0.00'}
                icon={DollarSign}
                variant="warning"
              />
              <StatCard
                label="Items Sold"
                value={stats ? stats.items_sold.toString() : '0'}
                trend={stats && stats.items_sold > 0 ? 'up' : undefined}
                trendValue={stats && stats.items_sold > 0 ? 15.7 : undefined}
                icon={Package}
                variant="info"
              />
            </Grid>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
              <Grid columns="6" gap="3" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.path}
                      to={action.path}
                      className={cn(
                        'flex flex-col items-center gap-3 p-4 rounded-xl text-white transition-all',
                        action.color
                      )}
                    >
                      <Icon size={28} />
                      <div className="text-center">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs opacity-80 hidden sm:block">{action.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </Grid>
            </div>

            {/* Two column layout for alerts and transactions */}
            <Grid columns="2" gap="6" className="lg:grid-cols-2">
              {/* Alerts */}
              <Card padding="none">
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <AlertTriangle className="text-warning" size={20} />
                    Alerts
                  </h2>
                  {alerts.length > 0 && (
                    <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">
                      {alerts.length} new
                    </span>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No alerts at this time</p>
                    <p className="text-sm mt-2">All systems running smoothly</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="p-4 flex items-start gap-3">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                            alert.type === 'warning' && 'bg-warning',
                            alert.type === 'error' && 'bg-error',
                            alert.type === 'info' && 'bg-info'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm">{alert.message}</p>
                          <p className="text-text-muted text-xs mt-1">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {alerts.length > 0 && (
                  <div className="p-4 border-t border-border-subtle">
                    <Link
                      to="/inventory"
                      className="text-accent text-sm font-medium hover:text-accent-hover flex items-center gap-1"
                    >
                      View inventory <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </Card>

              {/* Recent Transactions */}
              <Card padding="none">
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <ShoppingCart className="text-accent" size={20} />
                    Recent Transactions
                  </h2>
                  <Link
                    to="/reporting"
                    className="text-xs bg-surface-2 text-text-secondary px-2 py-1 rounded-full hover:bg-surface-3"
                  >
                    View all
                  </Link>
                </div>
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No transactions yet today</p>
                    <p className="text-sm mt-2">Start your first sale to see it here</p>
                    <Link to="/sell" className="inline-block mt-4">
                      <Button variant="primary" size="md">
                        New Sale
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-2 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="text-text-secondary" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary font-medium truncate">{txn.customer}</span>
                            <span className="text-xs text-text-muted">{txn.id}</span>
                          </div>
                          <p className="text-text-secondary text-xs">
                            {txn.items} items • {txn.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-text-primary font-semibold">${txn.amount.toFixed(2)}</div>
                          <div
                            className={cn(
                              'text-xs',
                              txn.status === 'completed' && 'text-success',
                              txn.status === 'pending' && 'text-warning',
                              txn.status === 'refunded' && 'text-error'
                            )}
                          >
                            {txn.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Grid>
          </Stack>
        )}
      </Stack>
    </div>
  );
}

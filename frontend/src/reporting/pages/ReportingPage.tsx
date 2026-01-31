import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useConfig } from '../../config/ConfigProvider';
import { useSalesReportQuery, useSalesByCategoryQuery, getDateRange, downloadSalesReport } from '@domains/reporting/hooks';
import { toast } from '@common/components/molecules/Toast';
import { Button } from '@common/components/atoms/Button';

type ReportType = 'sales' | 'inventory' | 'customers' | 'products';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export function ReportingPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  useConfig(); // Config context for potential future use

  // Calculate date range params (pass custom dates when in custom mode)
  const dateParams = getDateRange(dateRange, customStartDate, customEndDate);

  // Fetch sales data using React Query
  const { data: salesData, isLoading: salesLoading, error: salesError } = useSalesReportQuery(dateParams);
  const { data: categoryData, isLoading: categoryLoading } = useSalesByCategoryQuery(dateParams);

  const isLoading = salesLoading || categoryLoading;
  const error = salesError ? salesError.message : null;
  const salesSummary = salesData?.summary;
  // Period changes are not currently returned by the API - use 0 as default
  const periodChanges = { revenue_change: 0, transaction_change: 0, avg_transaction_change: 0, items_change: 0 };

  // Calculate summary cards from API data with period comparison
  const summaryCards = salesSummary ? [
    { 
      label: 'Total Revenue', 
      value: `$${salesSummary.total_sales.toFixed(2)}`, 
      change: periodChanges?.revenue_change ?? 0,
      icon: DollarSign 
    },
    { 
      label: 'Transactions', 
      value: salesSummary.total_transactions.toString(), 
      change: periodChanges?.transaction_change ?? 0, 
      icon: ShoppingCart 
    },
    { 
      label: 'Avg. Transaction', 
      value: `$${salesSummary.average_transaction.toFixed(2)}`, 
      change: periodChanges?.avg_transaction_change ?? 0, 
      icon: TrendingUp 
    },
    { 
      label: 'Items Sold', 
      value: salesSummary.total_items_sold.toString(), 
      change: periodChanges?.items_change ?? 0, 
      icon: Package 
    },
  ] : [];

  // Calculate total revenue for percentage calculation
  const categorySales = categoryData || [];
  const totalRevenue = categorySales.reduce((sum, cat) => sum + cat.total_revenue, 0);

  // Transform category sales for display
  const salesByCategory = categorySales.map((cat, index) => ({
    category: cat.category,
    revenue: cat.total_revenue,
    percentage: totalRevenue > 0 ? (cat.total_revenue / totalRevenue) * 100 : 0,
    color: ['bg-primary-500', 'bg-warning-500', 'bg-success-500', 'bg-info-500'][index % 4],
  }));

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadSalesReport(dateParams);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-full bg-background-primary p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-text-tertiary text-sm">Track performance and make data-driven decisions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            leftIcon={isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            onClick={handleExport}
            disabled={isExporting || !salesSummary}
            loading={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Report type tabs */}
        <div className="flex gap-1 bg-surface-base rounded-lg p-1">
          {(['sales', 'inventory', 'customers', 'products'] as ReportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                reportType === type ? 'bg-primary-600 text-white' : 'text-text-tertiary hover:text-white'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex gap-1 bg-surface-base rounded-lg p-1">
          {(['today', 'week', 'month', 'quarter', 'year'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                dateRange === range ? 'bg-surface-elevated text-white' : 'text-text-tertiary hover:text-white'
              )}
            >
              {range}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          leftIcon={<Calendar size={18} />}
          rightIcon={<ChevronDown size={16} />}
          className="ml-auto"
          onClick={() => setShowCustomRange(!showCustomRange)}
        >
          Custom Range
        </Button>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomRange && (
        <div className="bg-surface-base border border-border rounded-lg p-4 mb-6 flex items-end gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">End Date</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (customStartDate && customEndDate) {
                setDateRange('custom');
                toast.success(`Report updated for ${customStartDate} to ${customEndDate}`);
                setShowCustomRange(false);
              } else {
                toast.error('Please select both start and end dates');
              }
            }}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowCustomRange(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error-900/20 border border-error-500 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-error-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-error-200 font-medium">Error Loading Report</p>
            <p className="text-error-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-text-tertiary">Loading report data...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !salesSummary && (
        <div className="bg-surface-base border border-border rounded-xl p-12 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-text-disabled" />
          <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
          <p className="text-text-tertiary">
            There is no sales data for the selected period. Try selecting a different date range.
          </p>
        </div>
      )}

      {/* Sales Summary Cards */}
      {!isLoading && salesSummary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((stat) => {
              const Icon = stat.icon;
              const isPositive = stat.change >= 0;
              return (
                <div
                  key={stat.label}
                  className="bg-surface-base border border-border rounded-xl p-4 md:p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-surface-elevated rounded-lg">
                      <Icon className="text-primary-400" size={20} />
                    </div>
                    {stat.change !== 0 && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-sm font-medium',
                          isPositive ? 'text-success-400' : 'text-error-400'
                        )}
                      >
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {Math.abs(stat.change)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-text-tertiary">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Charts and Tables */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sales by Category */}
            {salesByCategory.length > 0 ? (
              <div className="bg-surface-base border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Sales by Category</h2>
                <div className="space-y-4">
                  {salesByCategory.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-secondary">{cat.category}</span>
                        <span className="text-text-tertiary">${cat.revenue.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', cat.color)}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary">Total Revenue</span>
                    <span className="text-xl font-bold text-white">
                      ${totalRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-base border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Sales by Category</h2>
                <div className="text-center py-8 text-text-tertiary">
                  No category data available for this period
                </div>
              </div>
            )}

            {/* Sales Summary Chart */}
            <div className="bg-surface-base border border-border rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Sales Overview</h2>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary-500 rounded-full" />
                    <span className="text-text-tertiary">{dateRange === 'custom' ? 'Custom Period' : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</span>
                  </div>
                </div>
              </div>
              {salesSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-elevated rounded-lg p-4 text-center">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                    <p className="text-2xl font-bold text-white">${salesSummary.total_sales.toFixed(0)}</p>
                    <p className="text-xs text-text-tertiary">Total Revenue</p>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-success-500" />
                    <p className="text-2xl font-bold text-white">{salesSummary.total_transactions}</p>
                    <p className="text-xs text-text-tertiary">Transactions</p>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-warning-500" />
                    <p className="text-2xl font-bold text-white">${salesSummary.average_transaction.toFixed(0)}</p>
                    <p className="text-xs text-text-tertiary">Avg Transaction</p>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-4 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-info-500" />
                    <p className="text-2xl font-bold text-white">{salesSummary.total_items_sold}</p>
                    <p className="text-xs text-text-tertiary">Items Sold</p>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-text-tertiary">
                  <div className="text-center">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sales data for this period</p>
                  </div>
                </div>
              )}
              
              {/* Category Breakdown Bar Chart */}
              {salesByCategory.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue by Category</h3>
                  <div className="flex items-end gap-2 h-32">
                    {salesByCategory.map((cat, index) => {
                      const maxRevenue = Math.max(...salesByCategory.map(c => c.revenue));
                      const heightPercent = maxRevenue > 0 ? (cat.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={cat.category} className="flex-1 flex flex-col items-center">
                          <div 
                            className={cn('w-full rounded-t', cat.color)}
                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                            title={`${cat.category}: $${cat.revenue.toFixed(2)}`}
                          />
                          <p className="text-xs text-text-tertiary mt-2 truncate w-full text-center">
                            {cat.category.length > 8 ? cat.category.slice(0, 8) + '...' : cat.category}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

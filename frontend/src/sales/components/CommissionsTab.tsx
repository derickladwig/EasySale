import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  DollarSign, 
  Plus, 
  RefreshCw,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { useCommissionRules, useCommissionReport } from '../hooks';

const CommissionsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const { data: rules, isLoading: rulesLoading } = useCommissionRules();
  const { data: report, isLoading: reportLoading } = useCommissionReport(
    dateRange.startDate,
    dateRange.endDate
  );

  const totalCommissions = report?.reduce((sum, emp) => sum + emp.totalCommission, 0) || 0;
  const totalSales = report?.reduce((sum, emp) => sum + emp.totalSales, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Total Sales
            </div>
            <div className="text-2xl font-bold text-text-primary">${totalSales.toFixed(2)}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Total Commissions
            </div>
            <div className="text-2xl font-bold text-success">${totalCommissions.toFixed(2)}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
              <Users className="w-4 h-4" />
              Active Rules
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {rules?.filter(r => r.isActive).length || 0}
            </div>
          </div>
        </Card>
      </div>

      {/* Commission Rules */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Commission Rules</h3>
            <Button variant="primary" size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Rule
            </Button>
          </div>
          
          {rulesLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-4 text-text-tertiary">No commission rules configured</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    rule.isActive ? 'bg-surface-elevated' : 'bg-surface-elevated/50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-text-primary">{rule.name}</div>
                    <div className="text-sm text-text-tertiary">
                      {rule.type === 'percentage' ? `${rule.value}%` : `$${rule.value}`}
                      {rule.categoryId && ' • Category specific'}
                      {rule.minSaleAmount && ` • Min $${rule.minSaleAmount}`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    rule.isActive ? 'bg-success/20 text-success' : 'bg-surface-overlay text-text-disabled'
                  }`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Commission Report */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Commission Report</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-2 py-1 bg-surface-base border border-border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-text-tertiary">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-2 py-1 bg-surface-base border border-border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {reportLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : !report || report.length === 0 ? (
            <div className="text-center py-4 text-text-tertiary">No commission data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-tertiary text-sm border-b border-border">
                    <th className="pb-2">Employee</th>
                    <th className="pb-2 text-right">Sales</th>
                    <th className="pb-2 text-right">Commission</th>
                    <th className="pb-2 text-right">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((emp) => (
                    <tr key={emp.employeeId} className="border-b border-border/50">
                      <td className="py-3 text-text-primary">{emp.employeeName}</td>
                      <td className="py-3 text-right text-text-secondary">${emp.totalSales.toFixed(2)}</td>
                      <td className="py-3 text-right text-success">${emp.totalCommission.toFixed(2)}</td>
                      <td className="py-3 text-right text-text-tertiary">{emp.transactions.length}</td>
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

export default CommissionsTab;

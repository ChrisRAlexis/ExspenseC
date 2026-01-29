'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MonthlyData {
  month: string;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DashboardChartsProps {
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL: '#059669',
  MEALS: '#0891b2',
  LODGING: '#7c3aed',
  TRANSPORTATION: '#db2777',
  OTHER: '#64748b',
};

export function DashboardCharts({ monthlyData, categoryData }: DashboardChartsProps) {
  const hasMonthlyData = monthlyData.some(d => d.amount > 0);
  const hasCategoryData = categoryData.length > 0 && categoryData.some(d => d.value > 0);

  return (
    <div className="grid md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
      {/* Spending Trend Chart */}
      <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100/80 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="font-semibold text-slate-800">Spending Trend</h3>
        </div>

        {hasMonthlyData ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Spent']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#spendingGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">No spending data yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100/80 rounded-lg flex items-center justify-center">
            <PieChartIcon className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="font-semibold text-slate-800">By Category</h3>
        </div>

        {hasCategoryData ? (
          <div className="flex items-center gap-4">
            <div className="h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), 'Amount']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600 capitalize">
                      {item.name.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[160px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                <PieChartIcon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">No category data yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickInsights({
  totalExpenses,
  avgExpense,
  topCategory
}: {
  totalExpenses: number;
  avgExpense: number;
  topCategory: string | null;
}) {
  return (
    <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-2xl p-5 text-white animate-slide-up" style={{ animationDelay: '150ms' }}>
      <h3 className="font-semibold text-emerald-100 text-sm uppercase tracking-wide mb-3 text-center">Quick Insights</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{totalExpenses}</p>
          <p className="text-emerald-200 text-sm">Total Submissions</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{formatCurrency(avgExpense)}</p>
          <p className="text-emerald-200 text-sm">Avg. per Expense</p>
        </div>
        <div>
          <p className="text-2xl font-bold capitalize">{topCategory?.toLowerCase() || '-'}</p>
          <p className="text-emerald-200 text-sm">Top Category</p>
        </div>
      </div>
    </div>
  );
}

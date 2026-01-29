'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  category: string;
  status: string;
  tripName: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  user: { id: string; name: string; department: string | null };
  items: Array<{ description: string; amount: number }>;
}

interface User {
  id: string;
  name: string;
  department: string | null;
  role: string;
}

interface Props {
  expenses: Expense[];
  users: User[];
  embedded?: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
  DRAFT: '#94a3b8',
  CHANGES_REQUESTED: '#f97316',
};

const dateRanges = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'all', label: 'All time' },
];

export function ReportsClient({ expenses, users, embedded = false }: Props) {
  const [dateRange, setDateRange] = useState('30');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');

  // Get unique departments from actual data
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    users.forEach(u => {
      if (u.department) depts.add(u.department);
    });
    return [
      { value: 'all', label: 'All Depts' },
      ...Array.from(depts).sort().map(d => ({
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1)
      }))
    ];
  }, [users]);

  // Get unique categories from actual data
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach(e => cats.add(e.category));
    return [
      { value: 'all', label: 'All Categories' },
      ...Array.from(cats).sort().map(c => ({
        value: c,
        label: c.charAt(0) + c.slice(1).toLowerCase()
      }))
    ];
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Date filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= cutoff);
    }

    // Department filter (case-insensitive)
    if (department !== 'all') {
      filtered = filtered.filter((e) =>
        e.user.department?.toLowerCase() === department.toLowerCase()
      );
    }

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter((e) => e.status === status);
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter((e) => e.category === category);
    }

    return filtered;
  }, [expenses, dateRange, department, status, category]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const approved = filteredExpenses
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const pending = filteredExpenses
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const avgPerExpense = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;

    return { total, approved, pending, avgPerExpense, count: filteredExpenses.length };
  }, [filteredExpenses]);

  // Chart data
  const categoryData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.totalAmount;
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const statusData = useMemo(() => {
    const byStatus: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });
    return Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const departmentData = useMemo(() => {
    const byDept: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const dept = e.user.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + e.totalAmount;
    });
    return Object.entries(byDept)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map((month) => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthExpenses = expenses.filter((e) => {
        const date = new Date(e.createdAt);
        return date >= start && date <= end;
      });

      return {
        month: format(month, 'MMM'),
        total: monthExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
        approved: monthExpenses
          .filter((e) => e.status === 'APPROVED')
          .reduce((sum, e) => sum + e.totalAmount, 0),
        count: monthExpenses.length,
      };
    });
  }, [expenses]);

  const topSpenders = useMemo(() => {
    const byUser: Record<string, { name: string; total: number; count: number }> = {};
    filteredExpenses.forEach((e) => {
      if (!byUser[e.user.id]) {
        byUser[e.user.id] = { name: e.user.name, total: 0, count: 0 };
      }
      byUser[e.user.id].total += e.totalAmount;
      byUser[e.user.id].count += 1;
    });
    return Object.values(byUser)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredExpenses]);

  // Export functions
  function exportToCSV() {
    const headers = [
      'ID',
      'Title',
      'Amount',
      'Category',
      'Status',
      'Employee',
      'Department',
      'Trip',
      'Submitted',
      'Approved',
    ];

    const rows = filteredExpenses.map((e) => [
      e.id,
      e.title,
      e.totalAmount.toFixed(2),
      e.category,
      e.status,
      e.user.name,
      e.user.department || '',
      e.tripName || '',
      e.submittedAt ? format(new Date(e.submittedAt), 'yyyy-MM-dd') : '',
      e.approvedAt ? format(new Date(e.approvedAt), 'yyyy-MM-dd') : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csv, 'expenses-report.csv', 'text/csv');
  }

  function exportDetailedCSV() {
    const headers = [
      'Expense ID',
      'Expense Title',
      'Item Description',
      'Item Amount',
      'Category',
      'Status',
      'Employee',
      'Department',
    ];

    const rows: string[][] = [];
    filteredExpenses.forEach((e) => {
      e.items.forEach((item) => {
        rows.push([
          e.id,
          e.title,
          item.description,
          item.amount.toFixed(2),
          e.category,
          e.status,
          e.user.name,
          e.user.department || '',
        ]);
      });
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csv, 'expenses-detailed-report.csv', 'text/csv');
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 animate-fade-in overflow-x-hidden">
      {/* Header */}
      {!embedded && <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">Reports & Analytics</h1>}

      {/* Filters & Export */}
      <div className="flex items-center gap-2 py-2 px-3 bg-white/30 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <Filter className="h-3.5 w-3.5 text-emerald-600/60 shrink-0" />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="text-xs py-1.5 px-2.5 pr-6 rounded-xl border border-white/70 bg-white/50 backdrop-blur-xl appearance-none shadow-sm hover:bg-white/70 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {dateRanges.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="text-xs py-1.5 px-2.5 pr-6 rounded-xl border border-white/70 bg-white/50 backdrop-blur-xl appearance-none shadow-sm hover:bg-white/70 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {departmentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs py-1.5 px-2.5 pr-6 rounded-xl border border-white/70 bg-white/50 backdrop-blur-xl appearance-none shadow-sm hover:bg-white/70 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All Status</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs py-1.5 px-2.5 pr-6 rounded-xl border border-white/70 bg-white/50 backdrop-blur-xl appearance-none shadow-sm hover:bg-white/70 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-1.5 ml-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-7 px-2.5 text-xs bg-white/50 border-white/70 hover:bg-white/70 shadow-sm">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={exportDetailedCSV} className="h-7 px-2.5 text-xs bg-white/50 border-white/70 hover:bg-white/70 shadow-sm">
            <FileText className="h-3 w-3 mr-1" />
            Detailed
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-indigo-400/80 to-indigo-500/80 text-white border-0">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-indigo-100 text-xs sm:text-sm font-medium truncate">Total Expenses</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(stats.total)}</p>
                <p className="text-indigo-200 text-xs mt-1">{stats.count} expenses</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                <DollarSign className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-400/80 to-emerald-500/80 text-white border-0">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-emerald-100 text-xs sm:text-sm font-medium truncate">Approved</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(stats.approved)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span className="text-xs truncate">Ready</span>
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-400/80 to-amber-500/80 text-white border-0">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-amber-100 text-xs sm:text-sm font-medium truncate">Pending</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(stats.pending)}</p>
                <p className="text-amber-200 text-xs mt-1 truncate">Awaiting</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-400/80 to-purple-500/80 text-white border-0">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-purple-100 text-xs sm:text-sm font-medium truncate">Average</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(stats.avgPerExpense)}</p>
                <p className="text-purple-200 text-xs mt-1 truncate">Per expense</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Trend */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-52 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ left: -20, right: 5 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickMargin={5} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatCurrency(value as number), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    fill="url(#colorTotal)"
                    strokeWidth={2}
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    stroke="#10b981"
                    fill="url(#colorApproved)"
                    strokeWidth={2}
                    name="Approved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="flex items-center gap-4">
              <div className="h-44 sm:h-56 w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), 'Amount']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-600 text-xs sm:text-sm truncate">
                        {item.name.charAt(0) + item.name.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* By Department */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              By Department
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-52 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical" margin={{ left: 0, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={60} tickFormatter={(v) => v.length > 8 ? v.slice(0, 8) + '..' : v} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), 'Total']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Spenders */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              Top Spenders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {topSpenders.map((user, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-medium text-slate-700/90 text-sm truncate">{user.name}</span>
                      <span className="font-semibold text-slate-600/90 text-sm shrink-0">{formatCurrency(user.total)}</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${(user.total / topSpenders[0].total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{user.count} expenses</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            {statusData.map((item) => (
              <div
                key={item.name}
                className="p-2 sm:p-4 rounded-xl text-center"
                style={{ backgroundColor: `${STATUS_COLORS[item.name]}15` }}
              >
                <p
                  className="text-xl sm:text-2xl font-bold"
                  style={{ color: STATUS_COLORS[item.name] }}
                >
                  {item.value}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate">{item.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

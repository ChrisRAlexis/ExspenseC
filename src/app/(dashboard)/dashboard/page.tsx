import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Receipt, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardCharts, QuickInsights } from '@/components/dashboard-charts';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL: '#059669',
  MEALS: '#0891b2',
  LODGING: '#7c3aed',
  TRANSPORTATION: '#db2777',
  OTHER: '#64748b',
};

async function getDashboardData(userId: string) {
  // Get last 6 months for chart
  const sixMonthsAgo = subMonths(new Date(), 5);

  const [expenses, recentExpenses, stats, allExpenses] = await Promise.all([
    // Monthly aggregation for chart
    prisma.expense.findMany({
      where: {
        userId,
        createdAt: { gte: startOfMonth(sixMonthsAgo) },
      },
      select: {
        totalAmount: true,
        category: true,
        createdAt: true,
        status: true,
      },
    }),
    // Recent expenses for list
    prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { receipts: true },
    }),
    // Stats by status
    prisma.expense.groupBy({
      by: ['status'],
      where: { userId },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // All expenses for insights
    prisma.expense.findMany({
      where: { userId },
      select: { totalAmount: true, category: true },
    }),
  ]);

  // Process monthly data
  const monthlyMap = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(now, i);
    monthlyMap.set(format(month, 'MMM'), 0);
  }

  expenses.forEach((e) => {
    const monthKey = format(new Date(e.createdAt), 'MMM');
    if (monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + e.totalAmount);
    }
  });

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Process category data
  const categoryMap = new Map<string, number>();
  allExpenses.forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.totalAmount);
  });

  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#64748b',
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate insights
  const totalAmount = allExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const avgExpense = allExpenses.length > 0 ? totalAmount / allExpenses.length : 0;
  const topCategory = categoryData[0]?.name || null;

  return {
    recentExpenses,
    stats,
    monthlyData,
    categoryData,
    insights: {
      totalExpenses: allExpenses.length,
      avgExpense,
      topCategory,
    },
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { recentExpenses, stats, monthlyData, categoryData, insights } = await getDashboardData(session.user.id);

  const totalApproved = stats.find((s) => s.status === 'APPROVED')?._sum.totalAmount || 0;
  const totalPending = stats.find((s) => s.status === 'PENDING')?._sum.totalAmount || 0;
  const pendingCount = stats.find((s) => s.status === 'PENDING')?._count || 0;
  const approvedCount = stats.find((s) => s.status === 'APPROVED')?._count || 0;
  const rejectedCount = stats.find((s) => s.status === 'REJECTED')?._count || 0;

  return (
    <div className="max-w-6xl mx-auto">
    <div className="space-y-5 relative">
      {/* Welcome Header */}
      <div className="animate-slide-up text-center">
        <h1 className="text-2xl font-semibold text-emerald-800/80">
          Welcome back, {session.user.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500/80 mt-1">Here's your expense overview</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up">
        <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:bg-white/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100/50 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-500/80" />
            </div>
            <p className="text-xs font-medium text-slate-400/90 uppercase tracking-wide">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-amber-600/80">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-400/80 mt-1">{pendingCount} expense{pendingCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:bg-white/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100/50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-500/80" />
            </div>
            <p className="text-xs font-medium text-slate-400/90 uppercase tracking-wide">Approved</p>
          </div>
          <p className="text-2xl font-semibold text-emerald-600/80">{formatCurrency(totalApproved)}</p>
          <p className="text-xs text-slate-400/80 mt-1">{approvedCount} expense{approvedCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:bg-white/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-100/50 rounded-lg flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-400/80" />
            </div>
            <p className="text-xs font-medium text-slate-400/90 uppercase tracking-wide">Rejected</p>
          </div>
          <p className="text-2xl font-semibold text-red-400/80">{rejectedCount}</p>
          <p className="text-xs text-slate-400/80 mt-1">expense{rejectedCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts monthlyData={monthlyData} categoryData={categoryData} />

      {/* Quick Insights */}
      <QuickInsights
        totalExpenses={insights.totalExpenses}
        avgExpense={insights.avgExpense}
        topCategory={insights.topCategory}
      />

      {/* Recent Expenses */}
      <div className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between p-5 border-b border-white/50">
          <h2 className="font-semibold text-emerald-800/80">Recent Expenses</h2>
          <Link
            href="/expenses"
            className="text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors font-medium"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-5">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/50">
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No expenses yet</p>
              <p className="text-slate-500 text-sm mt-1">Create your first expense to get started</p>
              <Link
                href="/expenses/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-sm font-medium hover:bg-emerald-800 transition-colors"
              >
                Create Expense
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/35 hover:bg-white/45 border border-white/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-emerald-100/60 rounded-xl flex items-center justify-center shrink-0">
                      <Receipt className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700/90 truncate">{expense.title}</p>
                      <p className="text-sm text-slate-500">{formatDate(expense.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-slate-700/90">{formatCurrency(expense.totalAmount)}</p>
                    <Badge variant={expense.status.toLowerCase() as any}>
                      {expense.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Receipt, Clock, CheckCircle, XCircle, DollarSign, TrendingUp, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

async function getApprovalData(userId: string, role: string) {
  // Get pending expenses that need approval
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      status: 'PENDING',
      userId: { not: userId }, // Can't approve own expenses
    },
    orderBy: { submittedAt: 'desc' },
    include: {
      user: {
        include: {
          manager: true,
        },
      },
      items: true,
      receipts: true,
      workflow: {
        include: {
          steps: {
            include: { approver: true },
            orderBy: { stepOrder: 'asc' },
          },
        },
      },
    },
  });

  // Filter to only show expenses where current user is the next approver
  // or if current user is the submitter's manager
  const filteredExpenses = pendingExpenses.filter((expense) => {
    if (role === 'ADMIN') return true; // Admins can see all

    // Check if current user is the employee's manager
    if (expense.user.managerId === userId) return true;

    if (!expense.workflow) return role === 'APPROVER';

    const currentStep = expense.workflow.steps[expense.currentStep];
    return currentStep?.approverId === userId;
  });

  // Get user's approval history
  const approvalHistory = await prisma.approvalAction.findMany({
    where: { approverId: userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      expense: {
        include: {
          user: true,
          items: true,
        },
      },
    },
  });

  // Calculate stats
  const totalPendingAmount = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const approvedThisMonth = approvalHistory.filter(
    (a) => a.action === 'APPROVED' && new Date(a.createdAt).getMonth() === new Date().getMonth()
  );
  const totalApprovedAmount = approvedThisMonth.reduce((sum, a) => sum + a.expense.totalAmount, 0);

  // High value expenses (over $500)
  const highValueCount = filteredExpenses.filter((e) => e.totalAmount > 500).length;

  return {
    pendingExpenses: filteredExpenses,
    approvalHistory,
    stats: {
      totalPendingAmount,
      totalApprovedAmount,
      highValueCount,
      approvedCount: approvedThisMonth.length,
    }
  };
}

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { pendingExpenses, approvalHistory, stats } = await getApprovalData(
    session.user.id,
    session.user.role
  );

  const isApprover = session.user.role === 'APPROVER' || session.user.role === 'ADMIN';

  if (!isApprover) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">Approvals</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              You don&apos;t have approval permissions.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Contact an admin to request approver access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">Approvals</h1>
          <p className="text-slate-400/80 text-sm mt-1">Review and approve expenses</p>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <a href="#pending" className="block">
          <Card className="bg-gradient-to-br from-amber-400/80 to-amber-500/80 text-white border-0 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-amber-100 text-xs font-medium truncate">Pending</p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">{pendingExpenses.length}</p>
                  <p className="text-amber-200 text-xs mt-0.5 truncate">{formatCurrency(stats.totalPendingAmount)}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <Clock className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href="#history" className="block">
          <Card className="bg-gradient-to-br from-emerald-400/80 to-emerald-500/80 text-white border-0 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-emerald-100 text-xs font-medium truncate">Approved</p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">{stats.approvedCount}</p>
                  <p className="text-emerald-200 text-xs mt-0.5 truncate">{formatCurrency(stats.totalApprovedAmount)}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href="#pending" className="block">
          <Card className="bg-gradient-to-br from-red-400/80 to-red-500/80 text-white border-0 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-red-100 text-xs font-medium truncate">High Value</p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">{stats.highValueCount}</p>
                  <p className="text-red-200 text-xs mt-0.5 truncate">&gt;$500</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href="#history" className="block">
          <Card className="bg-gradient-to-br from-indigo-400/80 to-indigo-500/80 text-white border-0 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-indigo-100 text-xs font-medium truncate">Rejected</p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">
                    {approvalHistory.filter((a) => a.action === 'REJECTED').length}
                  </p>
                  <p className="text-indigo-200 text-xs mt-0.5 truncate">All time</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <XCircle className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Pending Approvals */}
      <Card id="pending" className="overflow-hidden scroll-mt-24">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            Pending ({pendingExpenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {pendingExpenses.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
              <p className="text-slate-500">All caught up!</p>
              <p className="text-sm text-slate-400">No expenses pending your review.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pendingExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block p-3 sm:p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 hover:border-slate-200"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {expense.user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <p className="font-semibold text-slate-700/90 text-sm sm:text-base truncate">{expense.title}</p>
                          {expense.totalAmount > 500 && (
                            <span className="text-xs px-1 sm:px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full shrink-0">
                              High
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">
                          {expense.user.name}
                          {expense.user.department && (
                            <span className="text-slate-400"> · {expense.user.department}</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 sm:mt-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            {expense.receipts.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {expense.items.length}
                          </span>
                          <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded">
                            {expense.category.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base sm:text-lg font-bold text-slate-600/90">{formatCurrency(expense.totalAmount)}</p>
                      <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                        {formatDate(expense.submittedAt!)}
                      </p>
                      <Badge variant="pending" className="mt-1 sm:mt-2 text-xs">Review</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {approvalHistory.length > 0 && (
        <Card id="history" className="overflow-hidden scroll-mt-24">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Your Approval History</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {approvalHistory.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between py-2 sm:py-3 px-2 sm:px-3 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      action.action === 'APPROVED'
                        ? 'bg-emerald-100'
                        : action.action === 'REJECTED'
                        ? 'bg-red-100'
                        : 'bg-orange-100'
                    }`}>
                      {action.action === 'APPROVED' ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                      ) : action.action === 'REJECTED' ? (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700/90 text-sm truncate">
                        {action.expense.title}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">
                        {action.expense.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2 sm:ml-4">
                    <p className="font-semibold text-slate-600/90 text-sm">{formatCurrency(action.expense.totalAmount)}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{formatDate(action.createdAt)}</p>
                    <Badge
                      variant={
                        action.action === 'APPROVED'
                          ? 'approved'
                          : action.action === 'REJECTED'
                          ? 'rejected'
                          : 'changes'
                      }
                      className="mt-1 text-xs"
                    >
                      {action.action === 'CHANGES_REQUESTED' ? 'Changes' : action.action}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

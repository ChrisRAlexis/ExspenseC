import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  Calendar,
  Tag,
  MapPin,
  FileText,
  User,
  Clock,
  Building2,
  Briefcase,
  ListTodo,
  Zap,
  DollarSign,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExpenseActions } from './expense-actions';
import { EditableExpenseDetails, EditableLineItems } from './editable-expense';

async function getExpense(id: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      items: true,
      receipts: true,
      approvalActions: {
        include: { approver: true },
        orderBy: { createdAt: 'desc' },
      },
      workflow: {
        include: {
          steps: {
            include: { approver: true },
            orderBy: { stepOrder: 'asc' },
          },
        },
      },
      user: {
        include: {
          manager: true,
        },
      },
      property: true,
      job: true,
      task: true,
      payouts: {
        include: { paidBy: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!expense) return null;

  // Check if user owns the expense or is an approver/admin
  const session = await getServerSession(authOptions);
  if (expense.userId !== userId && session?.user.role === 'EMPLOYEE') {
    return null;
  }

  return expense;
}

const statusVariants: Record<string, any> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes',
  PAID: 'paid',
};

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const expense = await getExpense(id, session.user.id);
  if (!expense) notFound();

  const isOwner = expense.userId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const canApprove = !isOwner && (session.user.role === 'APPROVER' || isAdmin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/expenses"
            className="p-2 -ml-2 hover:bg-white/50 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">{expense.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={statusVariants[expense.status] as any}>
                {expense.status.replace('_', ' ')}
              </Badge>
              {expense.autoApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Zap className="h-3 w-3" /> Auto-Approved
                </span>
              )}
              {expense.property && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {expense.property.name}
                  {expense.job && (
                    <><span className="text-slate-300 mx-0.5">/</span>{expense.job.name}</>
                  )}
                  {expense.task && (
                    <><span className="text-slate-300 mx-0.5">/</span>{expense.task.name}</>
                  )}
                </span>
              )}
              {!expense.property && expense.tripName && (
                <span className="text-sm text-slate-500">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {expense.tripName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl sm:text-2xl font-semibold text-slate-600/90">
            {formatCurrency(expense.totalAmount)}
          </p>
        </div>
      </div>

      {/* Expense Details - Editable for Admins */}
      <EditableExpenseDetails expense={expense} isAdmin={isAdmin} />

      {/* Line Items - Editable for Admins */}
      <EditableLineItems expense={expense} isAdmin={isAdmin} />

      {/* Receipts */}
      {expense.receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {expense.receipts.map((receipt) => (
                <a
                  key={receipt.id}
                  href={receipt.imagePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-[3/4] bg-white/60 rounded-xl overflow-hidden hover:opacity-80 transition-opacity border border-white/50"
                >
                  <img
                    src={receipt.imagePath}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {expense.approvalActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expense.approvalActions.map((action) => (
                <div key={action.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-emerald-700">
                      {action.approver.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{action.approver.name}</span>
                      <Badge variant={action.action === 'APPROVED' ? 'approved' : action.action === 'REJECTED' ? 'rejected' : 'changes'}>
                        {action.action}
                      </Badge>
                    </div>
                    {action.comments && (
                      <p className="text-sm text-slate-600 mt-1">{action.comments}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(action.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow Status */}
      {expense.workflow && expense.status === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.workflow.steps.map((step, index) => {
                const isComplete = index < expense.currentStep;
                const isCurrent = index === expense.currentStep;
                // If approver is null, use the employee's manager (manager-based workflow)
                const approverName = step.approver?.name || expense.user.manager?.name || 'Manager';
                const approverLabel = step.approver ? approverName : `${approverName} (Manager)`;

                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isComplete
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCurrent ? 'text-primary-700' : 'text-slate-700'}`}>
                        {approverLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isComplete ? 'Approved' : isCurrent ? 'Pending review' : 'Waiting'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Info */}
      {expense.payouts && expense.payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Payment Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expense.payouts.map((payout: any) => (
                <div key={payout.id} className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {payout.paymentMethod.replace('_', ' ')} — {formatCurrency(payout.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Paid by {payout.paidBy.name} on {formatDate(payout.createdAt)}
                      {payout.referenceNumber && ` · Ref: ${payout.referenceNumber}`}
                    </p>
                    {payout.notes && <p className="text-xs text-slate-500 mt-1">{payout.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <ExpenseActions expense={expense} isOwner={isOwner} canApprove={canApprove} isAdmin={isAdmin} />
    </div>
  );
}

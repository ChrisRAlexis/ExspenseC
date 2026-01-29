import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserManagement } from './user-management';
import { Users, Shield, Briefcase, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
      managerId: true,
      manager: {
        select: { name: true },
      },
      directReports: {
        select: { id: true },
      },
      _count: {
        select: { expenses: true },
      },
      expenses: {
        select: {
          totalAmount: true,
          status: true,
        },
      },
    },
  });

  // Calculate aggregated stats
  return users.map(user => ({
    ...user,
    totalExpenseAmount: user.expenses.reduce((sum, e) => sum + e.totalAmount, 0),
    pendingCount: user.expenses.filter(e => e.status === 'PENDING').length,
    approvedCount: user.expenses.filter(e => e.status === 'APPROVED').length,
    directReportsCount: user.directReports.length,
    managerName: user.manager?.name || null,
  }));
}

async function getStats() {
  const [totalUsers, admins, approvers, employees, totalExpenseAmount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'APPROVER' } }),
    prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    prisma.expense.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'APPROVED' },
    }),
  ]);

  return {
    totalUsers,
    admins,
    approvers,
    employees,
    totalExpenseAmount: totalExpenseAmount._sum.totalAmount || 0,
  };
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const [users, stats] = await Promise.all([getUsers(), getStats()]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">User Management</h1>
          <p className="text-slate-400/80 mt-1">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-400/80 to-indigo-500/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
                <p className="text-indigo-200 text-xs mt-1">Active accounts</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-400/80 to-purple-500/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Admins</p>
                <p className="text-2xl font-bold mt-1">{stats.admins}</p>
                <p className="text-purple-200 text-xs mt-1">Full access</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-400/80 to-amber-500/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Approvers</p>
                <p className="text-2xl font-bold mt-1">{stats.approvers}</p>
                <p className="text-amber-200 text-xs mt-1">Can approve expenses</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-400/80 to-emerald-500/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Approved</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExpenseAmount)}</p>
                <p className="text-emerald-200 text-xs mt-1">All time expenses</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement initialUsers={users} />
        </CardContent>
      </Card>
    </div>
  );
}

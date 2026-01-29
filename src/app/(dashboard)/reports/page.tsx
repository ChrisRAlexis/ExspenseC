import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReportsPageTabs } from './reports-page-tabs';

async function getReportData() {
  const [expenses, users] = await Promise.all([
    prisma.expense.findMany({
      include: {
        user: { select: { id: true, name: true, department: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, department: true, role: true },
    }),
  ]);

  return { expenses, users };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role === 'EMPLOYEE') redirect('/dashboard');

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'analytics';

  const { expenses, users } = await getReportData();

  return (
    <ReportsPageTabs
      activeTab={activeTab}
      expenses={expenses}
      users={users}
    />
  );
}

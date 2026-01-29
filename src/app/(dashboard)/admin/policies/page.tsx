import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PolicyManagement } from './policy-management';

export default async function PoliciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard');

  const [policies, approvers, categories, properties] = await Promise.all([
    prisma.approvalPolicy.findMany({
      include: {
        category: true,
        property: true,
        job: true,
        steps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: 'asc' },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { priority: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: { in: ['APPROVER', 'ADMIN'] } },
      select: { id: true, name: true, email: true, department: true },
    }),
    prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.property.findMany({
      where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
      include: { jobs: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <PolicyManagement
      initialPolicies={JSON.parse(JSON.stringify(policies))}
      approvers={approvers}
      categories={categories}
      properties={JSON.parse(JSON.stringify(properties))}
    />
  );
}

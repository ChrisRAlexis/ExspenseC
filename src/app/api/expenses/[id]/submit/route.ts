import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findMatchingPolicy } from '@/lib/approval-policy';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  if (expense.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (expense.status !== 'DRAFT' && expense.status !== 'CHANGES_REQUESTED') {
    return NextResponse.json(
      { error: 'Expense is already submitted' },
      { status: 400 }
    );
  }

  if (expense.items.length === 0) {
    return NextResponse.json(
      { error: 'Expense must have at least one line item' },
      { status: 400 }
    );
  }

  // Check unified approval policies
  const result = await findMatchingPolicy({
    amount: expense.totalAmount,
    category: expense.category,
    propertyId: expense.propertyId,
    jobId: expense.jobId,
    userRole: session.user.role,
  });

  if (result.action === 'AUTO_APPROVE') {
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        submittedAt: new Date(),
        approvedAt: new Date(),
        autoApproved: true,
        policyId: result.policy?.id || null,
      },
    });
    return NextResponse.json({ expense: updated, autoApproved: true });
  }

  if (result.action === 'ROUTE_TO_APPROVERS' && result.policy) {
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
        currentStep: 0,
        policyId: result.policy.id,
      },
    });
    return NextResponse.json({ expense: updated });
  }

  // NO_MATCH — fallback: check legacy workflows, then default to PENDING
  const workflow = await findLegacyWorkflow(expense, session.user.department);

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      status: 'PENDING',
      submittedAt: new Date(),
      currentStep: 0,
      workflowId: workflow?.id || null,
    },
  });

  return NextResponse.json({ expense: updated });
}

async function findLegacyWorkflow(expense: any, userDepartment: string | null) {
  const workflows = await prisma.approvalWorkflow.findMany({
    where: { isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  for (const workflow of workflows) {
    if (!workflow.conditions) continue;
    const conditions = JSON.parse(workflow.conditions);

    if (conditions.departments?.length > 0) {
      if (!userDepartment || !conditions.departments.includes(userDepartment)) continue;
    }
    if (conditions.minAmount && expense.totalAmount < conditions.minAmount) continue;
    if (conditions.maxAmount && expense.totalAmount > conditions.maxAmount) continue;
    if (conditions.categories?.length > 0) {
      if (!conditions.categories.includes(expense.category)) continue;
    }
    return workflow;
  }

  return workflows.find(w => w.isDefault) || workflows[0] || null;
}

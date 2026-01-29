import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const policies = await prisma.approvalPolicy.findMany({
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
  });

  return NextResponse.json(policies);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name, description, actionType, priority,
    maxAmount, minAmount, categoryId, propertyId, jobId, userRole,
    routingType, steps,
  } = body;

  if (!name || !actionType) {
    return NextResponse.json({ error: 'Name and action type are required' }, { status: 400 });
  }

  if (actionType === 'ROUTE_TO_APPROVERS' && (!steps || steps.length === 0)) {
    return NextResponse.json({ error: 'At least one approver is required for routing policies' }, { status: 400 });
  }

  const policy = await prisma.approvalPolicy.create({
    data: {
      name,
      description: description || null,
      actionType,
      priority: priority || 0,
      maxAmount: maxAmount ? parseFloat(maxAmount) : null,
      minAmount: minAmount ? parseFloat(minAmount) : null,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      jobId: jobId || null,
      userRole: userRole || null,
      routingType: actionType === 'ROUTE_TO_APPROVERS' ? (routingType || 'SEQUENTIAL') : null,
      steps: actionType === 'ROUTE_TO_APPROVERS' && steps ? {
        create: steps.map((step: any, index: number) => ({
          approverId: step.approverId,
          stepOrder: index,
          isRequired: step.isRequired !== false,
        })),
      } : undefined,
    },
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
  });

  return NextResponse.json(policy);
}

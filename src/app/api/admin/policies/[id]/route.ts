import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Handle simple toggle
  if (body.isActive !== undefined && Object.keys(body).length === 1) {
    const updated = await prisma.approvalPolicy.update({
      where: { id },
      data: { isActive: body.isActive },
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
    return NextResponse.json(updated);
  }

  const {
    name, description, actionType, priority, isActive,
    maxAmount, minAmount, categoryId, propertyId, jobId, userRole,
    routingType, steps,
  } = body;

  // Delete existing steps and recreate
  await prisma.approvalPolicyStep.deleteMany({ where: { policyId: id } });

  const updated = await prisma.approvalPolicy.update({
    where: { id },
    data: {
      name,
      description: description || null,
      actionType,
      isActive: isActive !== undefined ? isActive : true,
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

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.approvalPolicy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

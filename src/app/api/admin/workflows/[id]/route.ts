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
  const { name, type, conditions, steps, isActive } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (conditions !== undefined) updateData.conditions = conditions;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Update workflow
  const workflow = await prisma.approvalWorkflow.update({
    where: { id },
    data: updateData,
    include: {
      steps: {
        include: { approver: true },
        orderBy: { stepOrder: 'asc' },
      },
      _count: {
        select: { expenses: true },
      },
    },
  });

  // Update steps if provided
  if (steps) {
    // Delete existing steps
    await prisma.workflowStep.deleteMany({
      where: { workflowId: id },
    });

    // Create new steps
    await prisma.workflowStep.createMany({
      data: steps.map((step: any, index: number) => ({
        workflowId: id,
        approverId: step.approverId,
        stepOrder: index,
        isRequired: true,
      })),
    });

    // Refetch with updated steps
    const updatedWorkflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: { approver: true },
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    return NextResponse.json({ workflow: updatedWorkflow });
  }

  return NextResponse.json({ workflow });
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

  // Check if workflow is in use
  const expenseCount = await prisma.expense.count({
    where: { workflowId: id, status: 'PENDING' },
  });

  if (expenseCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete workflow with pending expenses' },
      { status: 400 }
    );
  }

  await prisma.approvalWorkflow.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

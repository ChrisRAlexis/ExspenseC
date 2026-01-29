import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only approvers and admins can approve
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Not authorized to approve' }, { status: 403 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Can't approve own expenses
  if (expense.userId === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot approve your own expense' },
      { status: 400 }
    );
  }

  if (expense.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Expense is not pending approval' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action, comments } = body;

  if (!['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Require comments for rejection and changes requested
  if ((action === 'REJECTED' || action === 'CHANGES_REQUESTED') && !comments?.trim()) {
    return NextResponse.json(
      { error: 'Comments are required for rejection or changes requested' },
      { status: 400 }
    );
  }

  // Record the approval action
  await prisma.approvalAction.create({
    data: {
      expenseId: id,
      approverId: session.user.id,
      action,
      comments: comments || null,
      stepNumber: expense.currentStep,
    },
  });

  // Determine new status
  let newStatus = expense.status;
  let newStep = expense.currentStep;

  if (action === 'REJECTED') {
    newStatus = 'REJECTED';
  } else if (action === 'CHANGES_REQUESTED') {
    newStatus = 'CHANGES_REQUESTED';
  } else if (action === 'APPROVED') {
    // Check if there are more approval steps
    if (expense.workflow) {
      const totalSteps = expense.workflow.steps.length;
      const nextStep = expense.currentStep + 1;

      if (expense.workflow.type === 'SEQUENTIAL') {
        if (nextStep >= totalSteps) {
          newStatus = 'APPROVED';
        } else {
          newStep = nextStep;
        }
      } else {
        // Parallel workflow - check if all approvers have approved
        const approvalCount = await prisma.approvalAction.count({
          where: {
            expenseId: id,
            action: 'APPROVED',
          },
        });

        if (approvalCount >= totalSteps) {
          newStatus = 'APPROVED';
        }
      }
    } else {
      // No workflow - single approval
      newStatus = 'APPROVED';
    }
  }

  // Update expense
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      status: newStatus,
      currentStep: newStep,
      approvedAt: newStatus === 'APPROVED' ? new Date() : null,
    },
  });

  return NextResponse.json({ expense: updated });
}

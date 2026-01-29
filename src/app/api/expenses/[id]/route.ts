import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rm } from 'fs/promises';
import { join } from 'path';

export async function GET(
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
    include: {
      items: true,
      receipts: true,
      approvalActions: {
        include: { approver: true },
        orderBy: { createdAt: 'desc' },
      },
      user: true,
    },
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Check permissions
  if (expense.userId !== session.user.id && session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ expense });
}

export async function DELETE(
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
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Only owner can delete, and only if draft
  if (expense.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (expense.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Cannot delete submitted expenses' },
      { status: 400 }
    );
  }

  // Delete uploads
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', id);
    await rm(uploadDir, { recursive: true, force: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }

  // Delete expense (cascade deletes items, receipts, actions)
  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(
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

  const isAdmin = session.user.role === 'ADMIN';
  const isOwner = expense.userId === session.user.id;

  // Admin can edit any expense, owner can only edit draft/changes_requested
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isAdmin && expense.status !== 'DRAFT' && expense.status !== 'CHANGES_REQUESTED') {
    return NextResponse.json(
      { error: 'Cannot edit submitted expenses' },
      { status: 400 }
    );
  }

  const body = await request.json();

  // Build update data
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.tripName !== undefined) updateData.tripName = body.tripName;
  if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount;
  if (body.propertyId !== undefined) updateData.propertyId = body.propertyId || null;
  if (body.jobId !== undefined) updateData.jobId = body.jobId || null;
  if (body.taskId !== undefined) updateData.taskId = body.taskId || null;

  // Handle line items update (admin only)
  if (isAdmin && body.items !== undefined) {
    // Delete existing items and create new ones
    await prisma.expenseItem.deleteMany({ where: { expenseId: id } });

    if (body.items.length > 0) {
      await prisma.expenseItem.createMany({
        data: body.items.map((item: any) => ({
          expenseId: id,
          description: item.description,
          amount: item.amount,
          category: item.category || expense.category,
        })),
      });

      // Recalculate total
      updateData.totalAmount = body.items.reduce((sum: number, item: any) => sum + item.amount, 0);
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      receipts: true,
    },
  });

  return NextResponse.json({ expense: updated });
}

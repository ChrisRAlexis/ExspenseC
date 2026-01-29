import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { expenseIds, paymentMethod, referenceNumber, notes } = body;

  if (!expenseIds?.length || !paymentMethod) {
    return NextResponse.json({ error: 'expenseIds and paymentMethod are required' }, { status: 400 });
  }

  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, status: 'APPROVED' },
  });

  if (expenses.length === 0) {
    return NextResponse.json({ error: 'No approved expenses found' }, { status: 400 });
  }

  const operations = expenses.flatMap((expense) => [
    prisma.payout.create({
      data: {
        expenseId: expense.id,
        amount: expense.totalAmount,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        paidById: session.user.id,
      },
    }),
    prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'PAID', paidAt: new Date() },
    }),
  ]);

  await prisma.$transaction(operations);

  return NextResponse.json({ success: true, count: expenses.length });
}

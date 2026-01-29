import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const payouts = await prisma.payout.findMany({
    include: {
      expense: {
        include: { user: true, property: true },
      },
      paidBy: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(payouts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { expenseId, paymentMethod, referenceNumber, notes } = body;

  if (!expenseId || !paymentMethod) {
    return NextResponse.json({ error: 'expenseId and paymentMethod are required' }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Expense must be approved before payout' }, { status: 400 });
  }

  const [payout] = await prisma.$transaction([
    prisma.payout.create({
      data: {
        expenseId,
        amount: expense.totalAmount,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        paidById: session.user.id,
      },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'PAID', paidAt: new Date() },
    }),
  ]);

  return NextResponse.json(payout);
}

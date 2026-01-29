import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflows = await prisma.approvalWorkflow.findMany({
    include: {
      steps: {
        include: { approver: true },
        orderBy: { stepOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, conditions, steps } = body;

  if (!name || !type || !steps || steps.length === 0) {
    return NextResponse.json(
      { error: 'Name, type, and at least one approver are required' },
      { status: 400 }
    );
  }

  const workflow = await prisma.approvalWorkflow.create({
    data: {
      name,
      type,
      conditions,
      steps: {
        create: steps.map((step: any, index: number) => ({
          approverId: step.approverId,
          stepOrder: index,
          isRequired: true,
        })),
      },
    },
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

  return NextResponse.json({ workflow });
}

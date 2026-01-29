import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const alerts = await prisma.budgetAlert.findMany({
    where: { isActive: true },
    include: { property: true, job: true, task: true },
  });

  return NextResponse.json(alerts);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  const alert = await prisma.budgetAlert.update({
    where: { id },
    data,
  });

  return NextResponse.json(alert);
}

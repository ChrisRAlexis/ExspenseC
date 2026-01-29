import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const properties = await prisma.property.findMany({
    include: {
      jobs: {
        include: { tasks: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { expenses: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, clientName, budget, status } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const property = await prisma.property.create({
    data: {
      name,
      address: address || null,
      clientName: clientName || null,
      budget: budget || 0,
      status: status || 'ACTIVE',
    },
  });

  return NextResponse.json(property);
}

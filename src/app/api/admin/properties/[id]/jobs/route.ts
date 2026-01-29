import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const jobs = await prisma.job.findMany({
    where: { propertyId: id },
    include: { tasks: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, description, budget, status } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      propertyId: id,
      name,
      description: description || null,
      budget: budget || 0,
      status: status || 'ACTIVE',
    },
  });

  return NextResponse.json(job);
}

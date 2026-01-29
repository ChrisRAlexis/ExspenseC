import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const rules = await prisma.autoApprovalRule.findMany({
    include: { category: true, property: true, job: true },
    orderBy: { priority: 'desc' },
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, maxAmount, categoryId, propertyId, jobId, userRole, priority, isActive } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const rule = await prisma.autoApprovalRule.create({
    data: {
      name,
      maxAmount: maxAmount ?? null,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      jobId: jobId || null,
      userRole: userRole || null,
      priority: priority || 0,
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json(rule);
}

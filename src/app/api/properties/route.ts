import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const properties = await prisma.property.findMany({
    where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
    include: {
      jobs: {
        where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
        include: {
          tasks: {
            where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(properties);
}

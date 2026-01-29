import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBudgetSummary } from '@/lib/budget';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const summary = await getBudgetSummary();
  return NextResponse.json(summary);
}

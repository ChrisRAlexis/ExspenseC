import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: any = {};

  // Admins can see all expenses; others see only their own
  if (session.user.role !== 'ADMIN') {
    where.userId = session.user.id;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      receipts: true,
      items: true,
      user: true,
      property: true,
      job: true,
      task: true,
    },
  });

  // For the payouts page which expects a flat array
  if (status === 'APPROVED' && session.user.role === 'ADMIN') {
    return NextResponse.json(expenses);
  }

  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const propertyId = formData.get('propertyId') as string;
    const jobId = formData.get('jobId') as string;
    const taskId = formData.get('taskId') as string;
    const totalAmount = parseFloat(formData.get('totalAmount') as string) || 0;
    const itemsJson = formData.get('items') as string;
    const status = formData.get('status') as string || 'DRAFT';

    const items = itemsJson ? JSON.parse(itemsJson) : [];

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        category,
        propertyId: propertyId || null,
        jobId: jobId || null,
        taskId: taskId || null,
        totalAmount,
        status,
        submittedAt: status === 'PENDING' ? new Date() : null,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            amount: item.amount,
            category: item.category || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Handle receipt uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads', expense.id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const receiptPromises: Promise<any>[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('receipt_') && value instanceof File) {
        const file = value as File;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = `${Date.now()}-${file.name}`;
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        receiptPromises.push(
          prisma.receipt.create({
            data: {
              expenseId: expense.id,
              imagePath: `/uploads/${expense.id}/${filename}`,
            },
          })
        );
      }
    }

    await Promise.all(receiptPromises);

    // If submitting, find and assign appropriate workflow
    if (status === 'PENDING') {
      const workflow = await findMatchingWorkflow(expense, session.user.department);
      if (workflow) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { workflowId: workflow.id },
        });
      }
    }

    const fullExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        items: true,
        receipts: true,
      },
    });

    return NextResponse.json({ expense: fullExpense });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

async function findMatchingWorkflow(expense: any, userDepartment: string | null) {
  const workflows = await prisma.approvalWorkflow.findMany({
    where: { isActive: true },
    include: { steps: true },
  });

  for (const workflow of workflows) {
    if (!workflow.conditions) continue;

    const conditions = JSON.parse(workflow.conditions);

    // Check department
    if (conditions.departments?.length > 0) {
      if (!userDepartment || !conditions.departments.includes(userDepartment)) {
        continue;
      }
    }

    // Check amount range
    if (conditions.minAmount && expense.totalAmount < conditions.minAmount) continue;
    if (conditions.maxAmount && expense.totalAmount > conditions.maxAmount) continue;

    // Check category
    if (conditions.categories?.length > 0) {
      if (!conditions.categories.includes(expense.category)) continue;
    }

    return workflow;
  }

  return null;
}

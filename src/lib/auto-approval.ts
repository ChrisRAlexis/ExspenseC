import { prisma } from './prisma';

interface AutoApprovalCheck {
  amount: number;
  category: string;
  propertyId?: string | null;
  jobId?: string | null;
  userRole: string;
}

export async function checkAutoApproval(expense: AutoApprovalCheck): Promise<boolean> {
  const rules = await prisma.autoApprovalRule.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { priority: 'desc' },
  });

  for (const rule of rules) {
    let matches = true;

    // Check amount threshold
    if (rule.maxAmount !== null && expense.amount > rule.maxAmount) {
      matches = false;
    }

    // Check category
    if (rule.categoryId !== null && rule.category) {
      if (expense.category !== rule.category.name) {
        matches = false;
      }
    }

    // Check property
    if (rule.propertyId !== null && expense.propertyId !== rule.propertyId) {
      matches = false;
    }

    // Check job
    if (rule.jobId !== null && expense.jobId !== rule.jobId) {
      matches = false;
    }

    // Check user role
    if (rule.userRole !== null && expense.userRole !== rule.userRole) {
      matches = false;
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

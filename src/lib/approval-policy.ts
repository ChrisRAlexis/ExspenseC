import { prisma } from './prisma';

interface PolicyCheckInput {
  amount: number;
  category: string;
  propertyId?: string | null;
  jobId?: string | null;
  userRole: string;
}

interface PolicyCheckResult {
  matched: boolean;
  policy: any | null;
  action: 'AUTO_APPROVE' | 'ROUTE_TO_APPROVERS' | 'NO_MATCH';
}

export async function findMatchingPolicy(expense: PolicyCheckInput): Promise<PolicyCheckResult> {
  const policies = await prisma.approvalPolicy.findMany({
    where: { isActive: true },
    include: {
      category: true,
      steps: {
        include: { approver: true },
        orderBy: { stepOrder: 'asc' },
      },
    },
    orderBy: { priority: 'desc' },
  });

  for (const policy of policies) {
    if (matchesConditions(policy, expense)) {
      return {
        matched: true,
        policy,
        action: policy.actionType as 'AUTO_APPROVE' | 'ROUTE_TO_APPROVERS',
      };
    }
  }

  return { matched: false, policy: null, action: 'NO_MATCH' };
}

function matchesConditions(policy: any, expense: PolicyCheckInput): boolean {
  if (policy.maxAmount !== null && expense.amount > policy.maxAmount) return false;
  if (policy.minAmount !== null && expense.amount < policy.minAmount) return false;
  if (policy.categoryId !== null && policy.category && expense.category !== policy.category.name) return false;
  if (policy.propertyId !== null && expense.propertyId !== policy.propertyId) return false;
  if (policy.jobId !== null && expense.jobId !== policy.jobId) return false;
  if (policy.userRole !== null && expense.userRole !== policy.userRole) return false;
  return true;
}

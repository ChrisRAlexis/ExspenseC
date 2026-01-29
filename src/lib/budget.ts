import { prisma } from './prisma';

interface BudgetLevel {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  withinBudget: boolean;
}

interface BudgetCheckResult {
  property?: BudgetLevel | null;
  job?: BudgetLevel | null;
  task?: BudgetLevel | null;
  overallWithinBudget: boolean;
}

async function getSpentAmount(where: Record<string, any>): Promise<number> {
  const result = await prisma.expense.aggregate({
    where: {
      ...where,
      status: { in: ['PENDING', 'APPROVED', 'PAID'] },
    },
    _sum: { totalAmount: true },
  });
  return result._sum.totalAmount || 0;
}

export async function checkBudget(
  propertyId?: string | null,
  jobId?: string | null,
  taskId?: string | null,
  additionalAmount: number = 0
): Promise<BudgetCheckResult> {
  const result: BudgetCheckResult = {
    property: null,
    job: null,
    task: null,
    overallWithinBudget: true,
  };

  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (property && property.budget > 0) {
      const spent = await getSpentAmount({ propertyId });
      const totalSpent = spent + additionalAmount;
      result.property = {
        name: property.name,
        budget: property.budget,
        spent: totalSpent,
        remaining: property.budget - totalSpent,
        percentUsed: (totalSpent / property.budget) * 100,
        withinBudget: totalSpent <= property.budget,
      };
      if (!result.property.withinBudget) result.overallWithinBudget = false;
    }
  }

  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job && job.budget > 0) {
      const spent = await getSpentAmount({ jobId });
      const totalSpent = spent + additionalAmount;
      result.job = {
        name: job.name,
        budget: job.budget,
        spent: totalSpent,
        remaining: job.budget - totalSpent,
        percentUsed: (totalSpent / job.budget) * 100,
        withinBudget: totalSpent <= job.budget,
      };
      if (!result.job.withinBudget) result.overallWithinBudget = false;
    }
  }

  if (taskId) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task && task.budget > 0) {
      const spent = await getSpentAmount({ taskId });
      const totalSpent = spent + additionalAmount;
      result.task = {
        name: task.name,
        budget: task.budget,
        spent: totalSpent,
        remaining: task.budget - totalSpent,
        percentUsed: (totalSpent / task.budget) * 100,
        withinBudget: totalSpent <= task.budget,
      };
      if (!result.task.withinBudget) result.overallWithinBudget = false;
    }
  }

  return result;
}

export async function getBudgetSummary() {
  const properties = await prisma.property.findMany({
    where: { status: 'ACTIVE' },
    include: {
      jobs: {
        include: {
          tasks: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const summaries = await Promise.all(
    properties.map(async (property) => {
      const propertySpent = await getSpentAmount({ propertyId: property.id });

      const jobSummaries = await Promise.all(
        property.jobs.map(async (job) => {
          const jobSpent = await getSpentAmount({ jobId: job.id });

          const taskSummaries = await Promise.all(
            job.tasks.map(async (task) => {
              const taskSpent = await getSpentAmount({ taskId: task.id });
              return {
                ...task,
                spent: taskSpent,
                remaining: task.budget - taskSpent,
                percentUsed: task.budget > 0 ? (taskSpent / task.budget) * 100 : 0,
              };
            })
          );

          return {
            ...job,
            spent: jobSpent,
            remaining: job.budget - jobSpent,
            percentUsed: job.budget > 0 ? (jobSpent / job.budget) * 100 : 0,
            tasks: taskSummaries,
          };
        })
      );

      return {
        ...property,
        spent: propertySpent,
        remaining: property.budget - propertySpent,
        percentUsed: property.budget > 0 ? (propertySpent / property.budget) * 100 : 0,
        jobs: jobSummaries,
      };
    })
  );

  const totalBudget = summaries.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = summaries.reduce((sum, p) => sum + p.spent, 0);

  return {
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    percentUsed: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    properties: summaries,
  };
}

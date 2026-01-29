export type UserRole = 'EMPLOYEE' | 'APPROVER' | 'ADMIN';

export type ExpenseStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export type ExpenseCategory = 'TRAVEL' | 'MEALS' | 'LODGING' | 'TRANSPORTATION' | 'OTHER';

export type WorkflowType = 'SEQUENTIAL' | 'PARALLEL';

export type ApprovalActionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface OCRResult {
  vendorName?: string;
  date?: string;
  totalAmount?: number;
  subtotal?: number;
  tax?: number;
  items?: Array<{
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
  }>;
  rawText: string;
  confidence: number;
}

export interface WorkflowConditions {
  departments?: string[];
  minAmount?: number;
  maxAmount?: number;
  categories?: ExpenseCategory[];
}

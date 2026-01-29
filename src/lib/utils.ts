import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'badge-draft',
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CHANGES_REQUESTED: 'badge-changes',
    PAID: 'badge-paid',
  };
  return colors[status] || 'badge-draft';
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    TRAVEL: 'plane',
    MEALS: 'utensils',
    LODGING: 'bed',
    TRANSPORTATION: 'car',
    OTHER: 'receipt',
  };
  return icons[category] || 'receipt';
}

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'draft' | 'pending' | 'approved' | 'rejected' | 'changes' | 'paid';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-100 text-slate-700',
      draft: 'bg-slate-100 text-slate-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      changes: 'bg-orange-100 text-orange-700',
      paid: 'bg-blue-100 text-blue-700',
    };

    return (
      <span
        ref={ref}
        className={cn('badge', variants[variant], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-white/40 backdrop-blur-xl px-4 py-3 text-sm',
              'border-white/50 placeholder:text-slate-400',
              'focus:bg-white/60 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10',
              'disabled:bg-white/20 disabled:text-slate-400 disabled:cursor-not-allowed',
              'transition-all duration-300 touch-target',
              icon && 'pl-11',
              error && 'border-red-300 focus:border-red-400 focus:ring-red-500/10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

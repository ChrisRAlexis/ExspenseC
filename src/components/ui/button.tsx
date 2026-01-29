'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-semibold rounded-xl
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
      touch-target
    `;

    const variants = {
      primary: `
        bg-emerald-700 text-white
        hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-500/25
        focus:ring-emerald-500
      `,
      secondary: `
        bg-white/40 backdrop-blur-xl text-slate-700 border border-white/50
        hover:bg-white/60 hover:text-slate-900
        focus:ring-emerald-500
      `,
      outline: `
        border-2 border-white/50 text-slate-700 bg-white/40 backdrop-blur-xl
        hover:bg-white/60 hover:border-white/60
        focus:ring-emerald-500
      `,
      ghost: `
        text-slate-600
        hover:bg-white/50 hover:text-slate-900
        focus:ring-emerald-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25
        focus:ring-red-500
      `,
    };

    const sizes = {
      sm: 'text-sm px-3.5 py-2',
      md: 'text-sm px-5 py-2.5',
      lg: 'text-base px-6 py-3',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

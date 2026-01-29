'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, ChevronDown, Shield, DollarSign, Tag, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setAdminOpen(false);
  }, [pathname]);

  if (!session) return null;

  const isAdmin = session.user.role === 'ADMIN';
  const isApprover = session.user.role === 'APPROVER' || isAdmin;

  const leftItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/expenses', label: 'Expenses' },
    ...(isApprover ? [{ href: '/approvals', label: 'Approvals' }] : []),
  ];

  const rightItems = [
    ...(isApprover ? [{ href: '/reports', label: 'Reports' }] : []),
    ...(isApprover ? [{ href: '/admin/properties', label: 'Properties' }] : []),
  ];

  const adminItems = [
    { href: '/admin/payouts', label: 'Payouts', icon: DollarSign },
    { href: '/admin/categories', label: 'Categories', icon: Tag },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/policies', label: 'Policies', icon: Shield },
  ];

  const isAdminActive = adminItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  const renderNavLink = (item: { href: string; label: string }) => {
    const isActive = pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
          isActive
            ? 'bg-white/60 text-emerald-700/90 shadow-sm'
            : 'text-slate-500/90 hover:bg-white/40 hover:text-emerald-700/80'
        )}
      >
        {item.label}
      </Link>
    );
  };

  const isNewExpenseActive = pathname === '/expenses/new';

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-1">
        {leftItems.map(renderNavLink)}
      </div>

      <Link
        href="/expenses/new"
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ring-2 ring-emerald-500/60',
          isNewExpenseActive
            ? 'bg-white/60 text-emerald-700/90 shadow-sm'
            : 'text-emerald-600/90 hover:bg-emerald-50/40 hover:text-emerald-700'
        )}
      >
        <Plus className="h-4 w-4" />
        <span>New Expense</span>
      </Link>

      <div className="flex items-center gap-1">
        {rightItems.map(renderNavLink)}

        {isAdmin && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
                isAdminActive
                  ? 'bg-white/60 text-emerald-700/90 shadow-sm'
                  : 'text-slate-500/90 hover:bg-white/40 hover:text-emerald-700/80'
              )}
            >
              Admin
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', adminOpen && 'rotate-180')} />
            </button>

            {adminOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-xl border border-white/60 shadow-lg overflow-hidden z-50">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                        isActive
                          ? 'bg-emerald-50/80 text-emerald-700 font-medium'
                          : 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-700'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

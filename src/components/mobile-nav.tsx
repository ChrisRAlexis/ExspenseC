'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Home,
  Receipt,
  CheckCircle,
  BarChart3,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isApprover = session.user.role === 'APPROVER' || session.user.role === 'ADMIN';

  // Nav items with Add button in the middle
  const navItems = isApprover
    ? [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/expenses', label: 'Expenses', icon: Receipt },
        { href: '/expenses/new', label: 'Add', icon: Plus, isCenter: true },
        { href: '/approvals', label: 'Approvals', icon: CheckCircle },
        { href: '/reports', label: 'Reports', icon: BarChart3 },
      ]
    : [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/expenses/new', label: 'Add', icon: Plus, isCenter: true },
        { href: '/expenses', label: 'Expenses', icon: Receipt },
      ];

  return (
    <nav className="bottom-nav md:hidden animate-slide-up">
      <div className="flex items-center justify-evenly">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center -mt-8"
              >
                <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300">
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('bottom-nav-item transition-all duration-200 hover:scale-110 active:scale-95', isActive && 'active')}
            >
              <Icon className={cn('h-5 w-5 transition-colors duration-200', isActive && 'text-emerald-600')} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

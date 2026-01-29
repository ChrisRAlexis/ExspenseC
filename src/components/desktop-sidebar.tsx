'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Receipt,
  CheckCircle,
  Settings,
  Users,
  GitBranch,
  LogOut,
  Plus,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/expenses', label: 'My Expenses', icon: Receipt },
  { href: '/approvals', label: 'Approvals', icon: CheckCircle },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const adminNavItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workflows', label: 'Workflows', icon: GitBranch },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === 'ADMIN';
  const isApprover = session.user.role === 'APPROVER' || isAdmin;

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white/70 backdrop-blur-xl border-r border-slate-200/60 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ExpenseTrack</h1>
            <p className="text-xs text-slate-500">Travel & Expense</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="p-4">
        <Link
          href="/expenses/new"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 font-semibold"
        >
          <Plus className="h-5 w-5" />
          <span>New Expense</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            // Hide Reports from employees
            if (item.href === '/reports' && !isApprover) return null;

            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-indigo-600')} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-8">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Administration
            </p>
            <div className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-indigo-600')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User & Settings */}
      <div className="p-4 border-t border-slate-200/60">
        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
            <span className="text-white font-semibold">
              {session.user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{session.user.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => signOut()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

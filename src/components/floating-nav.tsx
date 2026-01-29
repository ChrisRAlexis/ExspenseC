'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Receipt,
  CheckCircle,
  BarChart3,
  Plus,
  Users,
  GitBranch,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === 'ADMIN';
  const isApprover = session.user.role === 'APPROVER' || isAdmin;

  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    ...(isApprover ? [{ href: '/approvals', label: 'Approvals', icon: CheckCircle }] : []),
    ...(isApprover ? [{ href: '/reports', label: 'Reports', icon: BarChart3 }] : []),
  ];

  const adminNavItems = isAdmin ? [
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/workflows', label: 'Workflows', icon: GitBranch },
  ] : [];

  return (
    <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-2">
      {/* Main Nav */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-2 shadow-lg shadow-slate-200/50 border border-white/60">
        <div className="flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                )}
              >
                <Icon className="h-5 w-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Quick Add Button */}
        <div className="mt-2 pt-2 border-t border-slate-200/60">
          <Link
            href="/expenses/new"
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Admin Nav */}
      {adminNavItems.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-2 shadow-lg shadow-slate-200/50 border border-white/60">
          <div className="flex flex-col gap-1">
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* User Actions */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-2 shadow-lg shadow-slate-200/50 border border-white/60">
        <div className="flex flex-col gap-1">
          <Link
            href="/settings"
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
          >
            <Settings className="h-5 w-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
              Settings
            </span>
          </Link>
          <button
            onClick={() => signOut()}
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* User Avatar */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-2 shadow-lg shadow-slate-200/50 border border-white/60">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
          <span className="text-white font-semibold text-lg">
            {session.user.name?.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

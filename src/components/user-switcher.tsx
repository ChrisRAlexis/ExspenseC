'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { User, Shield, Briefcase, Users, HardHat, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const testUsers = [
  { email: 'tony.russo@ledgra.com', name: 'Tony Russo', role: 'ADMIN', dept: 'Owner', icon: Shield },
  { email: 'maria.santos@ledgra.com', name: 'Maria Santos', role: 'ADMIN', dept: 'Office Manager', icon: Briefcase },
  { email: 'mike.chen@ledgra.com', name: 'Mike Chen', role: 'APPROVER', dept: 'Project Manager', icon: Users },
  { email: 'sarah.johnson@ledgra.com', name: 'Sarah Johnson', role: 'APPROVER', dept: 'Project Manager', icon: Users },
  { email: 'james.miller@ledgra.com', name: 'James Miller', role: 'EMPLOYEE', dept: 'Foreman', icon: HardHat },
  { email: 'dave.wilson@ledgra.com', name: 'Dave Wilson', role: 'EMPLOYEE', dept: 'Electrician', icon: Wrench },
  { email: 'tom.baker@ledgra.com', name: 'Tom Baker', role: 'EMPLOYEE', dept: 'Carpenter', icon: User },
];

export function UserSwitcher() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function switchUser(email: string) {
    setLoading(email);
    setIsOpen(false);
    try {
      await signIn('credentials', {
        email,
        password: 'password123',
        redirect: true,
        callbackUrl: '/dashboard',
      });
    } catch (error) {
      console.error('Switch failed:', error);
      setLoading(null);
    }
  }

  const currentUser = testUsers.find((u) => u.email === session?.user?.email);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
        title="Switch User (Dev)"
      >
        <Users className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden z-50 animate-fade-in">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Quick Switch (Demo Mode)
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {testUsers.map((user) => {
                const Icon = user.icon;
                const isCurrent = user.email === session?.user?.email;
                const isLoading = loading === user.email;

                return (
                  <button
                    key={user.email}
                    onClick={() => !isCurrent && switchUser(user.email)}
                    disabled={isCurrent || !!loading}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isCurrent
                        ? 'bg-emerald-50'
                        : 'hover:bg-slate-50',
                      loading && 'opacity-50'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-600'
                        : user.role === 'APPROVER'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{user.name}</p>
                        {isCurrent && (
                          <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{user.dept} • {user.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

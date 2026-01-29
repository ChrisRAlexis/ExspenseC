'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportsClient } from './reports-client';
import { BudgetOverview } from '../budget/budget-overview';

interface Props {
  activeTab: string;
  expenses: any[];
  users: any[];
}

export function ReportsPageTabs({ activeTab: initialTab, expenses, users }: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  function switchTab(tab: string) {
    setActiveTab(tab);
    router.replace(`/reports?tab=${tab}`, { scroll: false });
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'budget', label: 'Budget', icon: DollarSign },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-1 p-1 bg-white/30 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/60 text-emerald-700/90 shadow-sm'
                  : 'text-slate-500/90 hover:bg-white/40 hover:text-emerald-700/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'analytics' && <ReportsClient expenses={expenses} users={users} embedded />}
      {activeTab === 'budget' && <BudgetOverview embedded />}
    </div>
  );
}

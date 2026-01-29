'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Plane,
  Utensils,
  Bed,
  Car,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  category: string;
  status: string;
  tripName: string | null;
  createdAt: string;
  receipts: Array<{ id: string }>;
}

const categoryIcons: Record<string, any> = {
  TRAVEL: Plane,
  MEALS: Utensils,
  LODGING: Bed,
  TRANSPORTATION: Car,
  OTHER: Receipt,
};

const statusVariants: Record<string, any> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes',
};

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchExpenses();
  }, [statusFilter]);

  async function fetchExpenses() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = expenses.filter((expense) =>
    expense.title.toLowerCase().includes(search.toLowerCase()) ||
    expense.tripName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">My Expenses</h1>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white/60 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-white/60 rounded-lg w-1/3 mb-2" />
                  <div className="h-3 bg-white/60 rounded-lg w-1/4" />
                </div>
                <div className="h-6 bg-white/60 rounded-lg w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/50">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600/90 font-medium">
              {search ? 'No expenses match your search' : 'No expenses yet'}
            </p>
            <p className="text-slate-400/80 text-sm mt-1">Create your first expense to get started</p>
            <Link href="/expenses/new">
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Expense
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const Icon = categoryIcons[expense.category] || Receipt;
            return (
              <Card
                key={expense.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/expenses/${expense.id}`)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-100/50 rounded-xl shrink-0">
                    <Icon className="h-5 w-5 text-emerald-600/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-700/90 truncate">{expense.title}</p>
                      {expense.receipts.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {expense.receipts.length} receipt{expense.receipts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400/80">
                      <span>{formatDate(expense.createdAt)}</span>
                      {expense.tripName && (
                        <>
                          <span>·</span>
                          <span className="truncate">{expense.tripName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-600/90">{formatCurrency(expense.totalAmount)}</p>
                    <Badge variant={statusVariants[expense.status] as any}>
                      {expense.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

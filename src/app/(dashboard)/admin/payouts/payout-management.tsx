'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, Check, CreditCard, Building2, Clock, CheckCircle2 } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  category: string;
  status: string;
  approvedAt: string;
  user: { name: string; email: string };
  property: { name: string } | null;
}

interface Payout {
  id: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  expense: Expense;
  paidBy: { name: string };
}

const PAYMENT_METHODS = [
  { value: 'CHECK', label: 'Check' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'OTHER', label: 'Other' },
];

export function PayoutManagement() {
  const [tab, setTab] = useState<'ready' | 'history'>('ready');
  const [readyExpenses, setReadyExpenses] = useState<Expense[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CHECK');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [expRes, payRes] = await Promise.all([
      fetch('/api/expenses?status=APPROVED'),
      fetch('/api/admin/payouts'),
    ]);
    const expenses = await expRes.json();
    const payoutData = await payRes.json();
    setReadyExpenses(Array.isArray(expenses) ? expenses : []);
    setPayouts(Array.isArray(payoutData) ? payoutData : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === readyExpenses.length) setSelected(new Set());
    else setSelected(new Set(readyExpenses.map((e) => e.id)));
  }

  async function processPayout() {
    setProcessing(true);
    const ids = Array.from(selected);

    if (ids.length === 1) {
      await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: ids[0],
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        }),
      });
    } else {
      await fetch('/api/admin/payouts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseIds: ids,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        }),
      });
    }

    setShowPaymentModal(false);
    setSelected(new Set());
    setPaymentMethod('CHECK');
    setReferenceNumber('');
    setNotes('');
    setProcessing(false);
    fetchData();
  }

  const totalSelected = readyExpenses
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Payouts</h1>
          <p className="text-sm text-slate-500 mt-1">Process payments for approved expenses</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/40 rounded-xl w-fit">
        <button
          onClick={() => setTab('ready')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'ready' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          Ready for Payout ({readyExpenses.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'history' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
          Payout History ({payouts.length})
        </button>
      </div>

      {tab === 'ready' && (
        <>
          {selected.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-sm font-medium text-emerald-700">
                {selected.size} selected — {formatCurrency(totalSelected)}
              </span>
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <DollarSign className="h-4 w-4 mr-1" />
                Process Payout
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Approved Expenses</CardTitle>
              {readyExpenses.length > 0 && (
                <button onClick={selectAll} className="text-sm text-emerald-600 hover:text-emerald-700">
                  {selected.size === readyExpenses.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : readyExpenses.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No approved expenses awaiting payout</div>
              ) : (
                <div className="space-y-2">
                  {readyExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      onClick={() => toggleSelect(expense.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected.has(expense.id) ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white/60 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(expense.id)}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 text-sm truncate">{expense.title}</p>
                        <p className="text-xs text-slate-400">
                          {expense.user.name} · {expense.category}
                          {expense.property && ` · ${expense.property.name}`}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-600">{formatCurrency(expense.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No payouts recorded yet</div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div key={payout.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white/60">
                    <div className="p-2 bg-blue-100/50 rounded-xl">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm">{payout.expense.title}</p>
                      <p className="text-xs text-slate-400">
                        {payout.expense.user.name} · {payout.paymentMethod.replace('_', ' ')}
                        {payout.referenceNumber && ` · Ref: ${payout.referenceNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-600">{formatCurrency(payout.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDate(payout.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Process Payout</h3>
            <p className="text-sm text-slate-500">
              {selected.size} expense(s) — Total: {formatCurrency(totalSelected)}
            </p>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">Payment Method *</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">Reference Number</label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Check #, transaction ID, etc."
                className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-20 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={processPayout} loading={processing}>
                <Check className="h-4 w-4 mr-1" />
                Confirm Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

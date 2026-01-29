'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tag, Calendar, User, Clock, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category?: string;
}

interface EditableExpenseProps {
  expense: any;
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'LODGING', label: 'Lodging' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'OTHER', label: 'Other' },
];

export function EditableExpenseDetails({ expense, isAdmin }: EditableExpenseProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(isAdmin);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(expense.category);

  async function handleSaveCategory() {
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Details</CardTitle>
        {isAdmin && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/50 rounded-xl">
              <Tag className="h-4 w-4 text-emerald-600/80" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400/80">Category</p>
              {isEditing ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full text-sm py-1 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : (
                <p className="font-medium text-slate-600/90">{expense.category}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/50 rounded-xl">
              <Calendar className="h-4 w-4 text-emerald-600/80" />
            </div>
            <div>
              <p className="text-xs text-slate-400/80">Submitted</p>
              <p className="font-medium text-slate-600/90">
                {expense.submittedAt ? formatDate(expense.submittedAt) : 'Not submitted'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/50 rounded-xl">
              <User className="h-4 w-4 text-emerald-600/80" />
            </div>
            <div>
              <p className="text-xs text-slate-400/80">Submitted by</p>
              <p className="font-medium text-slate-600/90">{expense.user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/50 rounded-xl">
              <Clock className="h-4 w-4 text-emerald-600/80" />
            </div>
            <div>
              <p className="text-xs text-slate-400/80">Created</p>
              <p className="font-medium text-slate-600/90">{formatDate(expense.createdAt)}</p>
            </div>
          </div>
        </div>

        {expense.description && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Description</p>
            <p className="text-slate-700">{expense.description}</p>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setCategory(expense.category); }}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCategory} loading={loading}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EditableLineItems({ expense, isAdmin }: EditableExpenseProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(isAdmin);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>(expense.items);

  function addItem() {
    setItems([...items, { id: `new-${Date.now()}`, description: '', amount: 0 }]);
  }

  function updateItem(index: number, field: string, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            description: item.description,
            amount: item.amount,
          })),
        }),
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Line Items</CardTitle>
        {isAdmin && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 && !isEditing ? (
          <p className="text-slate-500 text-sm">No line items</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0"
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 text-sm py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-24 text-sm py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-right"
                    />
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-slate-700">{item.description}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </>
                )}
              </div>
            ))}

            {isEditing && (
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 py-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            )}

            <div className="flex justify-between items-center pt-2 font-semibold border-t border-slate-200">
              <span>Total</span>
              <span>{formatCurrency(isEditing ? total : expense.totalAmount)}</span>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setItems(expense.items); }}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={loading}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

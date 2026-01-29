'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Building2,
  Briefcase,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReceiptScanner } from '@/components/receipt-scanner';
import { formatCurrency } from '@/lib/utils';

// Convert various date formats to YYYY-MM-DD for HTML date input
function parseReceiptDate(dateStr: string): string {
  if (!dateStr) return '';

  let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    return `${year}-${month}-${day}`;
  }

  match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    return `${year}-${month}-${day}`;
  }

  const months: { [key: string]: string } = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  match = dateStr.match(/(\w{3})\w*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    const month = months[match[1].toLowerCase()];
    if (month) {
      const day = match[2].padStart(2, '0');
      return `${match[3]}-${month}-${day}`;
    }
  }

  return '';
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  quantity?: number;
  unitPrice?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Task {
  id: string;
  name: string;
  budget: number;
}

interface Job {
  id: string;
  name: string;
  budget: number;
  tasks: Task[];
}

interface Property {
  id: string;
  name: string;
  address: string | null;
  budget: number;
  jobs: Job[];
}

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Dynamic data
  const [categories, setCategories] = useState<Category[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    propertyId: '',
    jobId: '',
    taskId: '',
    date: '',
  });

  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [receipts, setReceipts] = useState<Array<{ file: File; preview: string }>>([]);
  const [budgetWarning, setBudgetWarning] = useState('');

  // Fetch categories and properties on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/properties').then((r) => r.json()),
    ]).then(([cats, props]) => {
      setCategories(cats);
      setProperties(props);
      if (cats.length > 0) {
        setFormData((prev) => ({ ...prev, category: cats[0].name }));
      }
    });
  }, []);

  // Cascading dropdown data
  const selectedProperty = properties.find((p) => p.id === formData.propertyId);
  const selectedJob = selectedProperty?.jobs.find((j) => j.id === formData.jobId);
  const jobs = selectedProperty?.jobs || [];
  const tasks = selectedJob?.tasks || [];

  // Budget check when property/job/task changes
  useEffect(() => {
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (!totalAmount) { setBudgetWarning(''); return; }

    let warning = '';
    if (selectedProperty && selectedProperty.budget > 0) {
      // Simple client-side check (server will also validate)
      if (totalAmount > selectedProperty.budget * 0.9) {
        warning = `This expense is near or exceeds the ${selectedProperty.name} budget (${formatCurrency(selectedProperty.budget)})`;
      }
    }
    if (selectedJob && selectedJob.budget > 0) {
      if (totalAmount > selectedJob.budget * 0.9) {
        warning = `This expense is near or exceeds the ${selectedJob.name} job budget (${formatCurrency(selectedJob.budget)})`;
      }
    }
    setBudgetWarning(warning);
  }, [formData.propertyId, formData.jobId, items, selectedProperty, selectedJob]);

  function updateField(field: string, value: string) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Reset cascading selects
      if (field === 'propertyId') { next.jobId = ''; next.taskId = ''; }
      if (field === 'jobId') { next.taskId = ''; }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', amount: 0, category: '', quantity: 1 },
    ]);
  }

  function updateItem(id: string, field: string, value: string | number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleOCRComplete(data: any) {
    const parsedDate = parseReceiptDate(data.date || '');
    setFormData((prev) => ({
      ...prev,
      title: prev.title || data.vendorName || '',
      category: data.category || prev.category,
      date: prev.date || parsedDate,
    }));

    if (data.items && data.items.length > 0) {
      const newItems = data.items.map((item: any) => ({
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        category: '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.amount,
      }));

      if (data.tax && data.tax > 0) {
        newItems.push({
          id: crypto.randomUUID(),
          description: 'Sales Tax',
          amount: data.tax,
          category: '',
          quantity: 1,
          unitPrice: data.tax,
        });
      }

      setItems((prev) => [...prev, ...newItems]);
    } else if (data.totalAmount) {
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          description: data.vendorName || 'Expense',
          amount: data.totalAmount,
          category: '',
        },
      ]);
    }

    setShowScanner(false);
  }

  function handleReceiptUpload(file: File, preview: string) {
    setReceipts((prev) => [...prev, { file, preview }]);
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  async function handleSubmit(e: React.FormEvent, action: 'draft' | 'submit') {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('propertyId', formData.propertyId);
      submitData.append('jobId', formData.jobId);
      submitData.append('taskId', formData.taskId);
      submitData.append('totalAmount', totalAmount.toString());
      submitData.append('items', JSON.stringify(items));
      submitData.append('status', action === 'submit' ? 'PENDING' : 'DRAFT');

      receipts.forEach((receipt, index) => {
        submitData.append(`receipt_${index}`, receipt.file);
      });

      const res = await fetch('/api/expenses', {
        method: 'POST',
        body: submitData,
      });

      if (!res.ok) throw new Error('Failed to create expense');

      const data = await res.json();
      router.push(`/expenses/${data.expense.id}`);
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/expenses"
          className="p-2 -ml-2 hover:bg-white/50 rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-emerald-800/80">New Expense</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')}>
        {/* Receipt Scanner */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {showScanner ? (
              <ReceiptScanner
                onComplete={handleOCRComplete}
                onCancel={() => setShowScanner(false)}
                onUpload={handleReceiptUpload}
              />
            ) : (
              <div className="space-y-4">
                {receipts.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {receipts.map((receipt, index) => (
                      <div key={index} className="relative shrink-0">
                        <img
                          src={receipt.preview}
                          alt={`Receipt ${index + 1}`}
                          className="w-24 h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => setReceipts((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Receipt
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g., Lumber for framing, Equipment rental"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                placeholder="Add any notes or details..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 min-h-[80px] transition-all duration-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Property > Job > Task */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Project Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  Property
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => updateField('propertyId', e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                  Job
                </label>
                <select
                  value={formData.jobId}
                  onChange={(e) => updateField('jobId', e.target.value)}
                  disabled={!formData.propertyId}
                  className="w-full px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                >
                  <option value="">Select job...</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <ListTodo className="h-3.5 w-3.5 text-violet-500" />
                  Task
                </label>
                <select
                  value={formData.taskId}
                  onChange={(e) => updateField('taskId', e.target.value)}
                  disabled={!formData.jobId}
                  className="w-full px-4 py-2.5 border border-white/50 rounded-xl bg-white/40 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                >
                  <option value="">Select task...</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {budgetWarning && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-700">{budgetWarning}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <p className="text-sm">No items added yet</p>
                <p className="text-xs mt-1">Scan a receipt or add items manually</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="w-14">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={item.amount || ''}
                        onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-white/50 flex justify-between items-center">
              <span className="font-medium text-slate-600/90">Total</span>
              <span className="text-xl font-semibold text-emerald-700/90">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="outline"
            className="flex-1"
            disabled={loading || !formData.title}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={loading || !formData.title || items.length === 0}
            onClick={(e) => handleSubmit(e as any, 'submit')}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Submit for Approval'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap, GitBranch, Plus, Edit, Trash2, Info,
  DollarSign, Tag, Building2, Users, Shield,
  ChevronRight, X,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Approver { id: string; name: string; email: string; department?: string | null }
interface Category { id: string; name: string; icon?: string | null }
interface Property { id: string; name: string; jobs: { id: string; name: string }[] }
interface PolicyStep { id: string; approverId: string | null; approver: Approver | null; stepOrder: number; isRequired: boolean }
interface Policy {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  actionType: string;
  maxAmount: number | null;
  minAmount: number | null;
  categoryId: string | null;
  category: Category | null;
  propertyId: string | null;
  property: { id: string; name: string } | null;
  jobId: string | null;
  job: { id: string; name: string } | null;
  userRole: string | null;
  routingType: string | null;
  steps: PolicyStep[];
  _count: { expenses: number };
}

interface Props {
  initialPolicies: Policy[];
  approvers: Approver[];
  categories: Category[];
  properties: Property[];
}

const emptyForm = {
  name: '',
  description: '',
  actionType: 'AUTO_APPROVE' as string,
  priority: 0,
  maxAmount: '',
  minAmount: '',
  categoryId: '',
  propertyId: '',
  jobId: '',
  userRole: '',
  routingType: 'SEQUENTIAL',
  steps: [] as { approverId: string; isRequired: boolean }[],
};

export function PolicyManagement({ initialPolicies, approvers, categories, properties }: Props) {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedProperty = properties.find(p => p.id === form.propertyId);
  const jobs = selectedProperty?.jobs || [];

  // Scroll to form when it opens
  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(policy: Policy) {
    setForm({
      name: policy.name,
      description: policy.description || '',
      actionType: policy.actionType,
      priority: policy.priority,
      maxAmount: policy.maxAmount?.toString() || '',
      minAmount: policy.minAmount?.toString() || '',
      categoryId: policy.categoryId || '',
      propertyId: policy.propertyId || '',
      jobId: policy.jobId || '',
      userRole: policy.userRole || '',
      routingType: policy.routingType || 'SEQUENTIAL',
      steps: policy.steps.map(s => ({ approverId: s.approverId || '', isRequired: s.isRequired })),
    });
    setEditingId(policy.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (form.actionType === 'ROUTE_TO_APPROVERS' && form.steps.length === 0) return;

    setLoading(true);
    try {
      const url = editingId ? `/api/admin/policies/${editingId}` : '/api/admin/policies';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (editingId) {
        setPolicies(prev => prev.map(p => p.id === editingId ? data : p));
      } else {
        setPolicies(prev => [data, ...prev]);
      }
      closeForm();
      router.refresh();
    } catch (e) {
      console.error('Failed to save policy:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/policies/${id}`, { method: 'DELETE' });
      setPolicies(prev => prev.filter(p => p.id !== id));
      setDeletingId(null);
      router.refresh();
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(policy: Policy) {
    try {
      const res = await fetch(`/api/admin/policies/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      const data = await res.json();
      setPolicies(prev => prev.map(p => p.id === policy.id ? data : p));
    } catch (e) {
      console.error('Failed to toggle:', e);
    }
  }

  function addStep() {
    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, { approverId: approvers[0]?.id || '', isRequired: true }],
    }));
  }

  function removeStep(index: number) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  }

  function updateStep(index: number, field: string, value: any) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  }

  const inputClass = 'w-full px-3 py-2.5 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all placeholder:text-slate-400';
  const selectClass = 'w-full px-3 py-2.5 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Approval Policies</h1>
          <p className="text-sm text-slate-500 mt-1">Define how expenses get approved</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/50 backdrop-blur-xl rounded-2xl border border-blue-100/60">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">How policies work</p>
          <p className="mt-1 text-blue-600/80">
            When an employee submits an expense, policies are checked in priority order (highest first).
            The first matching policy wins. A policy can <strong>auto-approve</strong> the expense or
            <strong> route it to specific approvers</strong> for review.
          </p>
        </div>
      </div>

      {/* Inline Form Panel */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-lg overflow-hidden animate-fade-in"
        >
          {/* Form Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100/60 text-emerald-600">
                {editingId ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? 'Edit Policy' : 'Create New Policy'}
              </h2>
            </div>
            <button
              onClick={closeForm}
              className="p-2 hover:bg-white/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Name + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Small Material Purchases"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">What should happen when this policy matches?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, actionType: 'AUTO_APPROVE' }))}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    form.actionType === 'AUTO_APPROVE'
                      ? 'border-amber-300 bg-amber-50/50 shadow-sm'
                      : 'border-white/60 bg-white/30 hover:border-white/80 hover:bg-white/40'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    form.actionType === 'AUTO_APPROVE' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-medium text-sm text-slate-800">Auto-Approve</span>
                    <p className="text-xs text-slate-500 mt-0.5">Automatically approved. No human review needed.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, actionType: 'ROUTE_TO_APPROVERS' }))}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    form.actionType === 'ROUTE_TO_APPROVERS'
                      ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                      : 'border-white/60 bg-white/30 hover:border-white/80 hover:bg-white/40'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    form.actionType === 'ROUTE_TO_APPROVERS' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-medium text-sm text-slate-800">Route to Approvers</span>
                    <p className="text-xs text-slate-500 mt-0.5">Sent to specific people for review.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conditions <span className="text-slate-400 font-normal">(all must match)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Amount</label>
                  <input
                    type="number"
                    value={form.maxAmount}
                    onChange={e => setForm(prev => ({ ...prev, maxAmount: e.target.value }))}
                    placeholder="No limit"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={form.minAmount}
                    onChange={e => setForm(prev => ({ ...prev, minAmount: e.target.value }))}
                    placeholder="No minimum"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={e => setForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Any category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Property</label>
                  <select
                    value={form.propertyId}
                    onChange={e => setForm(prev => ({ ...prev, propertyId: e.target.value, jobId: '' }))}
                    className={selectClass}
                  >
                    <option value="">Any property</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Job</label>
                  <select
                    value={form.jobId}
                    onChange={e => setForm(prev => ({ ...prev, jobId: e.target.value }))}
                    disabled={!form.propertyId}
                    className={cn(selectClass, !form.propertyId && 'opacity-50')}
                  >
                    <option value="">Any job</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">User Role</label>
                  <select
                    value={form.userRole}
                    onChange={e => setForm(prev => ({ ...prev, userRole: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Any role</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="APPROVER">Approver</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Approvers section (only for ROUTE_TO_APPROVERS) */}
            {form.actionType === 'ROUTE_TO_APPROVERS' && (
              <div className="bg-blue-50/40 backdrop-blur-sm rounded-xl border border-blue-100/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="h-4 w-4 text-blue-500" />
                  <label className="text-sm font-medium text-slate-700">Approval Routing</label>
                </div>
                <select
                  value={form.routingType}
                  onChange={e => setForm(prev => ({ ...prev, routingType: e.target.value }))}
                  className={cn(selectClass, 'mb-3')}
                >
                  <option value="SEQUENTIAL">Sequential (one after another in order)</option>
                  <option value="PARALLEL">Parallel (all at once)</option>
                </select>

                <label className="block text-xs text-slate-500 mb-2">Approvers *</label>
                <div className="space-y-2">
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5 text-center font-medium">{i + 1}.</span>
                      <select
                        value={step.approverId}
                        onChange={e => updateStep(i, 'approverId', e.target.value)}
                        className={cn(selectClass, 'flex-1')}
                      >
                        {approvers.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                        ))}
                      </select>
                      <button onClick={() => removeStep(i)} className="p-2 hover:bg-red-100/60 rounded-lg transition-colors">
                        <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Approver
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-white/40">
              <Button variant="outline" onClick={closeForm} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={loading}
                disabled={!form.name.trim() || (form.actionType === 'ROUTE_TO_APPROVERS' && form.steps.length === 0)}
                className="flex-1"
              >
                {editingId ? 'Save Changes' : 'Create Policy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Policy List */}
      {policies.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No policies yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => (
            <Card key={policy.id} className={cn(!policy.isActive && 'opacity-50')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'p-2 rounded-xl shrink-0 mt-0.5',
                      policy.actionType === 'AUTO_APPROVE'
                        ? 'bg-amber-100/60 text-amber-600'
                        : 'bg-blue-100/60 text-blue-600'
                    )}>
                      {policy.actionType === 'AUTO_APPROVE'
                        ? <Zap className="h-4 w-4" />
                        : <GitBranch className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-slate-800">{policy.name}</h3>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          policy.actionType === 'AUTO_APPROVE'
                            ? 'bg-amber-100/80 text-amber-700'
                            : 'bg-blue-100/80 text-blue-700'
                        )}>
                          {policy.actionType === 'AUTO_APPROVE' ? 'Auto-Approve' : 'Route to Approvers'}
                        </span>
                        <span className="text-xs text-slate-400">Priority: {policy.priority}</span>
                      </div>

                      {policy.description && (
                        <p className="text-sm text-slate-500 mt-1">{policy.description}</p>
                      )}

                      {/* Condition badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {policy.maxAmount && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100/80 text-slate-600">
                            <DollarSign className="h-3 w-3" />
                            {policy.minAmount ? `${formatCurrency(policy.minAmount)} – ${formatCurrency(policy.maxAmount)}` : `Up to ${formatCurrency(policy.maxAmount)}`}
                          </span>
                        )}
                        {!policy.maxAmount && policy.minAmount && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100/80 text-slate-600">
                            <DollarSign className="h-3 w-3" />
                            Over {formatCurrency(policy.minAmount)}
                          </span>
                        )}
                        {policy.category && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100/80 text-slate-600">
                            <Tag className="h-3 w-3" />
                            {policy.category.name}
                          </span>
                        )}
                        {policy.property && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100/80 text-slate-600">
                            <Building2 className="h-3 w-3" />
                            {policy.property.name}
                            {policy.job && <><ChevronRight className="h-3 w-3" />{policy.job.name}</>}
                          </span>
                        )}
                        {policy.userRole && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100/80 text-slate-600">
                            <Users className="h-3 w-3" />
                            {policy.userRole}
                          </span>
                        )}
                      </div>

                      {/* Approver chain */}
                      {policy.actionType === 'ROUTE_TO_APPROVERS' && policy.steps.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                          <span className="text-slate-400">{policy.routingType === 'PARALLEL' ? 'All at once:' : 'In order:'}</span>
                          {policy.steps.map((step, i) => (
                            <span key={step.id}>
                              {i > 0 && <span className="text-slate-300 mx-0.5">{policy.routingType === 'PARALLEL' ? '+' : '→'}</span>}
                              <span className="font-medium text-slate-600">{step.approver?.name || 'Manager'}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {policy._count.expenses > 0 && (
                        <p className="text-xs text-slate-400 mt-1">{policy._count.expenses} expense{policy._count.expenses !== 1 ? 's' : ''} matched</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(policy)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
                        policy.isActive
                          ? 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200/80'
                          : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/80'
                      )}
                    >
                      {policy.isActive ? 'Active' : 'Off'}
                    </button>
                    <button onClick={() => openEdit(policy)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit className="h-4 w-4 text-slate-400" />
                    </button>

                    {/* Inline delete confirmation */}
                    {deletingId === policy.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-red-100/60">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(policy.id)}
                          disabled={loading}
                          className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-100/80 hover:bg-red-200/80 transition-colors"
                        >
                          {loading ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(policy.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

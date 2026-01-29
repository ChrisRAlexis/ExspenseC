'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, Zap, Shield, DollarSign, Building2, Tag } from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  maxAmount: number | null;
  categoryId: string | null;
  propertyId: string | null;
  jobId: string | null;
  userRole: string | null;
  category: { name: string } | null;
  property: { name: string } | null;
  job: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
  jobs: { id: string; name: string }[];
}

export function AutoApprovalManagement() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [priority, setPriority] = useState('0');

  async function fetchData() {
    const [rulesRes, catsRes, propsRes] = await Promise.all([
      fetch('/api/admin/auto-approval'),
      fetch('/api/categories'),
      fetch('/api/properties'),
    ]);
    setRules(await rulesRes.json());
    setCategories(await catsRes.json());
    setProperties(await propsRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function resetForm() {
    setName('');
    setMaxAmount('');
    setCategoryId('');
    setPropertyId('');
    setJobId('');
    setUserRole('');
    setPriority('0');
    setEditing(null);
    setShowForm(false);
  }

  async function handleSave() {
    setSaving(true);
    const url = editing ? `/api/admin/auto-approval/${editing.id}` : '/api/admin/auto-approval';
    const method = editing ? 'PATCH' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        categoryId: categoryId || null,
        propertyId: propertyId || null,
        jobId: jobId || null,
        userRole: userRole || null,
        priority: parseInt(priority) || 0,
      }),
    });

    resetForm();
    setSaving(false);
    fetchData();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/admin/auto-approval/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    fetchData();
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/admin/auto-approval/${id}`, { method: 'DELETE' });
    fetchData();
  }

  function startEdit(rule: Rule) {
    setEditing(rule);
    setName(rule.name);
    setMaxAmount(rule.maxAmount?.toString() || '');
    setCategoryId(rule.categoryId || '');
    setPropertyId(rule.propertyId || '');
    setJobId(rule.jobId || '');
    setUserRole(rule.userRole || '');
    setPriority(rule.priority.toString());
    setShowForm(true);
  }

  const selectedProperty = properties.find((p) => p.id === propertyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Auto-Approval Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Configure automatic expense approval rules</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-700 mb-4">{editing ? 'Edit Rule' : 'New Auto-Approval Rule'}</h3>
            <p className="text-xs text-slate-400 mb-4">All conditions below use AND logic — an expense must match ALL non-empty conditions to be auto-approved.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Rule Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Small material purchases"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Max Amount</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Leave blank for any amount"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Any category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">User Role</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Any role</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="APPROVER">Approver</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Property</label>
                <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setJobId(''); }}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Any property</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Job</label>
                <select value={jobId} onChange={(e) => setJobId(e.target.value)}
                  disabled={!propertyId}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50">
                  <option value="">Any job</option>
                  {selectedProperty?.jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Priority (higher = checked first)</label>
                <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
                {editing ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No auto-approval rules yet</div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.isActive ? 'border-slate-200 bg-white/60' : 'border-slate-100 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100/50 rounded-xl">
                      <Zap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-700">{rule.name}</h3>
                        <span className="text-xs text-slate-400">Priority: {rule.priority}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.maxAmount !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                            <DollarSign className="h-3 w-3" /> Up to {formatCurrency(rule.maxAmount)}
                          </span>
                        )}
                        {rule.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                            <Tag className="h-3 w-3" /> {rule.category.name}
                          </span>
                        )}
                        {rule.property && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs">
                            <Building2 className="h-3 w-3" /> {rule.property.name}
                          </span>
                        )}
                        {rule.job && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
                            {rule.job.name}
                          </span>
                        )}
                        {rule.userRole && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            <Shield className="h-3 w-3" /> {rule.userRole}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(rule)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        rule.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => startEdit(rule)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, GripVertical, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleSave() {
    setSaving(true);
    const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories';
    const method = editing ? 'PATCH' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon: icon || null, sortOrder: categories.length }),
    });

    setShowForm(false);
    setEditing(null);
    setName('');
    setIcon('');
    setSaving(false);
    fetchCategories();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return;
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    fetchCategories();
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    fetchCategories();
  }

  function startEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon || '');
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800/80">Expense Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage expense categories for your organization</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); setName(''); setIcon(''); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-600 mb-1 block">Category Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Materials, Equipment Rental"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="w-32">
                <label className="text-sm font-medium text-slate-600 mb-1 block">Icon (emoji)</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🔨"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No categories yet. Add one to get started.</div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    cat.isActive
                      ? 'border-slate-200 bg-white/60'
                      : 'border-slate-100 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center text-lg">
                    {cat.icon || <Tag className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{cat.name}</p>
                    <p className="text-xs text-slate-400">{cat.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      cat.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
